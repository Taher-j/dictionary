/** @jest-environment node */
import { getTableColumns } from 'drizzle-orm';

import { createBackupService, SCHEMA_VERSION } from '@/data/backup';
import type { SnapshotTarget } from '@/data/db/client';
import * as schema from '@/data/db/schema';
import { createTestContext, type TestContext } from '@/data/testing/testDatabase';
import { BACKUP_COLUMNS, BACKUP_TABLES, type Backup } from '@/domain/backup/format';
import { parseBackup } from '@/domain/backup/parse';
import { CardState } from '@/domain/models';

const fs = jest.requireActual<typeof import('node:fs')>('node:fs');
const os = jest.requireActual<typeof import('node:os')>('node:os');
const path = jest.requireActual<typeof import('node:path')>('node:path');

const SQL_TABLES = [
  'dictionaries',
  'import_batches',
  'tags',
  'words',
  'word_tags',
  'sessions',
  'cards',
  'review_logs',
  'settings',
] as const;

/** Every row of every table, in a stable order, as SQLite stores it. */
function dump(ctx: TestContext) {
  const out: Record<string, unknown[]> = {};
  for (const table of SQL_TABLES) {
    out[table] = ctx.sqlite.prepare(`SELECT * FROM ${table} ORDER BY 1, 2`).all();
  }
  return out;
}

function snapshotTarget(dir: string): SnapshotTarget & { paths: string[] } {
  const paths: string[] = [];
  return {
    paths,
    newSnapshotPath(reason) {
      const file = path.join(dir, `snapshot-${paths.length}-${reason}.db`);
      paths.push(file);
      return file;
    },
    prune() {},
  };
}

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function backupService(ctx: TestContext) {
  const snapshots = snapshotTarget(dir);
  return { snapshots, service: createBackupService({ db: ctx.db, now: ctx.time, snapshots }) };
}

/** Data of every kind: deleted rows, tags, a session with logs, scheduled cards, settings. */
async function fill(ctx: TestContext) {
  const { repos } = ctx;
  const de = await repos.dictionaries.create({ name: 'German', termLang: 'de', meaningLang: 'en' });
  const gone = await repos.dictionaries.create({ name: 'Old' });
  await repos.words.create({ dictionaryId: gone.id, term: 'alt', translation: 'old' });
  await repos.dictionaries.softDelete(gone.id);

  const haus = await repos.words.create({
    dictionaryId: de.id,
    term: 'Haus',
    translation: 'house',
    definition: 'a building',
    example: 'Das Haus ist alt.',
    partOfSpeech: 'noun',
    forms: 'das, pl. Häuser',
    pronunciation: 'haʊs',
    notes: 'note "quoted"',
    source: 'book',
    starred: true,
  });
  const baum = await repos.words.create({ dictionaryId: de.id, term: 'Baum', translation: 'tree' });
  await repos.words.create({ dictionaryId: de.id, term: 'leer' });
  const trashed = await repos.words.create({
    dictionaryId: de.id,
    term: 'weg',
    translation: 'away',
  });
  await repos.words.softDelete([trashed.id]);

  const nouns = await repos.tags.getOrCreate('nouns');
  const dead = await repos.tags.getOrCreate('dead');
  await repos.tags.setWordTags(haus.id, [nouns.id]);
  await repos.tags.setWordTags(baum.id, [nouns.id]);
  await repos.tags.softDelete(dead.id);

  const session = await repos.reviews.startSession();
  const [card] = await repos.cards.listForWord(haus.id);
  if (!card) throw new Error('expected a card');
  ctx.tick(60_000);
  await repos.reviews.answer(
    { cardId: card.id, sessionId: session, rating: 3, durationMs: 4200 },
    (prev) => ({
      ...prev,
      state: CardState.Review,
      due: ctx.time() + 3 * 86_400_000,
      stability: 3.17,
      difficulty: 5.5,
      scheduledDays: 3,
      reps: 1,
      lastReview: ctx.time(),
    }),
  );
  await repos.reviews.endSession(session);
  const [baumCard] = await repos.cards.listForWord(baum.id);
  if (baumCard) await repos.cards.setSuspendedForWord(baum.id, true);

  await repos.settings.set('theme', 'dark');
  await repos.settings.set('dailyNewLimit', 15);
}

async function writeToString(ctx: TestContext) {
  const chunks: string[] = [];
  const rows = await backupService(ctx).service.write((chunk) => void chunks.push(chunk), {
    appVersion: '1.0.0',
    platform: 'test',
  });
  return { text: chunks.join(''), rows, chunks: chunks.length };
}

function parsed(text: string): Backup {
  const result = parseBackup(text);
  if (!result.ok) throw new Error(`backup did not parse: ${result.error}`);
  return result.backup;
}

describe('backup columns', () => {
  it('match the schema (every column except words.importBatchId)', () => {
    const tables = {
      dictionaries: schema.dictionaries,
      tags: schema.tags,
      words: schema.words,
      wordTags: schema.wordTags,
      sessions: schema.sessions,
      cards: schema.cards,
      reviewLogs: schema.reviewLogs,
      settings: schema.settings,
    };
    for (const table of BACKUP_TABLES) {
      const columns = Object.keys(getTableColumns(tables[table])).filter(
        (c) => !(table === 'words' && c === 'importBatchId'),
      );
      expect({ table, columns: columns.sort() }).toEqual({
        table,
        columns: Object.keys(BACKUP_COLUMNS[table]).sort(),
      });
    }
  });
});

describe('backup round trip', () => {
  it('serialize -> parse -> restore into an empty database gives the same rows', async () => {
    const source = createTestContext();
    await fill(source);
    const { text, rows } = await writeToString(source);

    const backup = parsed(text);
    expect(backup).toMatchObject({ formatVersion: 1, schemaVersion: SCHEMA_VERSION });
    expect(rows).toBe(BACKUP_TABLES.reduce((n, t) => n + backup.data[t].length, 0));
    // Tombstones are included.
    expect(backup.data.dictionaries.some((d) => d.deletedAt !== null)).toBe(true);
    expect(backup.data.words.some((w) => w.deletedAt !== null)).toBe(true);
    expect(backup.data.tags.some((t) => t.deletedAt !== null)).toBe(true);

    const target = createTestContext();
    await backupService(target).service.restore(backup);
    expect(dump(target)).toEqual(dump(source));

    // Repositories and the search index work on the restored data.
    expect((await target.repos.words.search('building')).map((w) => w.term)).toEqual(['Haus']);
    expect(await target.repos.settings.get('theme')).toBe('dark');
    const [haus] = (await target.repos.words.search('Haus')).map((w) => w.id);
    if (!haus) throw new Error('expected Haus');
    const [card] = await target.repos.cards.listForWord(haus);
    expect(card).toMatchObject({ state: CardState.Review, scheduledDays: 3, stability: 3.17 });
  });

  it('writes the file in pieces, not as one string', async () => {
    const ctx = createTestContext();
    await fill(ctx);
    const { chunks } = await writeToString(ctx);
    expect(chunks).toBeGreaterThan(BACKUP_TABLES.length);
  });

  it('replaces existing data and takes a snapshot first', async () => {
    const source = createTestContext();
    await fill(source);
    const backup = parsed((await writeToString(source)).text);

    const target = createTestContext();
    const other = await target.repos.dictionaries.create({ name: 'Mine' });
    await target.repos.words.create({
      dictionaryId: other.id,
      term: 'only here',
      translation: 'x',
    });
    const { service, snapshots } = backupService(target);
    await service.restore(backup);

    expect(dump(target)).toEqual(dump(source));
    expect(await target.repos.words.search('only here')).toEqual([]);
    expect(snapshots.paths).toHaveLength(1);
    expect(fs.existsSync(snapshots.paths[0] ?? '')).toBe(true);
  });

  it('changes nothing when the rows do not fit together', async () => {
    const source = createTestContext();
    await fill(source);
    const backup = parsed((await writeToString(source)).text);
    backup.data.dictionaries = []; // words now point at a missing dictionary

    const target = createTestContext();
    const mine = await target.repos.dictionaries.create({ name: 'Mine' });
    await target.repos.words.create({ dictionaryId: mine.id, term: 'kept', translation: 'x' });
    const before = dump(target);
    await expect(backupService(target).service.restore(backup)).rejects.toThrow();
    expect(dump(target)).toEqual(before);
    expect((await target.repos.words.search('kept')).map((w) => w.term)).toEqual(['kept']);
  });
});

describe('snapshots', () => {
  it('restores a snapshot of the same schema version', async () => {
    const ctx = createTestContext();
    await fill(ctx);
    const { service, snapshots } = backupService(ctx);
    service.snapshot('daily');
    const saved = dump(ctx);
    const snapshotPath = snapshots.paths[0] ?? '';
    expect(service.snapshotSchemaVersion(snapshotPath)).toBe(SCHEMA_VERSION);

    const [dictionary] = await ctx.repos.dictionaries.list();
    if (!dictionary) throw new Error('expected a dictionary');
    await ctx.repos.words.create({ dictionaryId: dictionary.id, term: 'later', translation: 'y' });
    await ctx.repos.dictionaries.softDelete(dictionary.id);

    await service.restoreSnapshot(snapshotPath);
    expect(dump(ctx)).toEqual(saved);
    expect((await ctx.repos.words.search('building')).map((w) => w.term)).toEqual(['Haus']);
    // The state before the restore was saved too.
    expect(snapshots.paths.map((p) => path.basename(p))).toEqual([
      'snapshot-0-daily.db',
      'snapshot-1-pre-restore.db',
    ]);
  });

  it('refuses a snapshot from another schema version or a file that is not a database', async () => {
    const ctx = createTestContext();
    const { service, snapshots } = backupService(ctx);
    service.snapshot('daily');
    const older = snapshots.paths[0] ?? '';
    const Database = jest.requireActual<typeof import('better-sqlite3')>('better-sqlite3');
    const file = new Database(older);
    file.exec(
      'DELETE FROM __drizzle_migrations WHERE rowid = (SELECT max(rowid) FROM __drizzle_migrations)',
    );
    file.close();
    expect(service.snapshotSchemaVersion(older)).toBe(SCHEMA_VERSION - 1);
    await expect(service.restoreSnapshot(older)).rejects.toThrow(/earlier version/);

    const notDb = path.join(dir, 'not.db');
    fs.writeFileSync(notDb, 'hello');
    expect(service.snapshotSchemaVersion(notDb)).toBeNull();
  });
});
