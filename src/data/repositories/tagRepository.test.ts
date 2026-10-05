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

  it('hides soft-deleted tags and restores them through getOrCreate', async () => {
    const { repos, word } = await setup();
    const tag = await repos.tags.getOrCreate('verbs');
    await repos.tags.setWordTags(word.id, [tag.id]);

    await repos.tags.softDelete(tag.id);
    expect(await repos.tags.list()).toEqual([]);
    expect(await repos.tags.listForWord(word.id)).toEqual([]);

    const again = await repos.tags.getOrCreate('Verbs');
    expect(again.id).toBe(tag.id);
    expect((await repos.tags.listForWord(word.id)).map((t) => t.id)).toEqual([tag.id]);
  });

  it('renames a tag', async () => {
    const { repos } = await setup();
    const tag = await repos.tags.getOrCreate('verbs');
    expect(await repos.tags.rename(tag.id, 'Verben')).toMatchObject({
      name: 'Verben',
      nameNorm: 'verben',
    });
  });
});
