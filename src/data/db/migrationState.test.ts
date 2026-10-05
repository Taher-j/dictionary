/** @jest-environment node */
import journal from '@/data/db/migrations/meta/_journal.json';
import { needsPreMigrationSnapshot } from '@/data/db/migrationState';
import { createTestContext } from '@/data/testing/testDatabase';
import Database from 'better-sqlite3';

const queryFor =
  (sqlite: Database.Database) =>
  <T>(source: string) =>
    sqlite.prepare(source).all() as T[];

describe('needsPreMigrationSnapshot', () => {
  it('is false for a fresh database', () => {
    const sqlite = new Database(':memory:');
    expect(needsPreMigrationSnapshot(queryFor(sqlite), journal)).toBe(false);
  });

  it('is false when every migration has been applied', () => {
    const { sqlite } = createTestContext();
    expect(needsPreMigrationSnapshot(queryFor(sqlite), journal)).toBe(false);
  });

  it('is true when the bundle has a newer migration than the database', () => {
    const { sqlite } = createTestContext();
    const newer = { entries: [...journal.entries, { when: Date.UTC(2030, 0, 1) }] };
    expect(needsPreMigrationSnapshot(queryFor(sqlite), newer)).toBe(true);
  });
});

describe('VACUUM INTO snapshots', () => {
  it('copies a WAL database including uncheckpointed writes', () => {
    const fs = jest.requireActual<typeof import('node:fs')>('node:fs');
    const os = jest.requireActual<typeof import('node:os')>('node:os');
    const path = jest.requireActual<typeof import('node:path')>('node:path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-'));
    try {
      const sqlite = new Database(path.join(dir, 'live.db'));
      sqlite.pragma('journal_mode = WAL');
      sqlite.exec("CREATE TABLE t (v TEXT); INSERT INTO t VALUES ('kept');");

      const target = path.join(dir, 'snapshot.db');
      sqlite.prepare('VACUUM INTO ?').run(target);
      sqlite.close();

      const copy = new Database(target, { readonly: true });
      expect(copy.prepare('SELECT v FROM t').all()).toEqual([{ v: 'kept' }]);
      copy.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
