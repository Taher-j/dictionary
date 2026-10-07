import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { needsPreMigrationSnapshot } from '@/data/db/migrationState';
import migrations from '@/data/db/migrations/migrations';
import * as schema from '@/data/db/schema';
import type { AppDatabase } from '@/data/db/types';

export const DATABASE_NAME = 'dictionary.db';

export interface SnapshotInfo {
  /** Absolute file-system path (not a URI). */
  path: string;
  createdAt: number;
  /** `daily`, `pre-migrate`, `pre-restore`, ... */
  reason: string;
  size: number | null;
}

/** Where snapshots go. Implemented in src/services (file system access lives there). */
export interface SnapshotTarget {
  /** Absolute file-system path (not a URI) for a new snapshot file. */
  newSnapshotPath(reason: string): string;
  /** Deletes old snapshots beyond the retention limit. */
  prune(): void;
  /** Existing snapshots, newest first. */
  list(): SnapshotInfo[];
}

export interface OpenedDatabase {
  db: AppDatabase;
  sqlite: SQLiteDatabase;
}

/** Writes a consistent copy of the open database (WAL included) to `path`. */
export function writeSnapshot(sqlite: SQLiteDatabase, path: string): void {
  sqlite.runSync('VACUUM INTO ?', path);
}

/**
 * Opens the database, enables WAL and foreign keys, snapshots it if migrations are pending,
 * then runs the migrations (in one transaction).
 */
export async function openAppDatabase(snapshots: SnapshotTarget): Promise<OpenedDatabase> {
  const sqlite = openDatabaseSync(DATABASE_NAME);
  sqlite.execSync('PRAGMA journal_mode = WAL;');
  sqlite.execSync('PRAGMA foreign_keys = ON;');
  // After a checkpoint, shrink the WAL file back to at most 32 MB (bulk writes can grow it).
  sqlite.execSync('PRAGMA journal_size_limit = 33554432;');

  const query = <T>(source: string) => sqlite.getAllSync<T>(source);
  if (needsPreMigrationSnapshot(query, migrations.journal)) {
    writeSnapshot(sqlite, snapshots.newSnapshotPath('pre-migrate'));
    snapshots.prune();
  }

  const db = drizzle(sqlite, { schema });
  await migrate(db, migrations);
  return { db, sqlite };
}
