import { isValidLookupTemplate, lookupUrl } from '@/domain/lookup';

describe('lookupUrl', () => {
  it('fills in the term, encoded', () => {
    expect(lookupUrl('https://en.wiktionary.org/wiki/{term}', 'Straße')).toBe(
      'https://en.wiktionary.org/wiki/Stra%C3%9Fe',
    );
    expect(lookupUrl(' https://x.org/?q={term}&again={term} ', 'a b')).toBe(
      'https://x.org/?q=a%20b&again=a%20b',
    );
  });

  it('rejects templates without https or without {term}', () => {
    for (const bad of [
      'http://x.org/{term}',
      'https://x.org/word',
      'javascript:alert({term})',
      '',
      'https://x .org/{term}',
    ]) {
      expect(isValidLookupTemplate(bad)).toBe(false);
      expect(lookupUrl(bad, 'Haus')).toBeNull();
    }
    expect(lookupUrl(null, 'Haus')).toBeNull();
  });
});
