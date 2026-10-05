import { duplicateTier } from '@/domain/duplicates';
import type { DictionaryId } from '@/domain/models';
import { termKeys } from '@/domain/termKeys';

const de = 'dict-de' as DictionaryId;
const en = 'dict-en' as DictionaryId;
const row = (dictionaryId: DictionaryId, term: string) => {
  const { norm, fold } = termKeys(term);
  return { dictionaryId, termNorm: norm, termFold: fold };
};

describe('duplicateTier', () => {
  it('classifies exact, possible and elsewhere', () => {
    const keys = termKeys('schön');
    expect(duplicateTier(de, keys, row(de, 'Schön'))).toBe('exact');
    expect(duplicateTier(de, keys, row(de, 'schon'))).toBe('possible');
    expect(duplicateTier(de, keys, row(en, 'schön'))).toBe('elsewhere');
    expect(duplicateTier(de, keys, row(en, 'schon'))).toBeNull();
    expect(duplicateTier(de, keys, row(de, 'Haus'))).toBeNull();
  });
});
