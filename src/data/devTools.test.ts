/** @jest-environment node */
import { createDevTools } from '@/data/devTools';
import { cards } from '@/data/db/schema';
import { toCard } from '@/data/repositories/cardRepository';
import { CardState } from '@/domain/models';
import { createScheduler } from '@/domain/scheduler';
import { createIdGenerator } from '@/lib/ids';
import { createTestContext } from '@/data/testing/testDatabase';

function setup() {
  const ctx = createTestContext();
  let n = 0;
  const newId = createIdGenerator({
    now: ctx.time,
    randomBytes: (length) => {
      n += 1;
      const bytes = new Uint8Array(length);
      new DataView(bytes.buffer).setUint32(length - 4, n + 1_000_000);
      return bytes;
    },
  });
  const devTools = createDevTools({ db: ctx.db, now: ctx.time, newId }, ctx.repos, () => 0);
  return { ...ctx, devTools };
}

describe('devTools', () => {
  it('seeds words, cards and review logs, benchmarks, and wipes', async () => {
    const { devTools, repos, db, time } = setup();
    const progress: string[] = [];
    await devTools.seed({ words: 1200, reviewLogs: 1100, meaningRatio: 0.5 }, (p) =>
      progress.push(`${p.phase}:${p.done}`),
    );

    const counts = await devTools.counts();
    expect(counts).toMatchObject({ dictionaries: 1, words: 1200, reviewLogs: 1100 });
    expect(counts.cards).toBeGreaterThan(400);
    expect(counts.cards).toBeLessThan(1000); // recognition for every word with a meaning, recall for about half
    expect(progress).toEqual([
      'words:500',
      'words:1000',
      'words:1200',
      'reviewLogs:500',
      'reviewLogs:1000',
      'reviewLogs:1100',
    ]);

    // Seeded rows are readable through the repositories.
    const [dictionary] = await repos.dictionaries.list();
    const page = await repos.words.list({ dictionaryId: dictionary?.id, sort: 'alpha' });
    expect(page.items).toHaveLength(50);

    // Seeded cards hold a memory state the scheduler accepts.
    const scheduler = createScheduler();
    const rows = db.select().from(cards).all();
    expect(rows.some((row) => row.state === CardState.Learning)).toBe(true);
    for (const row of rows) {
      expect(() => scheduler.preview(toCard(row), time())).not.toThrow();
    }

    // Seeded words carry tags; a rare tag still has some words.
    const tags = await repos.tags.listWithCounts();
    expect(tags.map((tag) => tag.name)).toEqual([
      'B1',
      'food',
      'idioms',
      'nouns',
      'travel',
      'verbs',
    ]);
    expect(tags.find((tag) => tag.name === 'B1')?.wordCount).toBeGreaterThan(150);

    const results = await devTools.benchmark(3);
    expect(results.map((r) => r.name)).toHaveLength(12);
    expect(results[0]?.rows).toBe(50);

    await devTools.wipe();
    expect(await devTools.counts()).toEqual({ dictionaries: 0, words: 0, cards: 0, reviewLogs: 0 });
  });
});

describe('devTools.removeSeed', () => {
  it('removes the seed dictionary and unused seed tags, and keeps everything else', async () => {
    const { devTools, repos } = setup();
    const mine = await repos.dictionaries.create({ name: 'Mine' });
    const word = await repos.words.create({
      dictionaryId: mine.id,
      term: 'Haus',
      translation: 'house',
    });
    const verbs = await repos.tags.getOrCreate('verbs'); // a seed tag name, used by my word
    await repos.tags.setWordTags(word.id, [verbs.id]);
    await devTools.seed({ words: 300, reviewLogs: 200, meaningRatio: 0.9 });

    expect(await devTools.removeSeed()).toBe(300);
    expect(await devTools.counts()).toEqual({ dictionaries: 1, words: 1, cards: 1, reviewLogs: 0 });
    expect((await repos.tags.list()).map((t) => t.name)).toEqual(['verbs']);
    expect((await repos.words.search('house')).map((w) => w.term)).toEqual(['Haus']);
    expect(await devTools.removeSeed()).toBe(0);
  });
});

describe('devTools.createGermanEnglish', () => {
  it('creates 150 tagged words in both directions, once', async () => {
    const { devTools, repos } = setup();
    expect(await devTools.createGermanEnglish()).toBe(150);
    expect(await devTools.createGermanEnglish()).toBe(0);
    const [dictionary] = await repos.dictionaries.list();
    expect(dictionary).toMatchObject({
      name: 'German – English',
      termLang: 'de',
      meaningLang: 'en',
      bothDirections: true,
    });
    expect((await repos.tags.listWithCounts()).map((t) => [t.name, t.wordCount])).toEqual([
      ['adjective', 40],
      ['verb', 50],
      ['word', 60],
    ]);
    const [strasse] = await repos.words.search('die Straße');
    expect(strasse).toMatchObject({ term: 'die Straße', translation: 'street / road' });
    expect(await devTools.counts()).toMatchObject({ words: 150, cards: 300 });
  });
});
