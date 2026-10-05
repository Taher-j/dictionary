import { eq } from 'drizzle-orm';

import { cards } from '@/data/db/schema';
import type { RepositoryDeps } from '@/data/repositories/deps';
import type { Card, CardId, CardSchedule, CardStateValue, WordId } from '@/domain/models';

export interface CardRepository {
  getById(id: CardId): Promise<Card | null>;
  listForWord(wordId: WordId): Promise<Card[]>;
  /** Replaces the scheduling state (written by the scheduler after a review). */
  updateSchedule(id: CardId, schedule: CardSchedule): Promise<Card>;
  setSuspended(id: CardId, suspended: boolean): Promise<Card>;
}

type CardRow = typeof cards.$inferSelect;

export function toCard(row: CardRow): Card {
  return {
    ...row,
    id: row.id as CardId,
    wordId: row.wordId as WordId,
    state: row.state as CardStateValue,
  };
}

export function createCardRepository({ db, now }: RepositoryDeps): CardRepository {
  const updateRow = (id: CardId, values: Partial<typeof cards.$inferInsert>) => {
    const row = db
      .update(cards)
      .set({ ...values, updatedAt: now() })
      .where(eq(cards.id, id))
      .returning()
      .get();
    if (!row) throw new Error(`Card not found: ${id}`);
    return toCard(row);
  };

  return {
    async getById(id) {
      const row = db.select().from(cards).where(eq(cards.id, id)).get();
      return row ? toCard(row) : null;
    },

    async listForWord(wordId) {
      return db.select().from(cards).where(eq(cards.wordId, wordId)).all().map(toCard);
    },

    async updateSchedule(id, schedule) {
      return updateRow(id, schedule);
    },

    async setSuspended(id, suspended) {
      return updateRow(id, { suspended });
    },
  };
}
