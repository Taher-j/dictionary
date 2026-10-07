import { and, asc, desc, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';

import { cards, dictionaries, words } from '@/data/db/schema';
import { chunk, type RepositoryDeps } from '@/data/repositories/deps';
import {
  CardState,
  type Dictionary,
  type DictionaryId,
  type DictionaryPatch,
  type DictionaryWithCounts,
  type NewDictionary,
} from '@/domain/models';

export interface DictionaryRepository {
  list(): Promise<Dictionary[]>;
  /** The Library list: word and incomplete-word counts per dictionary, in display order. */
  listWithCounts(): Promise<DictionaryWithCounts[]>;
  /** Trashed dictionaries, most recently deleted first. */
  listDeleted(): Promise<Dictionary[]>;
  getById(id: DictionaryId): Promise<Dictionary | null>;
  create(input: NewDictionary): Promise<Dictionary>;
  update(id: DictionaryId, patch: DictionaryPatch): Promise<Dictionary>;
  /** Soft-deletes the dictionary and its words with one shared timestamp. */
  softDelete(id: DictionaryId): Promise<void>;
  /** Restores the dictionary and the words that were deleted together with it. */
  restore(id: DictionaryId): Promise<void>;
  /** Moves a dictionary one place up or down in the Library order. */
  move(id: DictionaryId, direction: 'up' | 'down'): Promise<void>;
}

type DictionaryRow = typeof dictionaries.$inferSelect;

function toDictionary(row: DictionaryRow): Dictionary {
  return { ...row, id: row.id as DictionaryId };
}

export function createDictionaryRepository({
  db,
  now,
  newId,
}: RepositoryDeps): DictionaryRepository {
  const getRow = (id: DictionaryId) =>
    db
      .select()
      .from(dictionaries)
      .where(and(eq(dictionaries.id, id), isNull(dictionaries.deletedAt)))
      .get();

  return {
    async list() {
      const rows = db
        .select()
        .from(dictionaries)
        .where(isNull(dictionaries.deletedAt))
        .orderBy(asc(dictionaries.position), asc(dictionaries.name))
        .all();
      return rows.map(toDictionary);
    },

    async listWithCounts() {
      const rows = db
        .select({
          dictionary: dictionaries,
          wordCount: sql<number>`count(${words.id})`,
          incompleteCount: sql<number>`count(CASE WHEN ${words.translation} IS NULL AND ${words.definition} IS NULL THEN ${words.id} END)`,
        })
        .from(dictionaries)
        .leftJoin(words, and(eq(words.dictionaryId, dictionaries.id), isNull(words.deletedAt)))
        .where(isNull(dictionaries.deletedAt))
        .groupBy(dictionaries.id)
        .orderBy(asc(dictionaries.position), asc(dictionaries.name))
        .all();
      return rows.map((r) => ({
        ...toDictionary(r.dictionary),
        wordCount: Number(r.wordCount),
        incompleteCount: Number(r.incompleteCount),
      }));
    },

    async listDeleted() {
      return db
        .select()
        .from(dictionaries)
        .where(isNotNull(dictionaries.deletedAt))
        .orderBy(desc(dictionaries.deletedAt), asc(dictionaries.id))
        .all()
        .map(toDictionary);
    },

    async getById(id) {
      const row = getRow(id);
      return row ? toDictionary(row) : null;
    },

    async create(input) {
      const at = now();
      const row = db.transaction((tx) => {
        // New dictionaries go to the end of the Library unless a position is given.
        const [last] = tx
          .select({ max: sql<number | null>`max(${dictionaries.position})` })
          .from(dictionaries)
          .where(isNull(dictionaries.deletedAt))
          .all();
        const position = input.position ?? (last?.max ?? -1) + 1;
        return tx
          .insert(dictionaries)
          .values({
            ...input,
            name: input.name.trim(),
            position,
            id: newId(),
            createdAt: at,
            updatedAt: at,
          })
          .returning()
          .get();
      });
      return toDictionary(row);
    },

    async update(id, patch) {
      const at = now();
      const row = db.transaction((tx) => {
        const updated = tx
          .update(dictionaries)
          .set({
            ...patch,
            ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
            updatedAt: at,
          })
          .where(and(eq(dictionaries.id, id), isNull(dictionaries.deletedAt)))
          .returning()
          .get();
        if (!updated) throw new Error(`Dictionary not found: ${id}`);
        // Both directions: every word with a meaning gets its recall card (new, due now).
        // Turning it off keeps those cards; the queue leaves them out.
        if (patch.bothDirections) {
          const missing = tx
            .select({ id: words.id })
            .from(words)
            .where(
              and(
                eq(words.dictionaryId, id),
                or(isNotNull(words.translation), isNotNull(words.definition)),
                sql`NOT EXISTS (SELECT 1 FROM cards WHERE cards.word_id = ${words.id} AND cards.direction = 'recall')`,
              ),
            )
            .all();
          for (const part of chunk(missing, 100)) {
            tx.insert(cards)
              .values(
                part.map((w) => ({
                  id: newId(),
                  wordId: w.id,
                  direction: 'recall' as const,
                  state: CardState.New,
                  due: at,
                  updatedAt: at,
                })),
              )
              .run();
          }
        }
        return updated;
      });
      return toDictionary(row);
    },

    async softDelete(id) {
      const at = now();
      db.transaction((tx) => {
        tx.update(dictionaries)
          .set({ deletedAt: at, updatedAt: at })
          .where(and(eq(dictionaries.id, id), isNull(dictionaries.deletedAt)))
          .run();
        tx.update(words)
          .set({ deletedAt: at, updatedAt: at })
          .where(and(eq(words.dictionaryId, id), isNull(words.deletedAt)))
          .run();
      });
    },

    async restore(id) {
      const at = now();
      db.transaction((tx) => {
        const row = tx.select().from(dictionaries).where(eq(dictionaries.id, id)).get();
        if (!row?.deletedAt) return;
        tx.update(words)
          .set({ deletedAt: null, updatedAt: at })
          .where(and(eq(words.dictionaryId, id), eq(words.deletedAt, row.deletedAt)))
          .run();
        tx.update(dictionaries)
          .set({ deletedAt: null, updatedAt: at })
          .where(eq(dictionaries.id, id))
          .run();
      });
    },

    async move(id, direction) {
      const at = now();
      db.transaction((tx) => {
        const ordered = tx
          .select({ id: dictionaries.id, position: dictionaries.position })
          .from(dictionaries)
          .where(isNull(dictionaries.deletedAt))
          .orderBy(asc(dictionaries.position), asc(dictionaries.name))
          .all();
        const from = ordered.findIndex((d) => d.id === id);
        const to = direction === 'up' ? from - 1 : from + 1;
        if (from < 0 || to < 0 || to >= ordered.length) return;
        const [moved] = ordered.splice(from, 1);
        if (!moved) return;
        ordered.splice(to, 0, moved);
        // Rewrite positions as 0..n-1; touch only rows whose position changed.
        ordered.forEach((d, position) => {
          if (d.position === position) return;
          tx.update(dictionaries)
            .set({ position, updatedAt: at })
            .where(eq(dictionaries.id, d.id))
            .run();
        });
      });
    },
  };
}
