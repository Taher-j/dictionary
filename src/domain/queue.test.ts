import { CardState, type CardId, type CardStateValue, type WordId } from '@/domain/models';
import {
  buildQueue,
  estimateMinutes,
  isDue,
  remainingNewToday,
  type QueueCard,
} from '@/domain/queue';

const now = new Date(2026, 9, 6, 9, 0).getTime();
const MIN = 60 * 1000;

let seq = 0;
function card(state: CardStateValue, due: number, wordCreatedAt = 0): QueueCard {
  seq += 1;
  return {
    cardId: `c${seq}` as CardId,
    wordId: `w${seq}` as WordId,
    state,
    due,
    wordCreatedAt,
  };
}

const ids = (queue: QueueCard[]) => queue.map((c) => c.cardId);

describe('isDue', () => {
  it('uses minute precision for learning cards and the study day for review cards', () => {
    expect(isDue(card(CardState.Learning, now + MIN), now)).toBe(false);
    expect(isDue(card(CardState.Relearning, now), now)).toBe(true);
    // Due tonight at 21:00: already due this morning.
    expect(isDue(card(CardState.Review, new Date(2026, 9, 6, 21, 0).getTime()), now)).toBe(true);
    // Due tomorrow after the 04:00 rollover: not yet.
    expect(isDue(card(CardState.Review, new Date(2026, 9, 7, 5, 0).getTime()), now)).toBe(false);
    expect(isDue(card(CardState.New, 0), now)).toBe(false);
  });
});

describe('buildQueue', () => {
  it('puts learning cards first, then reviews by due date', () => {
    const review2 = card(CardState.Review, now - 2 * MIN);
    const review1 = card(CardState.Review, now - 10 * MIN);
    const learning = card(CardState.Learning, now - MIN);
    const queue = buildQueue({
      due: [review2, review1, learning],
      newCards: [],
      remainingNew: 10,
      sessionSize: 20,
    });
    expect(ids(queue)).toEqual(ids([learning, review1, review2]));
  });

  it('adds new cards newest first, one after every four reviews', () => {
    const reviews = Array.from({ length: 8 }, (_, i) =>
      card(CardState.Review, now - (8 - i) * MIN),
    );
    const older = card(CardState.New, now, 100);
    const newer = card(CardState.New, now, 200);
    const newest = card(CardState.New, now, 300);
    const queue = buildQueue({
      due: reviews,
      newCards: [older, newest, newer],
      remainingNew: 10,
      sessionSize: 20,
    });
    expect(ids(queue)).toEqual(
      ids([...reviews.slice(0, 4), newest, ...reviews.slice(4), newer, older]),
    );
  });

  it('respects the remaining new-card allowance and the session size', () => {
    const reviews = Array.from({ length: 30 }, (_, i) => card(CardState.Review, now - i));
    const fresh = Array.from({ length: 10 }, (_, i) => card(CardState.New, now, i));
    const queue = buildQueue({ due: reviews, newCards: fresh, remainingNew: 2, sessionSize: 20 });
    expect(queue).toHaveLength(20);
    expect(queue.filter((c) => c.state === CardState.New)).toHaveLength(2);

    expect(buildQueue({ due: [], newCards: fresh, remainingNew: 0, sessionSize: 20 })).toHaveLength(
      0,
    );
  });
});

describe('daily new limit', () => {
  it('subtracts the cards introduced earlier in the study day', () => {
    expect(remainingNewToday(10, 0)).toBe(10);
    expect(remainingNewToday(10, 7)).toBe(3);
    expect(remainingNewToday(10, 12)).toBe(0);
  });
});

describe('estimateMinutes', () => {
  it('rounds up at ten seconds per card', () => {
    expect(estimateMinutes(0)).toBe(0);
    expect(estimateMinutes(1)).toBe(1);
    expect(estimateMinutes(12)).toBe(2);
    expect(estimateMinutes(20)).toBe(4);
  });
});
