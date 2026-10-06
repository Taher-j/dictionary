// The only file that imports ts-fsrs (docs/04-learning-system.md). Everything else works with
// CardSchedule; mapping to and from the ts-fsrs Card happens here.
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card as FsrsCard,
  type Grade,
} from 'ts-fsrs';

import type { CardSchedule, CardStateValue, EpochMs, Rating } from '@/domain/models';

export const RATINGS: readonly Rating[] = [1, 2, 3, 4];

export interface RatingPreview {
  due: EpochMs;
  /** Time from `now` until `due`. */
  intervalMs: number;
}

export interface Scheduler {
  newCard(now: EpochMs): CardSchedule;
  preview(card: CardSchedule, now: EpochMs): Record<Rating, RatingPreview>;
  apply(card: CardSchedule, rating: Rating, now: EpochMs): CardSchedule;
}

export interface SchedulerOptions {
  /** Target retention, 0.85-0.95 (V1 setting). */
  requestRetention?: number;
  enableFuzz?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toFsrsCard(card: CardSchedule, now: EpochMs): FsrsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    // Deprecated in ts-fsrs 5 (removed in 6) and not stored: derived from last_review.
    elapsed_days:
      card.lastReview === null ? 0 : Math.max(0, Math.floor((now - card.lastReview) / DAY_MS)),
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.lastReview === null ? undefined : new Date(card.lastReview),
  };
}

function fromFsrsCard(card: FsrsCard): CardSchedule {
  return {
    // ts-fsrs State has the same numeric values as CardState.
    state: card.state as number as CardStateValue,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.last_review ? card.last_review.getTime() : null,
  };
}

/** Defaults from docs/04-learning-system.md: retention 0.90, learning steps 1 and 10 min, fuzz on. */
export function createScheduler(options: SchedulerOptions = {}): Scheduler {
  const engine = fsrs(
    generatorParameters({
      request_retention: options.requestRetention ?? 0.9,
      learning_steps: ['1m', '10m'],
      enable_fuzz: options.enableFuzz ?? true,
    }),
  );

  return {
    newCard(now) {
      return fromFsrsCard(createEmptyCard(new Date(now)));
    },
    preview(card, now) {
      const log = engine.repeat(toFsrsCard(card, now), new Date(now));
      const result = {} as Record<Rating, RatingPreview>;
      for (const rating of RATINGS) {
        const due = log[rating as Grade].card.due.getTime();
        result[rating] = { due, intervalMs: Math.max(0, due - now) };
      }
      return result;
    },
    apply(card, rating, now) {
      return fromFsrsCard(engine.next(toFsrsCard(card, now), new Date(now), rating as Grade).card);
    },
  };
}
