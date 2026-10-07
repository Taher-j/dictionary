/** @jest-environment node */
import { createTestContext } from '@/data/testing/testDatabase';

async function setup() {
  const ctx = createTestContext();
  const dictionary = await ctx.repos.dictionaries.create({ name: 'German' });
  const word = await ctx.repos.words.create({ dictionaryId: dictionary.id, term: 'Haus' });
  return { ...ctx, word };
}

describe('TagRepository', () => {
  it('getOrCreate reuses a tag whose name differs only in case or spacing', async () => {
    const { repos } = await setup();
    const a = await repos.tags.getOrCreate(' Travel  Words ');
    const b = await repos.tags.getOrCreate('travel words');
    expect(b.id).toBe(a.id);
    expect(a.name).toBe('Travel Words');
    expect(await repos.tags.list()).toHaveLength(1);
  });

  it('setWordTags replaces the set and bumps the word', async () => {
    const { repos, word, tick } = await setup();
    const a = await repos.tags.getOrCreate('a');
    const b = await repos.tags.getOrCreate('b');
    const c = await repos.tags.getOrCreate('c');

    await repos.tags.setWordTags(word.id, [a.id, b.id, a.id]);
    expect((await repos.tags.listForWord(word.id)).map((t) => t.name)).toEqual(['a', 'b']);

    const later = tick(1000);
    await repos.tags.setWordTags(word.id, [c.id]);
    expect((await repos.tags.listForWord(word.id)).map((t) => t.name)).toEqual(['c']);
    expect((await repos.words.getById(word.id))?.updatedAt).toBe(later);
  });

  it('delete removes the tag from its words and bumps them; the name can be used again', async () => {
    const { repos, word, tick } = await setup();
    const tag = await repos.tags.getOrCreate('verbs');
    const keep = await repos.tags.getOrCreate('keep');
    await repos.tags.setWordTags(word.id, [tag.id, keep.id]);

    const later = tick(1000);
    await repos.tags.softDelete(tag.id);
    expect((await repos.tags.list()).map((t) => t.name)).toEqual(['keep']);
    expect((await repos.tags.listForWord(word.id)).map((t) => t.name)).toEqual(['keep']);
    expect((await repos.words.getById(word.id))?.updatedAt).toBe(later);

    // Re-creating the name does not bring the old links back.
    const again = await repos.tags.getOrCreate('Verbs');
    expect(again.id).toBe(tag.id);
    expect((await repos.tags.listForWord(word.id)).map((t) => t.name)).toEqual(['keep']);
  });

  it('renames a tag; every word shows the new name', async () => {
    const { repos, word } = await setup();
    const tag = await repos.tags.getOrCreate('verbs');
    await repos.tags.setWordTags(word.id, [tag.id]);
    const result = await repos.tags.rename(tag.id, ' Verben ');
    expect(result).toMatchObject({ ok: true, tag: { name: 'Verben', nameNorm: 'verben' } });
    expect((await repos.tags.listForWord(word.id)).map((t) => t.name)).toEqual(['Verben']);
    // Changing only the case is a rename, not a conflict.
    expect(await repos.tags.rename(tag.id, 'VERBEN')).toMatchObject({ ok: true });
  });

  it('reports a conflict when another tag has the name, and reuses a deleted one', async () => {
    const { repos } = await setup();
    const a = await repos.tags.getOrCreate('a');
    const b = await repos.tags.getOrCreate('b');
    expect(await repos.tags.rename(a.id, ' B ')).toEqual({ ok: false, conflict: b });
    expect((await repos.tags.list()).map((t) => t.name)).toEqual(['a', 'b']);

    await repos.tags.softDelete(b.id);
    expect(await repos.tags.rename(a.id, 'b')).toMatchObject({ ok: true, tag: { id: a.id } });
    expect((await repos.tags.list()).map((t) => t.id)).toEqual([a.id]);
  });

  it('merge moves every word to the target once, bumps them and deletes the source', async () => {
    const { repos, word, tick } = await setup();
    const de = word.dictionaryId;
    const other = await repos.words.create({ dictionaryId: de, term: 'Baum' });
    const untouched = await repos.words.create({ dictionaryId: de, term: 'Katze' });
    const source = await repos.tags.getOrCreate('verben');
    const target = await repos.tags.getOrCreate('verbs');
    await repos.tags.setWordTags(word.id, [source.id, target.id]);
    await repos.tags.setWordTags(other.id, [source.id]);
    const before = (await repos.words.getById(untouched.id))?.updatedAt;

    const later = tick(1000);
    await repos.tags.merge(source.id, target.id);

    expect((await repos.tags.list()).map((t) => t.name)).toEqual(['verbs']);
    for (const id of [word.id, other.id]) {
      expect((await repos.tags.listForWord(id)).map((t) => t.id)).toEqual([target.id]);
      expect((await repos.words.getById(id))?.updatedAt).toBe(later);
    }
    expect((await repos.words.getById(untouched.id))?.updatedAt).toBe(before);
    const page = await repos.words.list({ sort: 'alpha', tagId: target.id });
    expect(page.items.map((w) => w.term)).toEqual(['Baum', 'Haus']);
  });

  it('suggests tags by prefix, ignoring case, A-Z', async () => {
    const { repos } = await setup();
    for (const name of ['Travel', 'trains', 'verbs', 'tr', 'deleted-tr']) {
      await repos.tags.getOrCreate(name);
    }
    const gone = await repos.tags.getOrCreate('trash');
    await repos.tags.softDelete(gone.id);
    expect((await repos.tags.suggest('TR')).map((t) => t.name)).toEqual(['tr', 'trains', 'Travel']);
    expect((await repos.tags.suggest('tra', 1)).map((t) => t.name)).toEqual(['trains']);
    expect(await repos.tags.suggest('x')).toEqual([]);
  });

  it('counts words per tag, leaving out deleted words', async () => {
    const { repos, word } = await setup();
    const other = await repos.words.create({ dictionaryId: word.dictionaryId, term: 'Baum' });
    const a = await repos.tags.getOrCreate('a');
    await repos.tags.getOrCreate('empty');
    await repos.tags.setWordTags(word.id, [a.id]);
    await repos.tags.setWordTags(other.id, [a.id]);
    await repos.words.softDelete([other.id]);
    expect((await repos.tags.listWithCounts()).map((t) => [t.name, t.wordCount])).toEqual([
      ['a', 1],
      ['empty', 0],
    ]);
  });
});
