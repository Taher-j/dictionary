import type { CardId, EpochMs, Rating, ReviewLogId, WordId } from '@/domain/models';

/** Cards due again within this time are shown again in the same session. */
export const REQUEUE_WINDOW_MS = 10 * 60 * 1000;

/** A requeued card comes back at least this many cards later. */
export const REQUEUE_GAP = 3;

export interface SessionCard {
  cardId: CardId;
  wordId: WordId;
}

interface LastAnswer {
  card: SessionCard;
  logId: ReviewLogId;
  rating: Rating;
  requeued: boolean;
  addedToMissed: boolean;
}

export interface SessionState {
  /** Cards still to show; the first one is on screen. */
  queue: SessionCard[];
  revealed: boolean;
  /** Answers given in this session (requeued repeats count again). */
  answered: number;
  /** Answers rated Good or Easy. */
  goodOrEasy: number;
  /** Cards rated Again at least once, in the order they were missed. */
  missed: SessionCard[];
  /** Only the last answer can be undone. */
  lastAnswer: LastAnswer | null;
}

export type SessionAction =
  | { type: 'reveal' }
  | {
      type: 'answered';
      logId: ReviewLogId;
      rating: Rating;
      /** The card's new due date, after the answer was saved. */
      due: EpochMs;
      now: EpochMs;
    }
  | { type: 'undone' }
  | { type: 'suspended'; wordId: WordId };

export function startSession(queue: readonly SessionCard[]): SessionState {
  return {
    queue: [...queue],
    revealed: false,
    answered: 0,
    goodOrEasy: 0,
    missed: [],
    lastAnswer: null,
  };
}

export function currentCard(state: SessionState): SessionCard | null {
  return state.queue[0] ?? null;
}

export function isFinished(state: SessionState): boolean {
  return state.queue.length === 0;
}

/** 0..1 for the progress bar. */
export function progress(state: SessionState): number {
  const total = state.answered + state.queue.length;
  return total === 0 ? 1 : state.answered / total;
}

const isGood = (rating: Rating) => rating === 3 || rating === 4;

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'reveal':
      return state.queue.length === 0 ? state : { ...state, revealed: true };

    case 'answered': {
      const [card, ...rest] = state.queue;
      if (!card) return state;
      const requeued = action.due - action.now <= REQUEUE_WINDOW_MS;
      const queue = requeued
        ? [...rest.slice(0, REQUEUE_GAP), card, ...rest.slice(REQUEUE_GAP)]
        : rest;
      const addedToMissed =
        action.rating === 1 && !state.missed.some((m) => m.cardId === card.cardId);
      return {
        queue,
        revealed: false,
        answered: state.answered + 1,
        goodOrEasy: state.goodOrEasy + (isGood(action.rating) ? 1 : 0),
        missed: addedToMissed ? [...state.missed, card] : state.missed,
        lastAnswer: { card, logId: action.logId, rating: action.rating, requeued, addedToMissed },
      };
    }

    case 'undone': {
      const last = state.lastAnswer;
      if (!last) return state;
      let queue = state.queue;
      if (last.requeued) {
        const index = queue.findIndex((c) => c.cardId === last.card.cardId);
        if (index >= 0) queue = [...queue.slice(0, index), ...queue.slice(index + 1)];
      }
      return {
        queue: [last.card, ...queue],
        revealed: false,
        answered: state.answered - 1,
        goodOrEasy: state.goodOrEasy - (isGood(last.rating) ? 1 : 0),
        missed: last.addedToMissed
          ? state.missed.filter((m) => m.cardId !== last.card.cardId)
          : state.missed,
        lastAnswer: null,
      };
    }

    case 'suspended':
      return {
        ...state,
        queue: state.queue.filter((c) => c.wordId !== action.wordId),
        revealed: false,
        // The last answer may belong to the suspended word; undoing it would bring it back.
        lastAnswer: null,
      };
  }
}
