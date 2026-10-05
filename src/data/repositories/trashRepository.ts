import { and, desc, eq, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';

import { cards, dictionaries, importBatches, reviewLogs, words, wordTags } from '@/data/db/schema';
import { chunk, type RepositoryDeps } from '@/data/repositories/deps';
import type {
  DictionaryId,
  EpochMs,
  Page,
  TrashCursor,
  TrashedWord,
  WordId,
} from '@/domain/models';

export interface TrashRepository {
  /**
   * Trashed words whose dictionary still exists, most recently deleted first. Words trashed
   * together with their dictionary are listed under that dictionary instead.
   */
  listWords(cursor?: TrashCursor | null, limit?: number): Promise<Page<TrashedWord, TrashCursor>>;
  /**
   * Deletes for good everything trashed before `before`: words with their cards, review logs,
   * tag links and search rows, then dictionaries. Returns how many words were purged.
   */
  purge(before: EpochMs): Promise<number>;
}

const PAGE_SIZE = 50;

export function createTrashRepository({ db }: RepositoryDeps): TrashRepository {
  return {
    async listWords(cursor, limit = PAGE_SIZE) {
      const conditions = [isNotNull(words.deletedAt), isNull(dictionaries.deletedAt)];
      if (cursor) {
        conditions.push(
          sql`(${words.deletedAt}, ${words.id}) < (${cursor.deletedAt}, ${cursor.id})`,
        );
      }
      const rows = db
        .select({
          id: words.id,
          dictionaryId: words.dictionaryId,
          dictionaryName: dictionaries.name,
          term: words.term,
          deletedAt: words.deletedAt,
        })
        .from(words)
        .innerJoin(dictionaries, eq(dictionaries.id, words.dictionaryId))
        .where(and(...conditions))
        .orderBy(desc(words.deletedAt), desc(words.id))
        .limit(limit + 1)
        .all();

      const items: TrashedWord[] = rows.slice(0, limit).map((r) => ({
        id: r.id as WordId,
        dictionaryId: r.dictionaryId as DictionaryId,
        dictionaryName: r.dictionaryName,
        term: r.term,
        deletedAt: r.deletedAt ?? 0,
      }));
      const last = items[items.length - 1];
      return {
        items,
        nextCursor: rows.length > limit && last ? { deletedAt: last.deletedAt, id: last.id } : null,
      };
    },

    async purge(before) {
      return db.transaction((tx) => {
        const purgedDictionaries = tx
          .select({ id: dictionaries.id })
          .from(dictionaries)
          .where(lt(dictionaries.deletedAt, before))
          .all()
          .map((d) => d.id);

        const wordConditions = [lt(words.deletedAt, before)];
        const wordIds = tx
          .select({ id: words.id })
          .from(words)
          .where(
            purgedDictionaries.length > 0
              ? or(...wordConditions, inArray(words.dictionaryId, purgedDictionaries))
              : and(...wordConditions),
          )
          .all()
          .map((w) => w.id);

        for (const part of chunk(wordIds)) {
          const cardIds = tx
            .select({ id: cards.id })
            .from(cards)
            .where(inArray(cards.wordId, part))
            .all()
            .map((c) => c.id);
          if (cardIds.length > 0) {
            tx.delete(reviewLogs).where(inArray(reviewLogs.cardId, cardIds)).run();
          }
          tx.delete(cards).where(inArray(cards.wordId, part)).run();
          tx.delete(wordTags).where(inArray(wordTags.wordId, part)).run();
          tx.run(
            sql`DELETE FROM words_fts WHERE word_id IN (${sql.join(
              part.map((id) => sql`${id}`),
              sql`, `,
            )})`,
          );
          tx.delete(words).where(inArray(words.id, part)).run();
        }

        for (const part of chunk(purgedDictionaries)) {
          tx.delete(importBatches).where(inArray(importBatches.dictionaryId, part)).run();
          tx.delete(dictionaries).where(inArray(dictionaries.id, part)).run();
        }
        return wordIds.length;
      });
    },
  };
}
