import { termKeys } from '@/domain/termKeys';

describe('termKeys', () => {
  it('ignores case', () => {
    expect(termKeys('Haus')).toEqual(termKeys('HAUS'));
    expect(termKeys('Haus').norm).toBe('haus');
  });

  it('trims surrounding whitespace', () => {
    expect(termKeys('  Haus \t\n').norm).toBe('haus');
  });

  it('collapses inner whitespace', () => {
    expect(termKeys('ice   \t cream').norm).toBe('ice cream');
  });

  it('strips surrounding quotes', () => {
    expect(termKeys('"Haus"').norm).toBe('haus');
    expect(termKeys('„Haus“').norm).toBe('haus');
    expect(termKeys('«maison»').norm).toBe('maison');
    expect(termKeys("'tis").norm).toBe('tis');
  });

  it('strips trailing sentence punctuation', () => {
    expect(termKeys('Haus.').norm).toBe('haus');
    expect(termKeys('what?!').norm).toBe('what');
    expect(termKeys('hello, ').norm).toBe('hello');
  });

  it('keeps symbols that are part of the term', () => {
    expect(termKeys('C++').norm).toBe('c++');
    expect(termKeys('C#').norm).toBe('c#');
    expect(termKeys('.NET').norm).toBe('.net');
  });

  it('folds German umlauts and ß but keeps them in norm', () => {
    expect(termKeys('schön')).toEqual({ norm: 'schön', fold: 'schon' });
    expect(termKeys('Äpfel')).toEqual({ norm: 'äpfel', fold: 'apfel' });
    expect(termKeys('Straße')).toEqual({ norm: 'straße', fold: 'strasse' });
    expect(termKeys('schon').fold).toBe(termKeys('schön').fold);
    expect(termKeys('schon').norm).not.toBe(termKeys('schön').norm);
  });

  it('lowercases Turkish without locale rules and folds the dot and cedilla', () => {
    // Locale-independent: 'I' becomes 'i', not dotless 'ı'; 'İ' becomes 'i' + combining dot.
    expect(termKeys('IŞIK')).toEqual({ norm: 'işik', fold: 'isik' });
    expect(termKeys('İstanbul')).toEqual({ norm: 'i̇stanbul', fold: 'istanbul' });
    expect(termKeys('ılık').fold).toBe('ılık');
  });

  it('keeps Arabic letters and vowel marks', () => {
    // Harakat (U+064B-U+0652) are outside the folded combining range, so they stay.
    expect(termKeys(' كِتَاب ')).toEqual({ norm: 'كِتَاب', fold: 'كِتَاب' });
  });

  it('keeps Japanese text', () => {
    expect(termKeys('日本語').norm).toBe('日本語');
    expect(termKeys('ｶﾀｶﾅ').norm).toBe('カタカナ');
    // NFD splits the voiced mark (U+3099); it is outside the folded range, so it stays decomposed.
    expect(termKeys('がっこう').fold).toBe('がっこう');
    expect(termKeys('がっこう').fold).toBe(termKeys('が​っこう'.replace('​', '')).fold);
  });

  it('normalizes full-width Latin characters (NFKC)', () => {
    expect(termKeys('ＨＡＵＳ')).toEqual(termKeys('Haus'));
    expect(termKeys('Ｃ＋＋').norm).toBe('c++');
  });
});
