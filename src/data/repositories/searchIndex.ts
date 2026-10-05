import { sql, type SQL } from 'drizzle-orm';

import type { AppDatabase } from '@/data/db/types';

// Maintains words_fts (migration 0002): one row per word that has a translation or definition.
// Callers run these inside the same transaction as the word write.

type Runner = Pick<AppDatabase, 'run'>;

/** The trigram tokenizer needs at least three characters to use the index. */
export const MIN_FTS_QUERY_LENGTH = 3;

/** An FTS5 phrase: the text in double quotes, inner quotes doubled. */
function phrase(text: string): string {
  return `"${text.replace(/"/g, '""')}"`;
}

/** MATCH expression for one word's row (word_id is indexed, so this avoids a full scan). */
function wordIdMatch(wordId: string): string {
  return `word_id : ${phrase(wordId)}`;
}

/** MATCH expression for a substring of a translation or definition. */
export function meaningMatch(text: string): string {
  return `{translation definition} : ${phrase(text)}`;
}

export interface SearchIndexEntry {
  id: string;
  translation: string | null;
  definition: string | null;
}

export function removeFromSearchIndex(db: Runner, wordId: string): void {
  db.run(
    sql`DELETE FROM words_fts WHERE rowid IN (SELECT rowid FROM words_fts WHERE words_fts MATCH ${wordIdMatch(wordId)})`,
  );
}

/** Inserts rows without checking for existing ones (new words, bulk seeding). */
export function insertIntoSearchIndex(db: Runner, entries: readonly SearchIndexEntry[]): void {
  const rows: SQL[] = entries
    .filter((e) => e.translation !== null || e.definition !== null)
    .map((e) => sql`(${e.id}, ${e.translation}, ${e.definition})`);
  if (rows.length === 0) return;
  db.run(
    sql`INSERT INTO words_fts (word_id, translation, definition) VALUES ${sql.join(rows, sql`, `)}`,
  );
}

/** Replaces the word's row after an edit. */
export function updateSearchIndex(db: Runner, entry: SearchIndexEntry): void {
  removeFromSearchIndex(db, entry.id);
  insertIntoSearchIndex(db, [entry]);
}

export function clearSearchIndex(db: Runner): void {
  db.run(sql`DELETE FROM words_fts`);
}
