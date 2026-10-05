import { and, asc, eq, isNull } from 'drizzle-orm';

import { tags, words, wordTags } from '@/data/db/schema';
import type { RepositoryDeps } from '@/data/repositories/deps';
import type { Tag, TagId, WordId } from '@/domain/models';
import { termKeys } from '@/domain/termKeys';

export interface TagRepository {
  list(): Promise<Tag[]>;
  /** Returns the tag with this name (case and spacing ignored), creating or restoring it. */
  getOrCreate(name: string): Promise<Tag>;
  rename(id: TagId, name: string): Promise<Tag>;
  softDelete(id: TagId): Promise<void>;
  listForWord(wordId: WordId): Promise<Tag[]>;
  /** Replaces the word's tags and bumps the word's `updated_at`. */
  setWordTags(wordId: WordId, tagIds: readonly TagId[]): Promise<void>;
}

type TagRow = typeof tags.$inferSelect;

function toTag(row: TagRow): Tag {
  return { ...row, id: row.id as TagId };
}

function cleanName(name: string): { name: string; nameNorm: string } {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed === '') throw new Error('A tag needs a name.');
  return { name: trimmed, nameNorm: termKeys(trimmed).norm };
}

export function createTagRepository({ db, now, newId }: RepositoryDeps): TagRepository {
  return {
    async list() {
      return db
        .select()
        .from(tags)
        .where(isNull(tags.deletedAt))
        .orderBy(asc(tags.nameNorm))
        .all()
        .map(toTag);
    },

    async getOrCreate(rawName) {
      const { name, nameNorm } = cleanName(rawName);
      const at = now();
      const row = db.transaction((tx) => {
        const existing = tx.select().from(tags).where(eq(tags.nameNorm, nameNorm)).get();
        if (existing && existing.deletedAt === null) return existing;
        if (existing) {
          return tx
            .update(tags)
            .set({ name, deletedAt: null, updatedAt: at })
            .where(eq(tags.id, existing.id))
            .returning()
            .get();
        }
        return tx
          .insert(tags)
          .values({ id: newId(), name, nameNorm, createdAt: at, updatedAt: at })
          .returning()
          .get();
      });
      return toTag(row);
    },

    async rename(id, rawName) {
      const { name, nameNorm } = cleanName(rawName);
      const row = db
        .update(tags)
        .set({ name, nameNorm, updatedAt: now() })
        .where(and(eq(tags.id, id), isNull(tags.deletedAt)))
        .returning()
        .get();
      if (!row) throw new Error(`Tag not found: ${id}`);
      return toTag(row);
    },

    async softDelete(id) {
      const at = now();
      db.update(tags)
        .set({ deletedAt: at, updatedAt: at })
        .where(and(eq(tags.id, id), isNull(tags.deletedAt)))
        .run();
    },

    async listForWord(wordId) {
      return db
        .select({ tag: tags })
        .from(wordTags)
        .innerJoin(tags, eq(tags.id, wordTags.tagId))
        .where(and(eq(wordTags.wordId, wordId), isNull(tags.deletedAt)))
        .orderBy(asc(tags.nameNorm))
        .all()
        .map((r) => toTag(r.tag));
    },

    async setWordTags(wordId, tagIds) {
      const unique = [...new Set(tagIds)];
      db.transaction((tx) => {
        tx.delete(wordTags).where(eq(wordTags.wordId, wordId)).run();
        if (unique.length > 0) {
          tx.insert(wordTags)
            .values(unique.map((tagId) => ({ wordId, tagId })))
            .run();
        }
        tx.update(words).set({ updatedAt: now() }).where(eq(words.id, wordId)).run();
      });
    },
  };
}
