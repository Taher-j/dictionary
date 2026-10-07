import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  lte,
  min,
  ne,
  or,
  sql,
} from 'drizzle-orm';

import { cards, dictionaries, reviewLogs, sessions, words } from '@/data/db/schema';
import { toCard } from '@/data/repositories/cardRepository';
import type { RepositoryDeps } from '@/data/repositories/deps';
import {
  CardState,
  type Card,
  type CardDirection,
  type CardId,
  type CardSchedule,
  type CardStateValue,
  type EpochMs,
  type Rating,
  type ReviewLogId,
  type SessionId,
  type WordId,
} from '@/domain/models';
import { dueCutoffs, remainingNewToday, type QueueCard } from '@/domain/queue';
import { nextStudyDayStart, studyDayStart } from '@/domain/studyDay';

export interface QueueCandidates {
  due: QueueCard[];
  newCards: QueueCard[];
  remainingNew: number;
  /** Words with a card reviewed this study day (sibling rule). */
  reviewedToday: Set<WordId>;
}

export interface TodaySummary {
  /** Learning, relearning and review cards due now (review cards: due this study day). */
  dueCount: number;
  /** New cards that can still be introduced today. */
  newCount: number;
  /** When the next card becomes due, if nothing is due now. */
  nextDueAt: EpochMs | null;
}

export interface AnswerInput {
  cardId: CardId;
  sessionId: SessionId;
  rating: Rating;
  durationMs: number | null;
}

export interface AnswerResult {
  logId: ReviewLogId;
  card: Card;
}

export interface ReviewRepository {
  queueCandidates(limits: { dailyNewLimit: number; sessionSize: number }): Promise<QueueCandidates>;
  todaySummary(dailyNewLimit: number): Promise<TodaySummary>;
  /** Cards whose first scheduled review happened in the current study day. */
  introducedToday(): Promise<number>;
  /** Cards due during the next study day (for the session summary). */
  dueTomorrowCount(): Promise<number>;
  startSession(): Promise<SessionId>;
  endSession(id: SessionId): Promise<void>;
  /**
   * One transaction: reads the card, applies `schedule`, writes the log row (with the previous
   * card) and the new card state. The UI advances only after this resolves.
   */
  answer(input: AnswerInput, schedule: (prev: CardSchedule) => CardSchedule): Promise<AnswerResult>;
  /** Undo of the last answer: restores the card from the log's `prev_card` and deletes the log. */
  undoAnswer(logId: ReviewLogId): Promise<Card>;
}

const queueColumns = {
  cardId: cards.id,
  wordId: cards.wordId,
  direction: cards.direction,
  state: cards.state,
  due: cards.due,
  wordCreatedAt: words.createdAt,
};

type QueueRow = {
  cardId: string;
  wordId: string;
  direction: CardDirection;
  state: number;
  due: number;
  wordCreatedAt: number;
};

const toQueueCard = (row: QueueRow): QueueCard => ({
  cardId: row.cardId as CardId,
  wordId: row.wordId as WordId,
  direction: row.direction,
  state: row.state as CardStateValue,
  due: row.due,
  wordCreatedAt: row.wordCreatedAt,
});

/**
 * Cards that may enter a queue: not suspended, word complete and not deleted, dictionary active,
 * and recall cards only while the dictionary practises both directions (turning it off keeps
 * their schedule).
 */
const eligible = and(
  eq(cards.suspended, false),
  or(eq(cards.direction, 'recognition'), eq(dictionaries.bothDirections, true)),
  isNull(words.deletedAt),
  or(isNotNull(words.translation), isNotNull(words.definition)),
  isNull(dictionaries.deletedAt),
  eq(dictionaries.inDailyReview, true),
);

const isLearningState = or(
  eq(cards.state, CardState.Learning),
  eq(cards.state, CardState.Relearning),
);

function dueCondition(now: EpochMs) {
  const cutoffs = dueCutoffs(now);
  return or(
    and(isLearningState, lte(cards.due, cutoffs.learning)),
    and(eq(cards.state, CardState.Review), lt(cards.due, cutoffs.review)),
  );
}

const SCHEDULE_COLUMNS = [
  'state',
  'due',
  'stability',
  'difficulty',
  'scheduledDays',
  'learningSteps',
  'reps',
  'lapses',
  'lastReview',
] as const satisfies readonly (keyof CardSchedule)[];

function scheduleOf(card: CardSchedule): CardSchedule {
  return Object.fromEntries(
    SCHEDULE_COLUMNS.map((key) => [key, card[key]]),
  ) as unknown as CardSchedule;
}

export function createReviewRepository({ db, now, newId }: RepositoryDeps): ReviewRepository {
  // Every queue query joins the word and dictionary for the `eligible` filter.
  const selectQueueRows = () =>
    db
      .select(queueColumns)
      .from(cards)
      .innerJoin(words, eq(words.id, cards.wordId))
      .innerJoin(dictionaries, eq(dictionaries.id, words.dictionaryId));
  const selectCount = () =>
    db
      .select({ n: count() })
      .from(cards)
      .innerJoin(words, eq(words.id, cards.wordId))
      .innerJoin(dictionaries, eq(dictionaries.id, words.dictionaryId));
  const selectNextDue = () =>
    db
      .select({ next: min(cards.due) })
      .from(cards)
      .innerJoin(words, eq(words.id, cards.wordId))
      .innerJoin(dictionaries, eq(dictionaries.id, words.dictionaryId));

  const countIntroducedToday = (at: EpochMs) => {
    const dayStart = studyDayStart(at);
    const row = db
      .select({ n: sql<number>`count(DISTINCT ${reviewLogs.cardId})` })
      .from(reviewLogs)
      .where(
        and(
          gte(reviewLogs.reviewedAt, dayStart),
          eq(reviewLogs.scheduled, true),
          sql`NOT EXISTS (SELECT 1 FROM review_logs AS earlier
                WHERE earlier.card_id = ${reviewLogs.cardId}
                  AND earlier.scheduled = 1
                  AND earlier.reviewed_at < ${dayStart})`,
        ),
      )
      .all();
    return row[0]?.n ?? 0;
  };

  const countWhere = (condition: ReturnType<typeof and>) => {
    const rows = selectCount().where(and(eligible, condition)).all();
    return rows[0]?.n ?? 0;
  };

  return {
    async queueCandidates({ dailyNewLimit, sessionSize }) {
      const at = now();
      const remainingNew = remainingNewToday(dailyNewLimit, countIntroducedToday(at));
      const due = selectQueueRows()
        .where(and(eligible, dueCondition(at)))
        .orderBy(
          sql`CASE WHEN ${cards.state} = ${CardState.Review} THEN 1 ELSE 0 END`,
          asc(cards.due),
        )
        // Twice the session: the sibling rule may drop one card per word.
        .limit(sessionSize * 2)
        .all()
        .map(toQueueCard);
      const newCards =
        remainingNew === 0
          ? []
          : selectQueueRows()
              .where(and(eligible, eq(cards.state, CardState.New)))
              .orderBy(desc(words.createdAt), desc(cards.id))
              .limit(Math.min(remainingNew, sessionSize) * 2)
              .all()
              .map(toQueueCard);
      const reviewedToday = new Set(
        db
          .selectDistinct({ wordId: cards.wordId })
          .from(reviewLogs)
          .innerJoin(cards, eq(cards.id, reviewLogs.cardId))
          .where(and(gte(reviewLogs.reviewedAt, studyDayStart(at)), eq(reviewLogs.scheduled, true)))
          .all()
          .map((r) => r.wordId as WordId),
      );
      return { due, newCards, remainingNew, reviewedToday };
    },

    async todaySummary(dailyNewLimit) {
      const at = now();
      const dueCount = countWhere(dueCondition(at));
      const remainingNew = remainingNewToday(dailyNewLimit, countIntroducedToday(at));
      const newCount =
        remainingNew === 0 ? 0 : Math.min(remainingNew, countWhere(eq(cards.state, CardState.New)));

      let nextDueAt: EpochMs | null = null;
      if (dueCount === 0 && newCount === 0) {
        const rows = selectNextDue()
          .where(and(eligible, ne(cards.state, CardState.New)))
          .all();
        const nextScheduled = rows[0]?.next ?? null;
        // New cards wait for tomorrow's allowance.
        const hasNew = countWhere(eq(cards.state, CardState.New)) > 0;
        const tomorrow = hasNew ? nextStudyDayStart(at) : null;
        const candidates = [nextScheduled, tomorrow].filter((t): t is number => t !== null);
        nextDueAt = candidates.length > 0 ? Math.min(...candidates) : null;
      }
      return { dueCount, newCount, nextDueAt };
    },

    async introducedToday() {
      return countIntroducedToday(now());
    },

    async dueTomorrowCount() {
      const tomorrow = nextStudyDayStart(now());
      const dayAfter = nextStudyDayStart(tomorrow);
      return countWhere(
        and(ne(cards.state, CardState.New), gte(cards.due, tomorrow), lt(cards.due, dayAfter)),
      );
    },

    async startSession() {
      const id = newId() as SessionId;
      db.insert(sessions).values({ id, kind: 'review', startedAt: now() }).run();
      return id;
    },

    async endSession(id) {
      db.update(sessions).set({ endedAt: now() }).where(eq(sessions.id, id)).run();
    },

    async answer({ cardId, sessionId, rating, durationMs }, schedule) {
      const at = now();
      return db.transaction((tx) => {
        const row = tx.select().from(cards).where(eq(cards.id, cardId)).get();
        if (!row) throw new Error(`Card not found: ${cardId}`);
        const prev = scheduleOf(toCard(row));
        const next = schedule(prev);
        const logId = newId() as ReviewLogId;
        tx.insert(reviewLogs)
          .values({
            id: logId,
            cardId,
            sessionId,
            reviewedAt: at,
            rating,
            mode: 'flashcard',
            scheduled: true,
            durationMs,
            prevCard: JSON.stringify(prev),
          })
          .run();
        const updated = tx
          .update(cards)
          .set({ ...scheduleOf(next), updatedAt: at })
          .where(eq(cards.id, cardId))
          .returning()
          .get();
        if (!updated) throw new Error(`Card not found: ${cardId}`);
        return { logId, card: toCard(updated) };
      });
    },

    async undoAnswer(logId) {
      const at = now();
      return db.transaction((tx) => {
        const log = tx.select().from(reviewLogs).where(eq(reviewLogs.id, logId)).get();
        if (!log?.prevCard) throw new Error(`Review log cannot be undone: ${logId}`);
        const prev = JSON.parse(log.prevCard) as CardSchedule;
        const restored = tx
          .update(cards)
          .set({ ...scheduleOf(prev), updatedAt: at })
          .where(eq(cards.id, log.cardId))
          .returning()
          .get();
        if (!restored) throw new Error(`Card not found: ${log.cardId}`);
        tx.delete(reviewLogs).where(eq(reviewLogs.id, logId)).run();
        return toCard(restored);
      });
    },
  };
}
