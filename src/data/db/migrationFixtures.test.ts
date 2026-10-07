/** @jest-environment node */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import journal from '@/data/db/migrations/meta/_journal.json';
import * as schema from '@/data/db/schema';
import { createRepositories } from '@/data/repositories';
import { MIGRATIONS_FOLDER } from '@/data/testing/testDatabase';

const fs = jest.requireActual<typeof import('node:fs')>('node:fs');
const os = jest.requireActual<typeof import('node:os')>('node:os');
const path = jest.requireActual<typeof import('node:path')>('node:path');

const FIXTURES = path.join(__dirname, 'fixtures');
const fixtures = fs.readdirSync(FIXTURES).filter((name) => /^schema-\d+\.db$/.test(name));

describe('migrating fixture databases', () => {
  it('has a fixture for the current schema version', () => {
    expect(fixtures).toContain(`schema-${journal.entries.length}.db`);
  });

  it.each(fixtures)('%s migrates to the latest schema and keeps its data', async (name) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixture-'));
    try {
      const file = path.join(dir, name);
      fs.copyFileSync(path.join(FIXTURES, name), file);
      const sqlite = new Database(file);
      sqlite.pragma('foreign_keys = ON');
      const db = drizzle(sqlite, { schema });
      migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

      const applied = sqlite.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get() as {
        n: number;
      };
      expect(applied.n).toBe(journal.entries.length);
      expect(sqlite.pragma('foreign_key_check')).toEqual([]);

      const repos = createRepositories({ db, now: () => Date.UTC(2026, 9, 8), newId: () => 'x' });
      expect((await repos.dictionaries.list()).map((d) => d.name)).toEqual(['German']);
      const [haus] = await repos.words.search('house');
      expect(haus).toMatchObject({ term: 'Haus', starred: true, status: 'new' });
      expect((await repos.tags.listForWord(haus?.id ?? ('' as never))).map((t) => t.name)).toEqual([
        'nouns',
      ]);
      expect(await repos.settings.get('dailyNewLimit')).toBe(12);
      sqlite.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
