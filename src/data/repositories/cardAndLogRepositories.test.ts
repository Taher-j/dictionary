/** @jest-environment node */
import { createTestContext } from '@/data/testing/testDatabase';
import { CardState, type CardSchedule } from '@/domain/models';

async function setup() {
  const ctx = createTestContext();
  const dictionary = await ctx.repos.dictionaries.create({ name: 'German' });
  const word = await ctx.repos.words.create({
    dictionaryId: dictionary.id,
    term: 'Haus',
    translation: 'house',
  });
  const [card] = await ctx.repos.cards.listForWord(word.id);
  if (!card) throw new Error('expected a card');
  return { ...ctx, card };
}

describe('CardRepository', () => {
  it('replaces the schedule and bumps updated_at', async () => {
    const { repos, card, tick } = await setup();
    const at = tick(60_000);
    const schedule: CardSchedule = {
      state: CardState.Review,
      due: at + 86_400_000,
      stability: 3.2,
      difficulty: 5.1,
      scheduledDays: 1,
      learningSteps: 0,
      reps: 1,
      lapses: 0,
      lastReview: at,
    };
    const updated = await repos.cards.updateSchedule(card.id, schedule);
    expect(updated).toMatchObject({ ...schedule, updatedAt: at, suspended: false });
    expect(await repos.cards.getById(card.id)).toEqual(updated);
  });

  it('suspends and resumes', async () => {
    const { repos, card } = await setup();
    expect((await repos.cards.setSuspended(card.id, true)).suspended).toBe(true);
    expect((await repos.cards.setSuspended(card.id, false)).suspended).toBe(false);
  });
});

describe('ReviewLogRepository', () => {
  it('appends logs and lists them oldest first with the previous card parsed', async () => {
    const { repos, card, time, tick } = await setup();
    const { id: _id, wordId: _w, direction: _d, suspended: _s, updatedAt: _u, ...prevCard } = card;

    const first = await repos.reviewLogs.append({
      cardId: card.id,
      sessionId: null,
      reviewedAt: time(),
      rating: 3,
      mode: 'flashcard',
      scheduled: true,
      durationMs: 4200,
      prevCard,
    });
    tick();
    await repos.reviewLogs.append({
      cardId: card.id,
      sessionId: null,
      reviewedAt: time(),
      rating: 1,
      mode: 'flashcard',
      scheduled: false,
      durationMs: null,
      prevCard: null,
    });

    const logs = await repos.reviewLogs.listForCard(card.id);
    expect(logs.map((l) => l.rating)).toEqual([3, 1]);
    expect(logs[0]).toEqual(first);
    expect(logs[0]?.prevCard).toEqual(prevCard);
    expect(logs[1]?.scheduled).toBe(false);
  });
});

describe('SettingsRepository', () => {
  it('returns defaults until a value is written', async () => {
    const { repos } = await setup();
    expect(await repos.settings.get('dailyNewLimit')).toBe(10);
    await repos.settings.set('dailyNewLimit', 15);
    await repos.settings.set('theme', 'dark');
    await repos.settings.set('theme', 'light');
    expect(await repos.settings.get('dailyNewLimit')).toBe(15);
    expect(await repos.settings.getAll()).toMatchObject({
      dailyNewLimit: 15,
      theme: 'light',
      sessionSize: 20,
      lastBackupAt: null,
    });
  });
});

describe('SettingsRepository lastDictionaryId', () => {
  it('stores the last used dictionary', async () => {
    const { repos } = await setup();
    const [dictionary] = await repos.dictionaries.list();
    expect(await repos.settings.get('lastDictionaryId')).toBeNull();
    if (!dictionary) throw new Error('expected a dictionary');
    await repos.settings.set('lastDictionaryId', dictionary.id);
    expect(await repos.settings.get('lastDictionaryId')).toBe(dictionary.id);
  });
});
