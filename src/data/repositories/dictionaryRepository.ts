import { and, asc, eq, isNull } from 'drizzle-orm';

import { dictionaries, words } from '@/data/db/schema';
import type { RepositoryDeps } from '@/data/repositories/deps';
import type { Dictionary, DictionaryId, DictionaryPatch, NewDictionary } from '@/domain/models';

export interface DictionaryRepository {
  list(): Promise<Dictionary[]>;
  getById(id: DictionaryId): Promise<Dictionary | null>;
  create(input: NewDictionary): Promise<Dictionary>;
  update(id: DictionaryId, patch: DictionaryPatch): Promise<Dictionary>;
  /** Soft-deletes the dictionary and its words with one shared timestamp. */
  softDelete(id: DictionaryId): Promise<void>;
  /** Restores the dictionary and the words that were deleted together with it. */
  restore(id: DictionaryId): Promise<void>;
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

    async getById(id) {
      const row = getRow(id);
      return row ? toDictionary(row) : null;
    },

    async create(input) {
      const at = now();
      const row = db
        .insert(dictionaries)
        .values({ ...input, id: newId(), createdAt: at, updatedAt: at })
        .returning()
        .get();
      return toDictionary(row);
    },

    async update(id, patch) {
      const row = db
        .update(dictionaries)
        .set({ ...patch, updatedAt: now() })
        .where(and(eq(dictionaries.id, id), isNull(dictionaries.deletedAt)))
        .returning()
        .get();
      if (!row) throw new Error(`Dictionary not found: ${id}`);
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
  };
}
