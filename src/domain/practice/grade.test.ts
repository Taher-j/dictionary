import { alternatives, gradeChoice, gradeTyping } from '@/domain/practice/grade';

describe('gradeTyping', () => {
  it.each([
    ['Haus', 'Haus', 'exact', 3],
    ['  haus ', 'Haus', 'exact', 3], // case and spaces
    ['Haus.', 'Haus', 'exact', 3], // trailing punctuation
    ['Strasse', 'Straße', 'close', 2], // ß folds to ss
    ['Gemuse', 'Gemüse', 'close', 2], // accents only
    ['Gemüße', 'Gemüse', 'close', 2], // one substitution
    ['Gemüsse', 'Gemüse', 'close', 2], // one letter too many
    ['Gemse', 'Gemüse', 'close', 2], // one letter missing
    ['Gmeüse', 'Gemüse', 'close', 2], // two letters swapped
    ['Gmüsee', 'Gemüse', 'wrong', 1], // two edits
    ['Baum', 'Haus', 'wrong', 1],
    ['', 'Haus', 'wrong', 1],
    ['car', 'cat', 'wrong', 1], // too short for typo tolerance
    ['cät', 'cat', 'close', 2], // but accents still count as close
    ['مرحبا', 'مرحبا', 'exact', 3],
    ['مرحب', 'مرحبا', 'close', 2],
  ] as const)('%j for %j is %s', (input, expected, result, rating) => {
    expect(gradeTyping(input, expected)).toMatchObject({ result, rating });
  });

  it('accepts any alternative and reports the closest one', () => {
    expect(gradeTyping('begin', 'start; begin / commence')).toMatchObject({
      result: 'exact',
      expected: 'begin',
    });
    expect(gradeTyping('comence', 'start; begin / commence')).toMatchObject({
      result: 'close',
      rating: 2,
      expected: 'commence',
    });
    expect(gradeTyping('stop', 'start; begin')).toMatchObject({
      result: 'wrong',
      expected: 'start',
    });
  });
});

describe('alternatives', () => {
  it('splits on ; and /, dropping blanks', () => {
    expect(alternatives(' a ; b/c;; ')).toEqual(['a', 'b', 'c']);
    expect(alternatives('and/or')).toEqual(['and', 'or']);
    expect(alternatives('word')).toEqual(['word']);
  });
});

describe('gradeChoice', () => {
  it('is Good when right and Again when wrong', () => {
    expect(gradeChoice(2, 2)).toBe(3);
    expect(gradeChoice(0, 2)).toBe(1);
  });
});
