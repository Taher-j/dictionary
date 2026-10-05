/** Runs a read-only query and returns its rows. Implemented by expo-sqlite and better-sqlite3. */
export type QueryRows = <T>(source: string) => T[];

export interface MigrationJournal {
  entries: readonly { when: number }[];
}

const MIGRATIONS_TABLE = '__drizzle_migrations';

/**
 * True when an existing database has migrations still to run, so it must be snapshotted first.
 * A fresh database (no migrations table yet) holds no data and needs no snapshot.
 * Drizzle applies every journal entry newer than the last recorded `created_at`.
 */
export function needsPreMigrationSnapshot(query: QueryRows, journal: MigrationJournal): boolean {
  const table = query<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${MIGRATIONS_TABLE}'`,
  );
  if (table.length === 0) return false;

  const [row] = query<{ last: number | null }>(
    `SELECT max(created_at) AS last FROM ${MIGRATIONS_TABLE}`,
  );
  const lastApplied = Number(row?.last ?? 0);
  return journal.entries.some((entry) => entry.when > lastApplied);
}
