/** @jest-environment node */
import { createTestContext } from '@/data/testing/testDatabase';

describe('DictionaryRepository', () => {
  it('creates with defaults and lists by position, then name (ties)', async () => {
    const { repos, tick } = createTestContext();
    const b = await repos.dictionaries.create({ name: 'Spanish' });
    tick();
    const a = await repos.dictionaries.create({ name: 'German', termLang: 'de' });
    tick();
    const c = await repos.dictionaries.create({ name: 'Arabic', position: 1 });

    expect(a).toMatchObject({
      name: 'German',
      termLang: 'de',
      bothDirections: false,
      inDailyReview: true,
      deletedAt: null,
    });
    // b gets position 0, a position 1; c asks for position 1 and ties with a, so name decides.
    expect((await repos.dictionaries.list()).map((d) => d.id)).toEqual([b.id, c.id, a.id]);
  });

  it('updates fields and updated_at', async () => {
    const { repos, tick } = createTestContext();
    const d = await repos.dictionaries.create({ name: 'German' });
    const later = tick(1000);
    const updated = await repos.dictionaries.update(d.id, {
      name: 'Deutsch',
      inDailyReview: false,
    });
    expect(updated).toMatchObject({ name: 'Deutsch', inDailyReview: false, updatedAt: later });
    expect(updated.createdAt).toBe(d.createdAt);
  });

  it('soft-deletes with its words and restores only the words deleted with it', async () => {
    const { repos, tick } = createTestContext();
    const d = await repos.dictionaries.create({ name: 'German' });
    const kept = await repos.words.create({ dictionaryId: d.id, term: 'Haus' });
    const trashedEarlier = await repos.words.create({ dictionaryId: d.id, term: 'Baum' });
    tick();
    await repos.words.softDelete([trashedEarlier.id]);
    tick();
    await repos.dictionaries.softDelete(d.id);

    expect(await repos.dictionaries.list()).toEqual([]);
    expect(await repos.dictionaries.getById(d.id)).toBeNull();
    expect(await repos.words.getById(kept.id)).toBeNull();

    tick();
    await repos.dictionaries.restore(d.id);
    expect(await repos.dictionaries.getById(d.id)).not.toBeNull();
    expect(await repos.words.getById(kept.id)).not.toBeNull();
    expect(await repos.words.getById(trashedEarlier.id)).toBeNull();
  });
});

describe('DictionaryRepository Library order and counts', () => {
  it('appends new dictionaries and moves them up and down', async () => {
    const { repos } = createTestContext();
    const a = await repos.dictionaries.create({ name: 'Zulu' });
    const b = await repos.dictionaries.create({ name: 'Alpha' });
    const c = await repos.dictionaries.create({ name: 'Mid' });
    const order = async () => (await repos.dictionaries.list()).map((d) => d.id);
    expect(await order()).toEqual([a.id, b.id, c.id]);

    await repos.dictionaries.move(c.id, 'up');
    expect(await order()).toEqual([a.id, c.id, b.id]);
    await repos.dictionaries.move(a.id, 'up'); // already first: no change
    await repos.dictionaries.move(b.id, 'down'); // already last: no change
    expect(await order()).toEqual([a.id, c.id, b.id]);
    await repos.dictionaries.move(a.id, 'down');
    expect(await order()).toEqual([c.id, a.id, b.id]);
  });

  it('counts live words and incomplete words per dictionary', async () => {
    const { repos } = createTestContext();
    const de = await repos.dictionaries.create({ name: 'German' });
    const empty = await repos.dictionaries.create({ name: 'Empty' });
    await repos.words.create({ dictionaryId: de.id, term: 'Haus', translation: 'house' });
    await repos.words.create({ dictionaryId: de.id, term: 'Baum' });
    const trashed = await repos.words.create({ dictionaryId: de.id, term: 'Tür' });
    await repos.words.softDelete([trashed.id]);

    const list = await repos.dictionaries.listWithCounts();
    expect(list.map((d) => [d.name, d.wordCount, d.incompleteCount])).toEqual([
      ['German', 2, 1],
      ['Empty', 0, 0],
    ]);
    expect(list[1]?.id).toBe(empty.id);
  });

  it('lists trashed dictionaries', async () => {
    const { repos, tick } = createTestContext();
    const a = await repos.dictionaries.create({ name: 'A' });
    const b = await repos.dictionaries.create({ name: 'B' });
    await repos.dictionaries.softDelete(a.id);
    tick();
    await repos.dictionaries.softDelete(b.id);
    expect((await repos.dictionaries.listDeleted()).map((d) => d.name)).toEqual(['B', 'A']);
  });
});
