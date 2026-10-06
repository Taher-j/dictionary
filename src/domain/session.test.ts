import type { CardId, Rating, ReviewLogId, WordId } from '@/domain/models';
import {
  currentCard,
  isFinished,
  progress,
  sessionReducer,
  startSession,
  type SessionCard,
  type SessionState,
} from '@/domain/session';

const now = 1_000_000;
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

const cards: SessionCard[] = ['a', 'b', 'c', 'd', 'e'].map((x) => ({
  cardId: `card-${x}` as CardId,
  wordId: `word-${x}` as WordId,
}));

const answer = (state: SessionState, rating: Rating, due: number, log = 'log') =>
  sessionReducer(state, { type: 'answered', logId: log as ReviewLogId, rating, due, now });

const order = (state: SessionState) => state.queue.map((c) => c.cardId.slice(5));

describe('sessionReducer', () => {
  it('reveals, then advances after an answer', () => {
    let state = sessionReducer(startSession(cards), { type: 'reveal' });
    expect(state.revealed).toBe(true);
    state = answer(state, 3, now + 3 * DAY);
    expect(state.revealed).toBe(false);
    expect(currentCard(state)?.cardId).toBe('card-b');
    expect(progress(state)).toBeCloseTo(1 / 5);
  });

  it('requeues a card due within ten minutes at least three cards later', () => {
    const state = answer(startSession(cards), 1, now + MIN);
    expect(order(state)).toEqual(['b', 'c', 'd', 'a', 'e']);
  });

  it('requeues at the end when fewer than three cards remain', () => {
    const state = answer(startSession(cards.slice(0, 3)), 3, now + 10 * MIN);
    expect(order(state)).toEqual(['b', 'c', 'a']);
  });

  it('does not requeue a card due later than ten minutes', () => {
    const state = answer(startSession(cards), 3, now + 10 * MIN + 1);
    expect(order(state)).toEqual(['b', 'c', 'd', 'e']);
  });

  it('records missed cards once and counts Good or Easy', () => {
    let state = answer(startSession(cards), 1, now + MIN);
    state = answer(state, 4, now + 4 * DAY);
    state = answer(state, 3, now + 3 * DAY);
    state = answer(state, 3, now + 3 * DAY);
    // card a comes back after b, c, d
    expect(currentCard(state)?.cardId).toBe('card-a');
    state = answer(state, 1, now + MIN);
    expect(state.missed.map((c) => c.cardId)).toEqual(['card-a']);
    expect(state.goodOrEasy).toBe(3);
  });

  it('undoes the last answer: the card returns to the front and its requeued copy goes', () => {
    const before = startSession(cards);
    const answered = answer(before, 1, now + MIN);
    const undone = sessionReducer(answered, { type: 'undone' });
    expect(order(undone)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(undone.answered).toBe(0);
    expect(undone.missed).toEqual([]);
    // Only the last answer can be undone.
    expect(sessionReducer(undone, { type: 'undone' })).toBe(undone);
  });

  it('removes every card of a suspended word', () => {
    const queue = [...cards, { cardId: 'card-a2' as CardId, wordId: 'word-a' as WordId }];
    const state = sessionReducer(startSession(queue), {
      type: 'suspended',
      wordId: 'word-a' as WordId,
    });
    expect(order(state)).toEqual(['b', 'c', 'd', 'e']);
  });

  it('finishes when the queue is empty', () => {
    let state = startSession(cards.slice(0, 1));
    expect(isFinished(state)).toBe(false);
    state = answer(state, 3, now + DAY);
    expect(isFinished(state)).toBe(true);
    expect(progress(state)).toBe(1);
  });
});
