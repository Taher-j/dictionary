/** @jest-environment node */
import { reviewLogs } from '@/data/db/schema';
import { createTestContext, type TestContext } from '@/data/testing/testDatabase';
import {
  CardState,
  type Card,
  type Dictionary,
  type Rating,
  type SessionId,
} from '@/domain/models';
import { buildQueue } from '@/domain/queue';
import { createScheduler } from '@/domain/scheduler';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const scheduler = createScheduler({ enableFuzz: false });

/** Starts at 09:00 local time, so the study day (04:00 rollover) is easy to reason about. */
async function setup(): Promise<TestContext & { de: Dictionary; session: SessionId }> {
  const ctx = createTestContext(new Date(2026, 9, 6, 9, 0).getTime());
  const de = await ctx.repos.dictionaries.create({ name: 'German' });
  const session = await ctx.repos.reviews.startSession();
  return { ...ctx, de, session };
}

async function addWord(ctx: TestContext, dictionary: Dictionary, term: string) {
  const word = await ctx.repos.words.create({
    dictionaryId: dictionary.id,
    term,
    translation: `${term} meaning`,
  });
  const [card] = await ctx.repos.cards.listForWord(word.id);
  if (!card) throw new Error('expected a card');
  return { word, card };
}

async function rate(ctx: TestContext & { session: SessionId }, card: Card, rating: Rating) {
  const now = ctx.time();
  return ctx.repos.reviews.answer(
    { cardId: card.id, sessionId: ctx.session, rating, durationMs: 1000 },
    (prev) => scheduler.apply(prev, rating, now),
  );
}

const limits = { dailyNewLimit: 10, sessionSize: 20 };

describe('ReviewRepository.queueCandidates', () => {
  it('never offers suspended, deleted, incomplete or excluded cards', async () => {
    const ctx = await setup();
    const { repos, de } = ctx;
    const keep = await addWord(ctx, de, 'keep');
    const suspended = await addWord(ctx, de, 'suspended');
    await repos.cards.setSuspendedForWord(suspended.word.id, true);
    const deleted = await addWord(ctx, de, 'deleted');
    await repos.words.softDelete([deleted.word.id]);
    const emptied = await addWord(ctx, de, 'emptied');
    await repos.words.update(emptied.word.id, { translation: null });

    const goneDictionary = await repos.dictionaries.create({ name: 'Gone' });
    await addWord(ctx, goneDictionary, 'in deleted dictionary');
    await repos.dictionaries.softDelete(goneDictionary.id);
    const excluded = await repos.dictionaries.create({ name: 'Excluded', inDailyReview: false });
    await addWord(ctx, excluded, 'not in daily review');

    const { newCards, due } = await repos.reviews.queueCandidates(limits);
    expect(due).toEqual([]);
    expect(newCards.map((c) => c.cardId)).toEqual([keep.card.id]);
  });

  it('offers review cards due before the next rollover and learning cards due by now', async () => {
    const ctx = await setup();
    const { repos, de, tick } = ctx;
    const tonight = await addWord(ctx, de, 'tonight');
    const learning = await addWord(ctx, de, 'learning');

    // Easy on a new card: review state, due in a few days. Then move "now" to that day's morning.
    const { card: reviewed } = await rate(ctx, tonight.card, 4);
    expect(reviewed.state).toBe(CardState.Review);
    const { card: inLearning } = await rate(ctx, learning.card, 3);
    expect(inLearning.state).toBe(CardState.Learning);

    // 08:00 on the due day of the review card (it is due at 09:00).
    tick(reviewed.due - ctx.time() - HOUR);
    const due = (await repos.reviews.queueCandidates(limits)).due.map((c) => c.cardId);
    expect(due).toEqual([learning.card.id, tonight.card.id]);
  });

  it('respects the daily new limit across two sessions in one study day', async () => {
    const ctx = await setup();
    const { repos, de, tick } = ctx;
    for (const term of ['a', 'b', 'c', 'd', 'e']) await addWord(ctx, de, term);
    const dailyNewLimit = 3;

    // Candidates may run past the limit (the sibling rule can drop some); the queue cuts them.
    const first = await repos.reviews.queueCandidates({ dailyNewLimit, sessionSize: 20 });
    const firstQueue = buildQueue({ ...first, sessionSize: 20 });
    expect(firstQueue).toHaveLength(3);
    for (const candidate of firstQueue) {
      const card = await repos.cards.getById(candidate.cardId);
      if (card) await rate(ctx, card, 4);
    }

    tick(2 * HOUR);
    const second = await repos.reviews.queueCandidates({ dailyNewLimit, sessionSize: 20 });
    expect(second.remainingNew).toBe(0);
    expect(second.newCards).toEqual([]);
    expect(await repos.reviews.introducedToday()).toBe(3);

    // 02:00 the next night is still the same study day; 04:00 starts a new one.
    tick(new Date(2026, 9, 7, 2, 0).getTime() - ctx.time());
    expect(
      (await repos.reviews.queueCandidates({ dailyNewLimit, sessionSize: 20 })).remainingNew,
    ).toBe(0);
    tick(2 * HOUR);
    const nextDay = await repos.reviews.queueCandidates({ dailyNewLimit, sessionSize: 20 });
    expect(buildQueue({ ...nextDay, sessionSize: 20 }).filter((c) => c.state === 0)).toHaveLength(
      2,
    );
  });

  it('caps the queue at the session size', async () => {
    const ctx = await setup();
    for (let i = 0; i < 25; i += 1) await addWord(ctx, ctx.de, `word ${i}`);
    const candidates = await ctx.repos.reviews.queueCandidates({
      dailyNewLimit: 30,
      sessionSize: 20,
    });
    expect(buildQueue({ ...candidates, sessionSize: 20 })).toHaveLength(20);
  });
});

describe('ReviewRepository.answer and undoAnswer', () => {
  it('writes the log with the previous card and the new state in one step', async () => {
    const ctx = await setup();
    const { card } = await addWord(ctx, ctx.de, 'Haus');
    const { logId, card: after } = await rate(ctx, card, 3);
    expect(after).toMatchObject({ state: CardState.Learning, reps: 1, lastReview: ctx.time() });

    const [log] = await ctx.repos.reviewLogs.listForCard(card.id);
    expect(log).toMatchObject({
      id: logId,
      rating: 3,
      scheduled: true,
      mode: 'flashcard',
      sessionId: ctx.session,
      prevCard: { state: CardState.New, reps: 0, due: card.due },
    });
  });

  it('writes nothing when scheduling fails', async () => {
    const ctx = await setup();
    const { card } = await addWord(ctx, ctx.de, 'Haus');
    await expect(
      ctx.repos.reviews.answer(
        { cardId: card.id, sessionId: ctx.session, rating: 3, durationMs: null },
        () => {
          throw new Error('boom');
        },
      ),
    ).rejects.toThrow('boom');
    expect(await ctx.repos.reviewLogs.listForCard(card.id)).toEqual([]);
    expect(await ctx.repos.cards.getById(card.id)).toEqual(card);
  });

  it('undo restores the exact previous card state and removes the log row', async () => {
    const ctx = await setup();
    const { card } = await addWord(ctx, ctx.de, 'Haus');
    await rate(ctx, card, 4);
    ctx.tick(5 * DAY);
    const before = await ctx.repos.cards.getById(card.id);
    if (!before) throw new Error('expected the card');

    ctx.tick(MIN);
    const { logId } = await rate(ctx, before, 1);
    const restored = await ctx.repos.reviews.undoAnswer(logId);

    const { updatedAt: _ignored, ...schedule } = before;
    expect(restored).toMatchObject(schedule);
    const logs = await ctx.repos.reviewLogs.listForCard(card.id);
    expect(logs.map((l) => l.id)).not.toContain(logId);
    expect(logs).toHaveLength(1);
    expect(ctx.db.select().from(reviewLogs).all()).toHaveLength(1);
  });
});

describe('ReviewRepository.todaySummary', () => {
  it('counts due and new cards and says when the next card is due', async () => {
    const ctx = await setup();
    const { repos, de } = ctx;
    const first = await addWord(ctx, de, 'one');
    await addWord(ctx, de, 'two');
    await addWord(ctx, de, 'three');

    expect(await repos.reviews.todaySummary(2)).toEqual({
      dueCount: 0,
      newCount: 2,
      nextDueAt: null,
    });

    const { card } = await rate(ctx, first.card, 3);
    // The learning card is due in 10 minutes; one new card is left in today's allowance.
    expect(await repos.reviews.todaySummary(2)).toEqual({
      dueCount: 0,
      newCount: 1,
      nextDueAt: null,
    });
    expect(await repos.reviews.todaySummary(1)).toEqual({
      dueCount: 0,
      newCount: 0,
      nextDueAt: card.due,
    });
  });
});

describe('both directions', () => {
  it('turning it on adds a recall card to every word with a meaning; new words get both', async () => {
    const ctx = await setup();
    const { repos, de } = ctx;
    const haus = await addWord(ctx, de, 'Haus');
    await repos.words.create({ dictionaryId: de.id, term: 'leer' }); // no meaning, no cards
    await repos.dictionaries.update(de.id, { bothDirections: true });
    expect((await repos.cards.listForWord(haus.word.id)).map((c) => c.direction).sort()).toEqual([
      'recall',
      'recognition',
    ]);
    const baum = await addWord(ctx, de, 'Baum');
    expect(await repos.cards.listForWord(baum.word.id)).toHaveLength(2);
    // Turning it on again adds nothing.
    await repos.dictionaries.update(de.id, { bothDirections: true });
    expect(await repos.cards.listForWord(haus.word.id)).toHaveLength(2);
  });

  it('turning it off hides recall cards from queues and keeps them', async () => {
    const ctx = await setup();
    const { repos, de } = ctx;
    await repos.dictionaries.update(de.id, { bothDirections: true });
    const haus = await addWord(ctx, de, 'Haus');
    const limits = { dailyNewLimit: 10, sessionSize: 20 };
    expect(
      (await repos.reviews.queueCandidates(limits)).newCards.map((c) => c.direction).sort(),
    ).toEqual(['recall', 'recognition']);

    await repos.dictionaries.update(de.id, { bothDirections: false });
    const off = await repos.reviews.queueCandidates(limits);
    expect(off.newCards.map((c) => c.direction)).toEqual(['recognition']);
    expect(await repos.cards.listForWord(haus.word.id)).toHaveLength(2);
    expect((await repos.reviews.todaySummary(10)).newCount).toBe(1);
  });

  it('reports words reviewed this study day for the sibling rule', async () => {
    const ctx = await setup();
    const { repos, de } = ctx;
    await repos.dictionaries.update(de.id, { bothDirections: true });
    const haus = await addWord(ctx, de, 'Haus');
    const recognition = (await repos.cards.listForWord(haus.word.id)).find(
      (c) => c.direction === 'recognition',
    );
    if (!recognition) throw new Error('expected a card');
    await rate(ctx, recognition, 1);
    const candidates = await repos.reviews.queueCandidates({ dailyNewLimit: 10, sessionSize: 20 });
    expect([...candidates.reviewedToday]).toEqual([haus.word.id]);
    // The recall card waits: one card per word per study day.
    const queue = buildQueue({ ...candidates, sessionSize: 20 });
    expect(queue.map((c) => c.direction)).toEqual([]);
  });
});
