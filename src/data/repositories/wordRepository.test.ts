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

  it('creates the card when a meaning is added, suspends it when removed, resumes it when re-added', async () => {
    const { repos, de, tick } = await setup();
    const word = await repos.words.create({ dictionaryId: de.id, term: 'Haus' });

    tick();
    await repos.words.update(word.id, { translation: 'house' });
    const [card] = await repos.cards.listForWord(word.id);
    expect(card?.suspended).toBe(false);

    tick();
    await repos.words.update(word.id, { translation: '' });
    expect((await repos.cards.listForWord(word.id))[0]).toMatchObject({
      id: card?.id,
      suspended: true,
    });

    tick();
    await repos.words.update(word.id, { definition: 'a building' });
    const after = await repos.cards.listForWord(word.id);
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ id: card?.id, suspended: false });
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
