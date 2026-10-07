import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { tags, words, wordTags } from '@/data/db/schema';
import type { RepositoryDeps } from '@/data/repositories/deps';
import type { Tag, TagId, TagWithCount, WordId } from '@/domain/models';
import { termKeys } from '@/domain/termKeys';

/** `conflict`: another tag already has this name (case and spacing ignored); offer a merge. */
export type RenameResult = { ok: true; tag: Tag } | { ok: false; conflict: Tag };

export const TAG_SUGGESTION_LIMIT = 8;

export interface TagRepository {
  list(): Promise<Tag[]>;
  /** Every tag with the number of (not deleted) words that have it. */
  listWithCounts(): Promise<TagWithCount[]>;
  /** Tags whose name starts with `text` (case and spacing ignored), A-Z. */
  suggest(text: string, limit?: number): Promise<Tag[]>;
  /** Returns the tag with this name (case and spacing ignored), creating or restoring it. */
  getOrCreate(name: string): Promise<Tag>;
  rename(id: TagId, name: string): Promise<RenameResult>;
  /** Moves every word from `sourceId` to `targetId` and deletes the source tag. */
  merge(sourceId: TagId, targetId: TagId): Promise<void>;
  /** Deletes the tag and removes it from its words (their `updated_at` is bumped). */
  softDelete(id: TagId): Promise<void>;
  listForWord(wordId: WordId): Promise<Tag[]>;
  /** Replaces the word's tags and bumps the word's `updated_at`. */
  setWordTags(wordId: WordId, tagIds: readonly TagId[]): Promise<void>;
}

type TagRow = typeof tags.$inferSelect;

function toTag(row: TagRow): Tag {
  return { ...row, id: row.id as TagId };
}

/** Upper bound for a prefix range on a BINARY-collated column. */
const PREFIX_END = '\u{10FFFF}';

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

    async listWithCounts() {
      return db
        .select({ tag: tags, wordCount: sql<number>`count(${words.id})` })
        .from(tags)
        .leftJoin(wordTags, eq(wordTags.tagId, tags.id))
        .leftJoin(words, and(eq(words.id, wordTags.wordId), isNull(words.deletedAt)))
        .where(isNull(tags.deletedAt))
        .groupBy(tags.id)
        .orderBy(asc(tags.nameNorm))
        .all()
        .map((r) => ({ ...toTag(r.tag), wordCount: Number(r.wordCount) }));
    },

    async suggest(text, limit = TAG_SUGGESTION_LIMIT) {
      const norm = termKeys(text.trim().replace(/\s+/g, ' ')).norm;
      return db
        .select()
        .from(tags)
        .where(
          and(
            isNull(tags.deletedAt),
            sql`${tags.nameNorm} >= ${norm}`,
            sql`${tags.nameNorm} < ${norm + PREFIX_END}`,
          ),
        )
        .orderBy(asc(tags.nameNorm))
        .limit(limit)
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
      return db.transaction((tx): RenameResult => {
        const other = tx.select().from(tags).where(eq(tags.nameNorm, nameNorm)).get();
        if (other && other.id !== id) {
          // A deleted tag only holds the name; it has no words left, so drop it.
          if (other.deletedAt === null) return { ok: false, conflict: toTag(other) };
          tx.delete(tags).where(eq(tags.id, other.id)).run();
        }
        const row = tx
          .update(tags)
          .set({ name, nameNorm, updatedAt: now() })
          .where(and(eq(tags.id, id), isNull(tags.deletedAt)))
          .returning()
          .get();
        if (!row) throw new Error(`Tag not found: ${id}`);
        return { ok: true, tag: toTag(row) };
      });
    },

    async merge(sourceId, targetId) {
      if (sourceId === targetId) return;
      const at = now();
      db.transaction((tx) => {
        const target = tx
          .select({ id: tags.id })
          .from(tags)
          .where(and(eq(tags.id, targetId), isNull(tags.deletedAt)))
          .get();
        if (!target) throw new Error(`Tag not found: ${targetId}`);
        const wordIds = sql`(SELECT word_id FROM word_tags WHERE tag_id = ${sourceId})`;
        tx.update(words).set({ updatedAt: at }).where(inArray(words.id, wordIds)).run();
        tx.run(
          sql`INSERT OR IGNORE INTO word_tags (word_id, tag_id) SELECT word_id, ${targetId} FROM word_tags WHERE tag_id = ${sourceId}`,
        );
        tx.delete(wordTags).where(eq(wordTags.tagId, sourceId)).run();
        tx.update(tags).set({ deletedAt: at, updatedAt: at }).where(eq(tags.id, sourceId)).run();
      });
    },

    async softDelete(id) {
      const at = now();
      db.transaction((tx) => {
        const wordIds = sql`(SELECT word_id FROM word_tags WHERE tag_id = ${id})`;
        tx.update(words).set({ updatedAt: at }).where(inArray(words.id, wordIds)).run();
        tx.delete(wordTags).where(eq(wordTags.tagId, id)).run();
        tx.update(tags)
          .set({ deletedAt: at, updatedAt: at })
          .where(and(eq(tags.id, id), isNull(tags.deletedAt)))
          .run();
      });
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
