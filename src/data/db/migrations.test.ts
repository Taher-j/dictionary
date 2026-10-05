/** @jest-environment node */
import journal from '@/data/db/migrations/meta/_journal.json';
import { createTestContext } from '@/data/testing/testDatabase';

const columnsOf = (ctx: ReturnType<typeof createTestContext>, table: string) =>
  (ctx.sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
    (c) => c.name,
  );

describe('migrations', () => {
  it('run from an empty database and record every migration', () => {
    const ctx = createTestContext();
    const tables = (
      ctx.sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as { name: string }[]
    ).map((t) => t.name);

    expect(tables).toEqual([
      '__drizzle_migrations',
      'cards',
      'dictionaries',
      'import_batches',
      'review_logs',
      'sessions',
      'settings',
      'tags',
      'word_tags',
      'words',
    ]);
    const applied = ctx.sqlite.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get();
    expect(applied).toEqual({ n: journal.entries.length });
  });

  it('gives every user-editable table id, updated_at and deleted_at', () => {
    const ctx = createTestContext();
    for (const table of ['dictionaries', 'words', 'tags']) {
      expect(columnsOf(ctx, table)).toEqual(
        expect.arrayContaining(['id', 'updated_at', 'deleted_at']),
      );
    }
  });

  it('has no unique index on words.term_norm', () => {
    const ctx = createTestContext();
    const indexes = ctx.sqlite.prepare("PRAGMA index_list('words')").all() as {
      name: string;
      unique: number;
    }[];
    for (const index of indexes.filter((i) => i.unique === 1)) {
      const cols = (
        ctx.sqlite.prepare(`PRAGMA index_info('${index.name}')`).all() as {
          name: string;
        }[]
      ).map((c) => c.name);
      expect(cols).not.toContain('term_norm');
    }
  });

  it('enforces foreign keys', () => {
    const ctx = createTestContext();
    expect(() =>
      ctx.sqlite
        .prepare(
          "INSERT INTO words (id, dictionary_id, term, term_norm, term_fold, created_at, updated_at) VALUES ('w', 'missing', 'a', 'a', 'a', 1, 1)",
        )
        .run(),
    ).toThrow(/FOREIGN KEY/);
  });
});
