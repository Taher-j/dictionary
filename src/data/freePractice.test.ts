/** @jest-environment node */
import { cards, reviewLogs } from '@/data/db/schema';
import { createTestContext } from '@/data/testing/testDatabase';
import { CardState, type Rating } from '@/domain/models';
import { createScheduler } from '@/domain/scheduler';

const scheduler = createScheduler({ enableFuzz: false });

async function setup() {
  const ctx = createTestContext(new Date(2026, 9, 7, 9).getTime());
  const { repos } = ctx;
  const de = await repos.dictionaries.create({ name: 'German', bothDirections: true });
  const en = await repos.dictionaries.create({ name: 'English' });
  const verbs = await repos.tags.getOrCreate('verbs');
  for (let i = 0; i < 12; i++) {
    const word = await repos.words.create({
      dictionaryId: i < 8 ? de.id : en.id,
      term: `w${i}`,
      translation: `m${i}`,
    });
    if (i % 2 === 0) await repos.tags.setWordTags(word.id, [verbs.id]);
    for (const card of await repos.cards.listForWord(word.id)) {
      await repos.cards.updateSchedule(card.id, {
        ...card,
        state: i % 3 === 0 ? CardState.Review : i % 3 === 1 ? CardState.Learning : CardState.New,
        due: ctx.time() + i * 3_600_000,
        stability: i % 3 === 2 ? 0 : 2 + i,
        difficulty: i % 3 === 2 ? 0 : 5,
        scheduledDays: i % 3 === 0 ? 4 : 0,
        reps: i % 3 === 2 ? 0 : 2,
        lapses: i === 4 ? 3 : 0,
        lastReview: i % 3 === 2 ? null : ctx.time() - 86_400_000,
      });
    }
  }
  return { ...ctx, de, en, verbs };
}

describe('free practice', () => {
  it("leaves every card's state and due date unchanged", async () => {
    const ctx = await setup();
    const { repos, db } = ctx;
    const before = db.select().from(cards).orderBy(cards.id).all();

    const session = await repos.reviews.startSession('practice', '{"source":{"kind":"weak"}}');
    const picked = await repos.reviews.practiceCandidates(
      { kind: 'dictionary', dictionaryId: ctx.de.id },
      50,
    );
    expect(picked.length).toBeGreaterThan(0);
    const ratings: Rating[] = [1, 2, 3, 4];
    const logIds = [];
    for (const [i, card] of picked.entries()) {
      ctx.tick(30_000);
      logIds.push(
        await repos.reviews.logPractice({
          cardId: card.cardId,
          sessionId: session,
          rating: ratings[i % 4] ?? 3,
          durationMs: 1000,
          mode: i % 2 === 0 ? 'choice' : 'typing',
        }),
      );
    }
    await repos.reviews.undoPractice(logIds[0] as never);
    await repos.reviews.endSession(session);

    expect(db.select().from(cards).orderBy(cards.id).all()).toEqual(before);
    const logs = db.select().from(reviewLogs).all();
    expect(logs).toHaveLength(picked.length - 1);
    expect(logs.every((l) => !l.scheduled && l.prevCard === null)).toBe(true);
    // Practice does not count as introducing new cards today.
    expect(await repos.reviews.introducedToday()).toBe(0);
  });

  it('draws from a dictionary, a tag or weak words, leaving out suspended cards', async () => {
    const ctx = await setup();
    const { repos, de, en, verbs } = ctx;
    const terms = async (cardIds: { wordId: string }[]) =>
      [
        ...new Set(
          await Promise.all(
            cardIds.map(async (c) => (await repos.words.getById(c.wordId as never))?.term),
          ),
        ),
      ].sort();

    // German has both directions: 8 words, 2 cards each. English: 4 words, recognition only.
    expect(
      await repos.reviews.practiceCandidates({ kind: 'dictionary', dictionaryId: de.id }, 50),
    ).toHaveLength(16);
    expect(
      await repos.reviews.practiceCandidates({ kind: 'dictionary', dictionaryId: en.id }, 50),
    ).toHaveLength(4);
    expect(
      await repos.reviews.practiceCandidates({ kind: 'dictionary', dictionaryId: de.id }, 5),
    ).toHaveLength(5);
    expect(
      await terms(await repos.reviews.practiceCandidates({ kind: 'tag', tagId: verbs.id }, 50)),
    ).toEqual(['w0', 'w10', 'w2', 'w4', 'w6', 'w8']);

    // Weak: w4 has 3 lapses; w1 gets two Again ratings in reviews.
    const session = await repos.reviews.startSession();
    const [w1card] = (
      await repos.cards.listForWord((await repos.words.search('w1'))[0]?.id as never)
    ).filter((c) => c.direction === 'recognition');
    if (!w1card) throw new Error('expected w1');
    for (let i = 0; i < 2; i++) {
      await repos.reviews.answer(
        { cardId: w1card.id, sessionId: session, rating: 1, durationMs: null },
        (prev) => scheduler.apply(prev, 1, ctx.time()),
      );
    }
    expect(await terms(await repos.reviews.practiceCandidates({ kind: 'weak' }, 50))).toEqual([
      'w1',
      'w4',
    ]);

    await repos.cards.setSuspendedForWord((await repos.words.search('w4'))[0]?.id as never, true);
    expect(await terms(await repos.reviews.practiceCandidates({ kind: 'weak' }, 50))).toEqual([
      'w1',
    ]);
  });
});
