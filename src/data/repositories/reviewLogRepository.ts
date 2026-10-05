import { asc, eq } from 'drizzle-orm';

import { reviewLogs } from '@/data/db/schema';
import type { RepositoryDeps } from '@/data/repositories/deps';
import type {
  CardId,
  CardSchedule,
  NewReviewLog,
  Rating,
  ReviewLog,
  ReviewLogId,
  SessionId,
} from '@/domain/models';

/** Append-only: review logs are never updated or deleted. */
export interface ReviewLogRepository {
  append(input: NewReviewLog): Promise<ReviewLog>;
  listForCard(cardId: CardId): Promise<ReviewLog[]>;
}

type ReviewLogRow = typeof reviewLogs.$inferSelect;

function toReviewLog(row: ReviewLogRow): ReviewLog {
  return {
    ...row,
    id: row.id as ReviewLogId,
    cardId: row.cardId as CardId,
    sessionId: row.sessionId as SessionId | null,
    rating: row.rating as Rating,
    prevCard: row.prevCard === null ? null : (JSON.parse(row.prevCard) as CardSchedule),
  };
}

export function createReviewLogRepository({ db, newId }: RepositoryDeps): ReviewLogRepository {
  return {
    async append(input) {
      const row = db
        .insert(reviewLogs)
        .values({
          ...input,
          id: newId(),
          prevCard: input.prevCard === null ? null : JSON.stringify(input.prevCard),
        })
        .returning()
        .get();
      return toReviewLog(row);
    },

    async listForCard(cardId) {
      return db
        .select()
        .from(reviewLogs)
        .where(eq(reviewLogs.cardId, cardId))
        .orderBy(asc(reviewLogs.reviewedAt), asc(reviewLogs.id))
        .all()
        .map(toReviewLog);
    },
  };
}
