/** @jest-environment node */
import { createTestContext } from '@/data/testing/testDatabase';

describe('DictionaryRepository', () => {
  it('creates with defaults and lists by position, then name', async () => {
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
    expect((await repos.dictionaries.list()).map((d) => d.id)).toEqual([a.id, b.id, c.id]);
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
