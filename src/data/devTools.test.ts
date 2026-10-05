/** @jest-environment node */
import { createDevTools } from '@/data/devTools';
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
    const { devTools, repos } = setup();
    const progress: string[] = [];
    await devTools.seed({ words: 1200, reviewLogs: 1100, meaningRatio: 0.5 }, (p) =>
      progress.push(`${p.phase}:${p.done}`),
    );

    const counts = await devTools.counts();
    expect(counts).toMatchObject({ dictionaries: 1, words: 1200, reviewLogs: 1100 });
    expect(counts.cards).toBeGreaterThan(400);
    expect(counts.cards).toBeLessThan(800);
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

    const results = await devTools.benchmark(3);
    expect(results.map((r) => r.name)).toHaveLength(6);
    expect(results[0]?.rows).toBe(50);

    await devTools.wipe();
    expect(await devTools.counts()).toEqual({ dictionaries: 0, words: 0, cards: 0, reviewLogs: 0 });
  });
});
