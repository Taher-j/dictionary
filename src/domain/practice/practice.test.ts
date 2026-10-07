import { pickPracticeMode } from '@/domain/practice/practice';
import { becameLeech, isWeak } from '@/domain/practice/weakWords';

describe('pickPracticeMode', () => {
  const recall = { direction: 'recall' as const };
  const recognition = { direction: 'recognition' as const };

  it('takes turns between the chosen modes', () => {
    const modes = ['flashcard', 'typing', 'choice'] as const;
    expect([0, 1, 2, 3].map((i) => pickPracticeMode(recall, modes, i, true))).toEqual([
      'flashcard',
      'typing',
      'choice',
      'flashcard',
    ]);
  });

  it('skips a mode that does not fit the card', () => {
    expect(pickPracticeMode(recognition, ['typing', 'choice'], 0, true)).toBe('choice');
    expect(pickPracticeMode(recognition, ['typing'], 0, true)).toBe('flashcard');
    expect(pickPracticeMode(recall, ['choice'], 0, false)).toBe('flashcard');
  });
});

describe('weak words and leeches', () => {
  it('counts 3 lapses or 2 recent Again ratings as weak', () => {
    expect(isWeak({ lapses: 3 }, 0)).toBe(true);
    expect(isWeak({ lapses: 0 }, 2)).toBe(true);
    expect(isWeak({ lapses: 2 }, 1)).toBe(false);
  });

  it('flags only the answer that reaches 8 lapses', () => {
    expect(becameLeech(7, 8)).toBe(true);
    expect(becameLeech(8, 9)).toBe(false);
    expect(becameLeech(6, 7)).toBe(false);
  });
});
