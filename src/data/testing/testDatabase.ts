// Test-only: an in-memory better-sqlite3 database with the app schema and migrations.
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';

import * as schema from '@/data/db/schema';
import type { AppDatabase } from '@/data/db/types';
import { createRepositories, type Repositories } from '@/data/repositories';
import { createIdGenerator } from '@/lib/ids';

export const MIGRATIONS_FOLDER = path.join(__dirname, '..', 'db', 'migrations');

export interface TestContext {
  db: AppDatabase;
  sqlite: Database.Database;
  repos: Repositories;
  /** Current fake time; advance it with `tick`. */
  time: () => number;
  tick: (ms?: number) => number;
}

export function createTestContext(start = Date.UTC(2026, 9, 5, 12)): TestContext {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

  let current = start;
  let counter = 0;
  const now = () => current;
  const newId = createIdGenerator({
    now,
    // Deterministic, unique bytes: a counter in the last four bytes.
    randomBytes: (length) => {
      counter += 1;
      const bytes = new Uint8Array(length);
      new DataView(bytes.buffer).setUint32(length - 4, counter);
      return bytes;
    },
  });

  return {
    db,
    sqlite,
    repos: createRepositories({ db, now, newId }),
    time: now,
    tick: (ms = 1) => (current += ms),
  };
}
