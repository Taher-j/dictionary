import {
  CardState,
  type CardId,
  type CardStateValue,
  type EpochMs,
  type WordId,
} from '@/domain/models';
import { nextStudyDayStart } from '@/domain/studyDay';

/** One card waiting in a review queue. */
export interface QueueCard {
  cardId: CardId;
  wordId: WordId;
  state: CardStateValue;
  due: EpochMs;
  wordCreatedAt: EpochMs;
}

/** A new card is shown after every this many review cards. */
export const NEW_CARD_EVERY = 4;

/** Rough time per card for the "about N min" estimate on Today. */
export const SECONDS_PER_CARD = 10;

export interface DueCutoffs {
  /** Learning and relearning cards are due when `due <= learning` (minute precision). */
  learning: EpochMs;
  /** Review cards are due when `due < review`: anything due before the next study day. */
  review: EpochMs;
}

export function dueCutoffs(now: EpochMs): DueCutoffs {
  return { learning: now, review: nextStudyDayStart(now) };
}

export function isDue(card: Pick<QueueCard, 'state' | 'due'>, now: EpochMs): boolean {
  const cutoffs = dueCutoffs(now);
  switch (card.state) {
    case CardState.New:
      return false;
    case CardState.Review:
      return card.due < cutoffs.review;
    default:
      return card.due <= cutoffs.learning;
  }
}

/** New cards still allowed today. */
export function remainingNewToday(dailyNewLimit: number, introducedToday: number): number {
  return Math.max(0, dailyNewLimit - introducedToday);
}

export interface BuildQueueInput {
  /** Due cards (filtered by the repository with the same rules as `isDue`). */
  due: readonly QueueCard[];
  /** New-card candidates; at most `remainingNew` of them are used. */
  newCards: readonly QueueCard[];
  remainingNew: number;
  sessionSize: number;
}

const isLearning = (card: QueueCard) =>
  card.state === CardState.Learning || card.state === CardState.Relearning;

/**
 * Session algorithm steps 1-3 (docs/04-learning-system.md): learning and relearning cards first,
 * then review cards by due date; new cards newest first, one after every four reviews; capped at
 * the session size.
 */
export function buildQueue({
  due,
  newCards,
  remainingNew,
  sessionSize,
}: BuildQueueInput): QueueCard[] {
  const reviews = [...due].sort((a, b) => {
    const learningFirst = Number(isLearning(b)) - Number(isLearning(a));
    return learningFirst !== 0 ? learningFirst : a.due - b.due;
  });
  const fresh = [...newCards]
    .sort((a, b) => b.wordCreatedAt - a.wordCreatedAt)
    .slice(0, Math.max(0, remainingNew));

  const queue: QueueCard[] = [];
  let newIndex = 0;
  reviews.forEach((card, index) => {
    queue.push(card);
    if ((index + 1) % NEW_CARD_EVERY === 0 && newIndex < fresh.length) {
      queue.push(fresh[newIndex] as QueueCard);
      newIndex += 1;
    }
  });
  queue.push(...fresh.slice(newIndex));
  return queue.slice(0, Math.max(0, sessionSize));
}

export function estimateMinutes(cardCount: number): number {
  return Math.ceil((cardCount * SECONDS_PER_CARD) / 60);
}
