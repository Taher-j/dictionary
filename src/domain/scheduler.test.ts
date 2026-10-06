import { CardState, type Rating } from '@/domain/models';
import { createScheduler, RATINGS } from '@/domain/scheduler';

const DAY = 24 * 60 * 60 * 1000;
const start = new Date(2026, 0, 5, 9, 0).getTime();

describe('scheduler', () => {
  it('produces strictly growing intervals over a simulated 60-day history of mostly Good', () => {
    const scheduler = createScheduler();
    let card = scheduler.newCard(start);
    let now = start;
    const intervals: number[] = [];
    // Mostly Good with an occasional Hard; every review happens when the card is due.
    for (let i = 0; now < start + 60 * DAY; i += 1) {
      const rating: Rating = i % 4 === 3 ? 2 : 3;
      card = scheduler.apply(card, rating, now);
      intervals.push(card.due - now);
      now = card.due;
    }
    // Learning step (10 min), then 2, 11, 36 and 95 days with the default parameters.
    expect(intervals.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < intervals.length; i += 1) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1] as number);
    }
    expect(intervals.at(-1)).toBeGreaterThan(30 * DAY);
  });

  it('moves a review card to relearning on Again and counts a lapse', () => {
    const scheduler = createScheduler();
    let card = scheduler.newCard(start);
    let now = start;
    while (card.state !== CardState.Review) {
      card = scheduler.apply(card, 3, now);
      now = card.due;
    }
    const lapses = card.lapses;
    const after = scheduler.apply(card, 1, now);
    expect(after.state).toBe(CardState.Relearning);
    expect(after.lapses).toBe(lapses + 1);
  });

  it('follows the learning steps of 1 and 10 minutes for a new card', () => {
    const scheduler = createScheduler();
    const preview = scheduler.preview(scheduler.newCard(start), start);
    expect(preview[1].intervalMs).toBe(60 * 1000);
    expect(preview[3].intervalMs).toBe(10 * 60 * 1000);
    expect(preview[4].intervalMs).toBeGreaterThanOrEqual(DAY);
  });

  it('previews every rating with the same result apply gives', () => {
    const scheduler = createScheduler();
    const card = scheduler.apply(scheduler.newCard(start), 4, start);
    const now = card.due + DAY;
    const preview = scheduler.preview(card, now);
    for (const rating of RATINGS) {
      expect(scheduler.apply(card, rating, now).due).toBe(preview[rating].due);
    }
  });

  it('round-trips the card state without losing fields', () => {
    const scheduler = createScheduler();
    const card = scheduler.apply(scheduler.newCard(start), 3, start);
    expect(card).toEqual({
      state: CardState.Learning,
      due: start + 10 * 60 * 1000,
      stability: expect.any(Number),
      difficulty: expect.any(Number),
      scheduledDays: 0,
      learningSteps: 1,
      reps: 1,
      lapses: 0,
      lastReview: start,
    });
  });
});
