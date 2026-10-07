// Backup, restore and snapshots (docs/06-data-safety.md). Only this file reads or writes whole
// tables; screens reach it through the hooks in src/features/backup.
import { getTableColumns, sql } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { SnapshotInfo, SnapshotTarget } from '@/data/db/client';
import journal from '@/data/db/migrations/meta/_journal.json';
import {
  cards,
  dictionaries,
  importBatches,
  reviewLogs,
  sessions,
  settings,
  tags,
  words,
  wordTags,
} from '@/data/db/schema';
import type { AppDatabase } from '@/data/db/types';
import { clearSearchIndex, insertIntoSearchIndex } from '@/data/repositories/searchIndex';
import {
  BACKUP_COLUMNS,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BACKUP_TABLES,
  BackupFormatError,
  type BackupHeader,
  type BackupTable,
} from '@/domain/backup/format';
import { scanBackup } from '@/domain/backup/parse';
import type { Clock } from '@/lib/clock';

/** The schema version this build writes and can restore snapshots of. */
export const SCHEMA_VERSION = journal.entries.length;

const TABLES: Record<BackupTable, SQLiteTable> = {
  dictionaries,
  tags,
  words,
  wordTags,
  sessions,
  cards,
  reviewLogs,
  settings,
};

/** SQL table names, parents first, for copying a snapshot (Drizzle cannot express ATTACH copies). */
const SNAPSHOT_COPY_ORDER = [
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

/** Rows read per query while writing a backup. */
const READ_PAGE = 1000;
/** Rows per INSERT while restoring (well under SQLite's bound-parameter limit). */
const INSERT_ROWS = 100;
/** INSERT statements between yields to the UI during a restore. */
const STATEMENTS_PER_YIELD = 20;

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export interface BackupProgress {
  table: BackupTable;
  done: number;
  total: number;
}

export interface BackupMeta {
  appVersion: string;
  platform: string;
}

export interface BackupService {
  /** Writes the whole database as backup JSON, in pieces, to `write`. Returns the row count. */
  write(
    sink: (chunk: string) => void | Promise<void>,
    meta: BackupMeta,
    onProgress?: (progress: BackupProgress) => void,
  ): Promise<number>;
  /**
   * Replaces all data with the backup, read piece by piece, in one transaction after a snapshot.
   * Throws BackupFormatError (and changes nothing) for a file that is not a usable backup,
   * including rows that do not fit together, such as a card whose word is missing.
   */
  restore(pieces: AsyncIterable<string> | Iterable<string>): Promise<void>;
  /** Copies a snapshot's rows into the open database, after a snapshot of the current state. */
  restoreSnapshot(path: string): Promise<void>;
  /** The schema version of a snapshot file (migrations applied), or null if unreadable. */
  snapshotSchemaVersion(path: string): number | null;
  /** Writes a snapshot now (`VACUUM INTO`) and prunes old ones. */
  snapshot(reason: string): void;
  /** Snapshots, newest first; `restorable` when made with this build's schema version. */
  listSnapshots(): (SnapshotInfo & { restorable: boolean })[];
  /** The first launch of a study day takes a snapshot (docs/06-data-safety.md). */
  snapshotIfNoneSince(since: number): boolean;
}

export interface BackupDeps {
  db: AppDatabase;
  now: Clock;
  snapshots: SnapshotTarget;
}

/** Children before parents, so foreign keys hold while deleting. */
const DELETE_ORDER: SQLiteTable[] = [
  wordTags,
  reviewLogs,
  cards,
  sessions,
  words,
  importBatches,
  tags,
  dictionaries,
  settings,
];

function backupColumns(table: BackupTable) {
  const all = getTableColumns(TABLES[table]);
  const columns: Record<string, (typeof all)[string]> = {};
  for (const name of Object.keys(BACKUP_COLUMNS[table])) {
    const column = all[name];
    if (!column) throw new Error(`Backup column ${table}.${name} is not in the schema.`);
    columns[name] = column;
  }
  return columns;
}

export function createBackupService({ db, now, snapshots }: BackupDeps): BackupService {
  const count = (table: BackupTable) =>
    db.all<{ n: number }>(sql`SELECT count(*) AS n FROM ${TABLES[table]}`)[0]?.n ?? 0;

  const snapshot = (reason: string) => {
    db.run(sql`VACUUM INTO ${snapshots.newSnapshotPath(reason)}`);
    snapshots.prune();
  };

  const snapshotSchemaVersion = (path: string): number | null => {
    try {
      db.run(sql`ATTACH DATABASE ${path} AS probe`);
    } catch {
      return null;
    }
    try {
      const rows = db.all<{ n: number }>(sql`SELECT count(*) AS n FROM probe.__drizzle_migrations`);
      return rows[0]?.n ?? null;
    } catch {
      return null;
    } finally {
      db.run(sql`DETACH DATABASE probe`);
    }
  };

  /** Runs `work` in one transaction that may await (to yield to the UI); rolls back on error. */
  const inTransaction = async (work: () => Promise<void>) => {
    db.run(sql`BEGIN IMMEDIATE`);
    try {
      await work();
      db.run(sql`COMMIT`);
    } catch (error) {
      db.run(sql`ROLLBACK`);
      throw error;
    }
  };

  return {
    async write(sink, meta, onProgress) {
      const header: BackupHeader = {
        format: BACKUP_FORMAT,
        formatVersion: BACKUP_FORMAT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date(now()).toISOString(),
        app: { version: meta.appVersion, platform: meta.platform },
      };
      // The header, then "data" table by table, never the whole file as one string.
      await sink(`${JSON.stringify(header).slice(0, -1)},"data":{`);
      let rowsWritten = 0;
      for (const [index, table] of BACKUP_TABLES.entries()) {
        const total = count(table);
        const columns = backupColumns(table);
        await sink(`${index === 0 ? '' : ','}${JSON.stringify(table)}:[`);
        // Keyset paging on rowid works for every table, whatever its primary key.
        let lastRowid = -1;
        let done = 0;
        for (;;) {
          const page = db
            .select({ rowid: sql<number>`rowid`, ...columns })
            .from(TABLES[table])
            .where(sql`rowid > ${lastRowid}`)
            .orderBy(sql`rowid`)
            .limit(READ_PAGE)
            .all() as ({ rowid: number } & Record<string, unknown>)[];
          if (page.length === 0) break;
          const json = page.map(({ rowid, ...row }) => {
            lastRowid = rowid;
            return JSON.stringify(row);
          });
          await sink(`${done === 0 ? '' : ','}${json.join(',')}`);
          done += page.length;
          onProgress?.({ table, done, total });
          await yieldToUi();
        }
        rowsWritten += done;
        await sink(']');
      }
      await sink('}}');
      return rowsWritten;
    },

    async restore(pieces) {
      snapshot('pre-restore');
      await inTransaction(async () => {
        // Checked at COMMIT, so the order of tables in the file does not matter.
        db.run(sql`PRAGMA defer_foreign_keys = ON`);
        clearSearchIndex(db);
        for (const table of DELETE_ORDER) db.delete(table).run();

        const buffers = new Map<BackupTable, Record<string, unknown>[]>();
        let statements = 0;
        const flush = async (table: BackupTable) => {
          const rows = buffers.get(table) ?? [];
          if (rows.length === 0) return;
          buffers.set(table, []);
          db.insert(TABLES[table]).values(rows).run();
          if (table === 'words') {
            insertIntoSearchIndex(
              db,
              rows.map((w) => ({
                id: w.id as string,
                translation: w.translation as string | null,
                definition: w.definition as string | null,
              })),
            );
          }
          statements += 1;
          if (statements % STATEMENTS_PER_YIELD === 0) await yieldToUi();
        };

        const result = await scanBackup(pieces, async (table, row) => {
          const rows = buffers.get(table) ?? [];
          rows.push(row);
          buffers.set(table, rows);
          if (rows.length >= INSERT_ROWS) await flush(table);
        });
        if (!result.ok) throw new BackupFormatError(result.error);
        for (const table of BACKUP_TABLES) await flush(table);

        if (db.all(sql`PRAGMA foreign_key_check`).length > 0) {
          throw new BackupFormatError('invalidData');
        }
      });
    },

    async restoreSnapshot(path) {
      if (snapshotSchemaVersion(path) !== SCHEMA_VERSION) {
        throw new Error('This snapshot was made by an earlier version of the app.');
      }
      snapshot('pre-restore');
      db.run(sql`ATTACH DATABASE ${path} AS snap`);
      try {
        await inTransaction(async () => {
          clearSearchIndex(db);
          for (const table of DELETE_ORDER) db.delete(table).run();
          // Same schema version, so the column order matches. Parents first.
          for (const table of SNAPSHOT_COPY_ORDER) {
            db.run(sql.raw(`INSERT INTO main.${table} SELECT * FROM snap.${table}`));
            await yieldToUi();
          }
          db.run(
            sql`INSERT INTO words_fts (word_id, translation, definition)
                SELECT id, translation, definition FROM words
                WHERE translation IS NOT NULL OR definition IS NOT NULL`,
          );
        });
      } finally {
        db.run(sql`DETACH DATABASE snap`);
      }
    },

    snapshotSchemaVersion,

    snapshot,

    listSnapshots() {
      return snapshots.list().map((info) => ({
        ...info,
        restorable: snapshotSchemaVersion(info.path) === SCHEMA_VERSION,
      }));
    },

    snapshotIfNoneSince(since) {
      const [latest] = snapshots.list();
      if (latest && latest.createdAt >= since) return false;
      snapshot('daily');
      return true;
    },
  };
}
