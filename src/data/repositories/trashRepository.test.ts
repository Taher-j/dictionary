/** @jest-environment node */
import { createTestContext } from '@/data/testing/testDatabase';
import type { TrashCursor } from '@/domain/models';
import { purgeCutoff } from '@/domain/trash';

const DAY = 86_400_000;

async function setup() {
  const ctx = createTestContext();
  const de = await ctx.repos.dictionaries.create({ name: 'German' });
  return { ...ctx, de };
}

describe('TrashRepository', () => {
  it('lists trashed words newest first in pages, without words of trashed dictionaries', async () => {
    const { repos, de, tick } = await setup();
    const other = await repos.dictionaries.create({ name: 'Gone' });
    await repos.words.create({ dictionaryId: other.id, term: 'hidden' });
    await repos.dictionaries.softDelete(other.id);

    const ids = [];
    for (let i = 0; i < 5; i++) {
      const w = await repos.words.create({ dictionaryId: de.id, term: `w${i}` });
      tick();
      await repos.words.softDelete([w.id]);
      ids.push(w.id);
    }
    const seen: string[] = [];
    let cursor: TrashCursor | null = null;
    do {
      const page = await repos.trash.listWords(cursor, 2);
      seen.push(...page.items.map((w) => w.term));
      expect(page.items.every((w) => w.dictionaryName === 'German')).toBe(true);
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toEqual(['w4', 'w3', 'w2', 'w1', 'w0']);
  });

  it('purges words and dictionaries trashed before the cutoff, with everything attached', async () => {
    const { repos, de, sqlite, tick, time } = await setup();
    const old = await repos.words.create({ dictionaryId: de.id, term: 'alt', translation: 'old' });
    const [card] = await repos.cards.listForWord(old.id);
    if (!card) throw new Error('expected a card');
    await repos.reviewLogs.append({
      cardId: card.id,
      sessionId: null,
      reviewedAt: time(),
      rating: 3,
      mode: 'flashcard',
      scheduled: true,
      durationMs: null,
      prevCard: null,
    });
    const tag = await repos.tags.getOrCreate('a1');
    await repos.tags.setWordTags(old.id, [tag.id]);
    await repos.words.softDelete([old.id]);

    const gone = await repos.dictionaries.create({ name: 'Gone' });
    await repos.words.create({ dictionaryId: gone.id, term: 'weg', translation: 'away' });
    await repos.dictionaries.softDelete(gone.id);

    tick(31 * DAY);
    const recent = await repos.words.create({
      dictionaryId: de.id,
      term: 'neu',
      translation: 'new',
    });
    await repos.words.softDelete([recent.id]);
    const kept = await repos.words.create({
      dictionaryId: de.id,
      term: 'bleibt',
      translation: 'stays',
    });

    expect(await repos.trash.purge(purgeCutoff(time()))).toBe(2);

    const count = (table: string) =>
      (sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
    expect(count('words')).toBe(2); // recent (still in trash) and kept
    expect(count('cards')).toBe(2);
    expect(count('review_logs')).toBe(0);
    expect(count('word_tags')).toBe(0);
    expect(count('words_fts')).toBe(2);
    expect((await repos.dictionaries.listDeleted()).map((d) => d.name)).toEqual([]);
    expect((await repos.trash.listWords()).items.map((w) => w.term)).toEqual(['neu']);
    expect(await repos.words.getById(kept.id)).not.toBeNull();
    expect(await repos.words.search('away')).toEqual([]);
  });
});
