/** @jest-environment node */
import { createTestContext, type TestContext } from '@/data/testing/testDatabase';
import { CardState, type Dictionary, type WordCursor, type WordQuery } from '@/domain/models';
import { termKeys } from '@/domain/termKeys';

async function setup(): Promise<TestContext & { de: Dictionary; en: Dictionary }> {
  const ctx = createTestContext();
  const de = await ctx.repos.dictionaries.create({ name: 'German' });
  const en = await ctx.repos.dictionaries.create({ name: 'English' });
  return { ...ctx, de, en };
}

async function allPages(ctx: TestContext, query: WordQuery) {
  const ids: string[] = [];
  let cursor: WordCursor | null = null;
  let pages = 0;
  do {
    const page = await ctx.repos.words.list(query, cursor);
    ids.push(...page.items.map((w) => w.id));
    cursor = page.nextCursor;
    pages += 1;
  } while (cursor && pages < 100);
  return { ids, pages };
}

describe('WordRepository.create', () => {
  it('trims input, stores term keys and blank details as null', async () => {
    const { repos, de } = await setup();
    const word = await repos.words.create({
      dictionaryId: de.id,
      term: '  Straße ',
      translation: ' street ',
      notes: '   ',
    });
    expect(word).toMatchObject({
      term: 'Straße',
      termNorm: 'straße',
      termFold: 'strasse',
      translation: 'street',
      notes: null,
      starred: false,
      deletedAt: null,
    });
  });

  it('rejects an empty term', async () => {
    const { repos, de } = await setup();
    await expect(repos.words.create({ dictionaryId: de.id, term: '  ' })).rejects.toThrow();
  });

  it('allows homonyms in the same dictionary', async () => {
    const { repos, de } = await setup();
    await repos.words.create({ dictionaryId: de.id, term: 'Bank', translation: 'bench' });
    await repos.words.create({ dictionaryId: de.id, term: 'Bank', translation: 'bank' });
    const page = await repos.words.list({ dictionaryId: de.id, sort: 'alpha' });
    expect(page.items).toHaveLength(2);
  });
});

describe('card lifecycle', () => {
  it('creates no card for an incomplete word', async () => {
    const { repos, de } = await setup();
    const word = await repos.words.create({ dictionaryId: de.id, term: 'Haus' });
    expect(await repos.cards.listForWord(word.id)).toEqual([]);
  });

  it('creates a new recognition card, due now, when a word has a meaning', async () => {
    const { repos, de, time } = await setup();
    const word = await repos.words.create({
      dictionaryId: de.id,
      term: 'Haus',
      definition: 'a building',
    });
    const cards = await repos.cards.listForWord(word.id);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      direction: 'recognition',
      state: CardState.New,
      due: time(),
      suspended: false,
    });
  });

  it('creates the card when a meaning is added and keeps it, untouched, when the meaning goes', async () => {
    const { repos, de, tick } = await setup();
    const word = await repos.words.create({ dictionaryId: de.id, term: 'Haus' });

    tick();
    await repos.words.update(word.id, { translation: 'house' });
    const [card] = await repos.cards.listForWord(word.id);
    expect(card?.suspended).toBe(false);

    tick();
    await repos.words.update(word.id, { translation: '' });
    expect(await repos.cards.listForWord(word.id)).toEqual([card]);
    const page = await repos.words.list({ dictionaryId: de.id, sort: 'alpha' });
    expect(page.items[0]?.status).toBe('incomplete');

    tick();
    await repos.words.update(word.id, { definition: 'a building' });
    expect(await repos.cards.listForWord(word.id)).toEqual([card]);
  });
});

describe('WordRepository.update', () => {
  it('recomputes keys when the term changes and bumps updated_at', async () => {
    const { repos, de, tick } = await setup();
    const word = await repos.words.create({ dictionaryId: de.id, term: 'schon' });
    const later = tick(5000);
    const updated = await repos.words.update(word.id, { term: 'Schön' });
    expect(updated).toMatchObject({ termNorm: 'schön', termFold: 'schon', updatedAt: later });
    expect(updated.createdAt).toBe(word.createdAt);
  });

  it('moves a word to another dictionary', async () => {
    const { repos, de, en } = await setup();
    const word = await repos.words.create({ dictionaryId: de.id, term: 'Haus' });
    await repos.words.update(word.id, { dictionaryId: en.id });
    expect((await repos.words.getById(word.id))?.dictionaryId).toBe(en.id);
  });

  it('fails for a deleted word', async () => {
    const { repos, de } = await setup();
    const word = await repos.words.create({ dictionaryId: de.id, term: 'Haus' });
    await repos.words.softDelete([word.id]);
    await expect(repos.words.update(word.id, { notes: 'x' })).rejects.toThrow();
  });
});

describe('soft delete and restore', () => {
  it('hides words from getById, list and search and brings them back unchanged', async () => {
    const { repos, de, tick } = await setup();
    const word = await repos.words.create({
      dictionaryId: de.id,
      term: 'Haus',
      translation: 'house',
    });
    const [card] = await repos.cards.listForWord(word.id);

    tick();
    await repos.words.softDelete([word.id]);
    expect(await repos.words.getById(word.id)).toBeNull();
    expect((await repos.words.list({ dictionaryId: de.id, sort: 'alpha' })).items).toEqual([]);
    expect(await repos.words.search('haus')).toEqual([]);

    tick();
    await repos.words.restore([word.id]);
    expect(await repos.words.getById(word.id)).toMatchObject({ term: 'Haus', deletedAt: null });
    expect(await repos.cards.listForWord(word.id)).toEqual([card]);
  });

  it('handles more ids than one statement can bind', async () => {
    const { repos, de } = await setup();
    const ids = [];
    for (let i = 0; i < 1200; i++) {
      ids.push((await repos.words.create({ dictionaryId: de.id, term: `w${i}` })).id);
    }
    await repos.words.softDelete(ids);
    expect((await repos.words.list({ dictionaryId: de.id, sort: 'alpha' })).items).toEqual([]);
  });
});

describe('WordRepository.list', () => {
  it('pages A-Z by term_fold without gaps or duplicates', async () => {
    const ctx = await setup();
    const terms = ['Zebra', 'apfel', 'Äpfel', 'Bank', 'bank', 'Ähre', 'Tür', 'tun'];
    for (let i = 0; i < 125; i++) terms.push(`wort ${String(i).padStart(3, '0')}`);
    for (const term of terms) await ctx.repos.words.create({ dictionaryId: ctx.de.id, term });
    await ctx.repos.words.create({ dictionaryId: ctx.en.id, term: 'other dictionary' });

    const { ids, pages } = await allPages(ctx, {
      dictionaryId: ctx.de.id,
      sort: 'alpha',
      limit: 50,
    });
    expect(pages).toBe(3);
    expect(ids).toHaveLength(terms.length);
    expect(new Set(ids).size).toBe(terms.length);

    const first = await ctx.repos.words.list({ dictionaryId: ctx.de.id, sort: 'alpha', limit: 6 });
    expect(first.items.map((w) => w.term)).toEqual(
      expect.arrayContaining(['apfel', 'Äpfel', 'Ähre', 'Bank', 'bank']),
    );
    const folds = first.items.map((w) => termKeys(w.term).fold);
    expect(folds).toEqual([...folds].sort());
  });

  it('pages most recent first, breaking ties on id', async () => {
    const ctx = await setup();
    for (let i = 0; i < 30; i++) {
      await ctx.repos.words.create({ dictionaryId: ctx.de.id, term: `w${i}` });
      if (i % 3 === 0) ctx.tick(); // several words share a timestamp
    }
    const { ids } = await allPages(ctx, { dictionaryId: ctx.de.id, sort: 'recent', limit: 7 });
    expect(ids).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    const first = await ctx.repos.words.list({ dictionaryId: ctx.de.id, sort: 'recent', limit: 1 });
    expect(first.items[0]?.term).toBe('w29');
  });

  it('lists across all dictionaries when none is given', async () => {
    const ctx = await setup();
    await ctx.repos.words.create({ dictionaryId: ctx.de.id, term: 'Haus' });
    await ctx.repos.words.create({ dictionaryId: ctx.en.id, term: 'house' });
    const page = await ctx.repos.words.list({ sort: 'alpha' });
    expect(page.items.map((w) => w.term)).toEqual(['Haus', 'house']);
    expect(page.nextCursor).toBeNull();
  });

  it('derives the status from the recognition card', async () => {
    const { repos, de } = await setup();
    await repos.words.create({ dictionaryId: de.id, term: 'a' });
    const learning = await repos.words.create({ dictionaryId: de.id, term: 'b', translation: 'x' });
    await repos.words.create({ dictionaryId: de.id, term: 'c', translation: 'y' });
    const [card] = await repos.cards.listForWord(learning.id);
    if (!card) throw new Error('expected a card');
    await repos.cards.updateSchedule(card.id, { ...card, state: CardState.Learning });

    const page = await repos.words.list({ dictionaryId: de.id, sort: 'alpha' });
    expect(page.items.map((w) => w.status)).toEqual(['incomplete', 'learning', 'new']);
  });
});

describe('WordRepository.search', () => {
  it('matches term prefixes (accent-folded) first, then translations and definitions', async () => {
    const { repos, de, en } = await setup();
    await repos.words.create({ dictionaryId: de.id, term: 'Schön', translation: 'beautiful' });
    await repos.words.create({ dictionaryId: de.id, term: 'schon', translation: 'already' });
    await repos.words.create({ dictionaryId: de.id, term: 'hübsch', translation: 'pretty, schön' });
    await repos.words.create({
      dictionaryId: en.id,
      term: 'nice',
      definition: 'Schön auf Deutsch',
    });
    await repos.words.create({ dictionaryId: de.id, term: 'Haus' });

    // Same fold: ties break on id (creation order). Meanings match case- and accent-insensitively.
    const results = await repos.words.search('SCHO');
    expect(results.map((w) => w.term)).toEqual(['Schön', 'schon', 'hübsch', 'nice']);

    const shortQuery = await repos.words.search('sc');
    expect(shortQuery.map((w) => w.term)).toEqual(['Schön', 'schon']);

    const withMeanings = await repos.words.search('schön');
    expect(withMeanings.map((w) => w.term)).toEqual(['Schön', 'schon', 'hübsch', 'nice']);

    const inGerman = await repos.words.search('schön', { dictionaryId: de.id });
    expect(inGerman.map((w) => w.term)).toEqual(['Schön', 'schon', 'hübsch']);
  });

  it('treats wildcards and FTS syntax in the query as plain text', async () => {
    const { repos, de } = await setup();
    await repos.words.create({ dictionaryId: de.id, term: 'Prozent', translation: '100% sure' });
    await repos.words.create({ dictionaryId: de.id, term: 'other', translation: 'snake_case' });
    await repos.words.create({
      dictionaryId: de.id,
      term: 'quote',
      translation: 'say "hi" OR NOT',
    });
    await repos.words.create({ dictionaryId: de.id, term: 'plain', translation: 'nothing here' });

    expect((await repos.words.search('0% s')).map((w) => w.term)).toEqual(['Prozent']);
    expect((await repos.words.search('e_c')).map((w) => w.term)).toEqual(['other']);
    expect((await repos.words.search('"hi" OR')).map((w) => w.term)).toEqual(['quote']);
    expect((await repos.words.search('NOT *')).map((w) => w.term)).toEqual([]);
    expect(await repos.words.search('   ')).toEqual([]);
  });

  it('keeps the meaning index in step with edits and deletes', async () => {
    const { repos, de } = await setup();
    const word = await repos.words.create({
      dictionaryId: de.id,
      term: 'Haus',
      translation: 'house',
    });
    await repos.words.create({ dictionaryId: de.id, term: 'Hütte', translation: 'small house' });

    await repos.words.update(word.id, { translation: 'home', definition: 'where you live' });
    expect((await repos.words.search('house')).map((w) => w.term)).toEqual(['Hütte']);
    expect((await repos.words.search('you liv')).map((w) => w.term)).toEqual(['Haus']);

    await repos.words.update(word.id, { translation: null, definition: null });
    expect(await repos.words.search('home')).toEqual([]);

    await repos.words.update(word.id, { translation: 'home again' });
    await repos.words.softDelete([word.id]);
    expect(await repos.words.search('home')).toEqual([]);
    await repos.words.restore([word.id]);
    expect((await repos.words.search('home')).map((w) => w.term)).toEqual(['Haus']);
  });
});

describe('WordRepository.findDuplicates', () => {
  it('returns exact, possible and elsewhere matches, ignoring deleted words', async () => {
    const { repos, de, en } = await setup();
    const exact = await repos.words.create({ dictionaryId: de.id, term: 'Schön' });
    const possible = await repos.words.create({ dictionaryId: de.id, term: 'schon' });
    const elsewhere = await repos.words.create({ dictionaryId: en.id, term: 'schön' });
    const deleted = await repos.words.create({ dictionaryId: de.id, term: 'schön' });
    await repos.words.softDelete([deleted.id]);
    await repos.words.create({ dictionaryId: en.id, term: 'schon' });

    const matches = await repos.words.findDuplicates(de.id, termKeys(' schön '));
    expect(matches).toEqual(
      expect.arrayContaining([
        { tier: 'exact', wordId: exact.id, dictionaryId: de.id, term: 'Schön' },
        { tier: 'possible', wordId: possible.id, dictionaryId: de.id, term: 'schon' },
        { tier: 'elsewhere', wordId: elsewhere.id, dictionaryId: en.id, term: 'schön' },
      ]),
    );
    expect(matches).toHaveLength(3);
  });
});

describe('Inbox (incomplete words)', () => {
  it('lists and counts words without a meaning, across dictionaries', async () => {
    const { repos, de, en, tick } = await setup();
    await repos.words.create({ dictionaryId: de.id, term: 'Haus', translation: 'house' });
    const a = await repos.words.create({ dictionaryId: de.id, term: 'Baum' });
    tick();
    const b = await repos.words.create({ dictionaryId: en.id, term: 'tree', definition: '  ' });
    const trashed = await repos.words.create({ dictionaryId: en.id, term: 'gone' });
    await repos.words.softDelete([trashed.id]);

    const page = await repos.words.list({ incomplete: true, sort: 'recent' });
    expect(page.items.map((w) => w.id)).toEqual([b.id, a.id]);
    expect(page.items.every((w) => w.status === 'incomplete')).toBe(true);
    expect(await repos.words.countIncomplete()).toBe(2);

    // Completing a word creates exactly one card and removes it from the Inbox.
    await repos.words.update(a.id, { translation: 'tree' });
    await repos.words.update(a.id, { definition: 'a tall plant' });
    expect(await repos.cards.listForWord(a.id)).toHaveLength(1);
    expect(await repos.words.countIncomplete()).toBe(1);
  });
});

describe('filters', () => {
  /**
   * Words in two dictionaries covering every status, starred or not, with zero to two tags. One
   * word lost its meaning after it got a card: it counts as incomplete, not new.
   */
  async function fixture() {
    const ctx = await setup();
    const { repos, de, en } = ctx;
    const verbs = await repos.tags.getOrCreate('verbs');
    const travel = await repos.tags.getOrCreate('travel');

    const states = [
      { state: CardState.New, scheduledDays: 0 },
      { state: CardState.Learning, scheduledDays: 0 },
      { state: CardState.Relearning, scheduledDays: 0 },
      { state: CardState.Review, scheduledDays: 3 },
      { state: CardState.Review, scheduledDays: 21 },
    ];
    const expected: {
      id: string;
      dictionaryId: string;
      starred: boolean;
      tagIds: string[];
    }[] = [];

    for (let i = 0; i < 24; i += 1) {
      const dictionary = i % 2 === 0 ? de : en;
      const meaningful = i % 6 !== 5;
      const word = await repos.words.create({
        dictionaryId: dictionary.id,
        term: `word ${String(i).padStart(2, '0')}`,
        translation: meaningful ? `meaning ${i}` : null,
        starred: i % 3 === 0,
      });
      const [card] = await repos.cards.listForWord(word.id);
      const schedule = states[i % states.length];
      if (card && schedule) {
        await repos.cards.updateSchedule(card.id, { ...card, ...schedule });
        if (i % 7 === 0) await repos.cards.setSuspendedForWord(word.id, true);
      }
      const tagIds = [i % 2 === 1 ? verbs.id : null, i % 4 < 2 ? travel.id : null].filter(
        (id) => id !== null,
      );
      await repos.tags.setWordTags(word.id, tagIds);
      expected.push({ id: word.id, dictionaryId: dictionary.id, starred: i % 3 === 0, tagIds });
    }

    // Had a card, then lost its meaning.
    const emptied = await repos.words.create({
      dictionaryId: de.id,
      term: 'emptied',
      translation: 'gone soon',
    });
    await repos.words.update(emptied.id, { translation: null });
    expected.push({ id: emptied.id, dictionaryId: de.id, starred: false, tagIds: [verbs.id] });
    await repos.tags.setWordTags(emptied.id, [verbs.id]);

    // Deleted words never match.
    const deleted = await repos.words.create({ dictionaryId: de.id, term: 'deleted' });
    await repos.tags.setWordTags(deleted.id, [verbs.id]);
    await repos.words.softDelete([deleted.id]);

    // The derived status of every word, from the unfiltered list.
    const all = await allPages(ctx, { sort: 'alpha', limit: 100 });
    const page = await repos.words.list({ sort: 'alpha', limit: 100 });
    const statusById = new Map<string, string>(page.items.map((w) => [w.id, w.status]));
    expect(all.ids).toHaveLength(expected.length);

    return { ...ctx, verbs, travel, expected, statusById };
  }

  it('match the derived status and tags for every filter combination', async () => {
    const ctx = await fixture();
    const { de, verbs, travel, expected, statusById } = ctx;
    const statuses = [undefined, 'new', 'learning', 'young', 'mature', 'suspended'] as const;
    // Every status occurs, so no combination passes by matching nothing.
    expect(new Set(statusById.values())).toEqual(
      new Set(['incomplete', 'new', 'learning', 'young', 'mature', 'suspended']),
    );

    let combinations = 0;
    for (const dictionaryId of [undefined, de.id]) {
      for (const tagId of [undefined, verbs.id, travel.id]) {
        for (const status of statuses) {
          for (const starred of [undefined, true]) {
            for (const incomplete of [undefined, true]) {
              const filter = { dictionaryId, tagId, status, starred, incomplete };
              const want = expected
                .filter(
                  (w) =>
                    (!dictionaryId || w.dictionaryId === dictionaryId) &&
                    (!tagId || w.tagIds.includes(tagId)) &&
                    (!status || statusById.get(w.id) === status) &&
                    (!starred || w.starred) &&
                    (!incomplete || statusById.get(w.id) === 'incomplete'),
                )
                .map((w) => w.id)
                .sort();
              const got = (await allPages(ctx, { ...filter, sort: 'alpha', limit: 7 })).ids;
              expect({ filter, ids: [...got].sort() }).toEqual({ filter, ids: want });
              combinations += 1;
            }
          }
        }
      }
    }
    expect(combinations).toBe(144);
  });

  it('apply to search, on both the prefix and the meaning path', async () => {
    const { repos, verbs, expected, statusById } = await fixture();
    const verbIds = expected.filter((w) => w.tagIds.includes(verbs.id)).map((w) => w.id);

    // "wo": term prefix only (shorter than the trigram index needs).
    const short = await repos.words.search('wo', { tagId: verbs.id, status: 'new' });
    expect(short.map((w) => w.id).sort()).toEqual(
      verbIds.filter((id) => statusById.get(id) === 'new').sort(),
    );
    expect(short.length).toBeGreaterThan(0);

    // "meaning": FTS on translations.
    const long = await repos.words.search('meaning', { tagId: verbs.id, starred: true });
    const want = expected
      .filter(
        (w) => w.tagIds.includes(verbs.id) && w.starred && statusById.get(w.id) !== 'incomplete',
      )
      .map((w) => w.id)
      .sort();
    expect(long.map((w) => w.id).sort()).toEqual(want);
    expect(long.length).toBeGreaterThan(0);
  });

  it('pages grouped by dictionary, then A-Z, without gaps or duplicates', async () => {
    const ctx = await fixture();
    const { repos, verbs } = ctx;
    const { ids, pages } = await allPages(ctx, { sort: 'grouped', tagId: verbs.id, limit: 3 });
    expect(pages).toBeGreaterThan(2);
    expect(new Set(ids).size).toBe(ids.length);

    const page = await repos.words.list({ sort: 'grouped', tagId: verbs.id, limit: 100 });
    expect(page.items.map((w) => w.id)).toEqual(ids);
    const keys = page.items.map((w) => `${w.dictionaryId} ${w.term}`);
    expect(keys).toEqual([...keys].sort());
    // Each dictionary forms one block.
    const blocks = page.items
      .map((w) => w.dictionaryId)
      .filter((id, i, arr) => i === 0 || arr[i - 1] !== id);
    expect(blocks).toHaveLength(2);
  });
});

describe('countChangedSince', () => {
  it('counts words created, edited or deleted after a time (all when null)', async () => {
    const { repos, de, tick, time } = await setup();
    const a = await repos.words.create({ dictionaryId: de.id, term: 'a' });
    const b = await repos.words.create({ dictionaryId: de.id, term: 'b' });
    await repos.words.create({ dictionaryId: de.id, term: 'c' });
    const backupAt = tick(1000);
    expect(await repos.words.countChangedSince(backupAt)).toBe(0);
    expect(await repos.words.countChangedSince(null)).toBe(3);

    tick(1000);
    await repos.words.update(a.id, { translation: 'x' });
    await repos.words.softDelete([b.id]);
    await repos.words.create({ dictionaryId: de.id, term: 'd' });
    expect(await repos.words.countChangedSince(backupAt)).toBe(3);
    expect(time()).toBeGreaterThan(backupAt);
  });
});

describe('choicePool', () => {
  it('samples other words with a meaning from the same dictionary', async () => {
    const { repos, de, en } = await setup();
    const me = await repos.words.create({
      dictionaryId: de.id,
      term: 'Haus',
      translation: 'house',
    });
    for (const term of ['a', 'b', 'c']) {
      await repos.words.create({ dictionaryId: de.id, term, definition: `${term} def` });
    }
    await repos.words.create({ dictionaryId: de.id, term: 'leer' });
    await repos.words.create({ dictionaryId: en.id, term: 'other', translation: 'x' });
    const gone = await repos.words.create({ dictionaryId: de.id, term: 'weg', translation: 'y' });
    await repos.words.softDelete([gone.id]);

    const pool = await repos.words.choicePool(de.id, me.id);
    expect(pool.map((w) => w.term).sort()).toEqual(['a', 'b', 'c']);
    expect(pool.find((w) => w.term === 'a')?.meaning).toBe('a def');
    expect(await repos.words.choicePool(de.id, me.id, 2)).toHaveLength(2);
  });
});
