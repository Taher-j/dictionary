import { pickDistractors, shuffle, type ChoiceCandidate } from '@/domain/practice/distractors';

function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

const c = (wordId: string, text: string, partOfSpeech: string | null = null): ChoiceCandidate => ({
  wordId,
  text,
  partOfSpeech,
});

describe('pickDistractors', () => {
  const correct = c('w0', 'house', 'noun');

  it('never repeats the correct text or a duplicate, and prefers the same part of speech', () => {
    const pool = [
      correct,
      c('w1', 'House'), // same text, other word
      c('w2', 'tree', 'Noun'),
      c('w3', 'tree', 'noun'), // duplicate text
      c('w4', 'to run', 'verb'),
      c('w5', 'car', 'noun'),
      c('w6', 'quick', 'adjective'),
      c('w7', 'cat', 'noun'),
    ];
    const picked = pickDistractors(correct, pool, sequence(0.3, 0.7, 0.1, 0.9, 0.5));
    expect(picked).toHaveLength(3);
    const texts = picked?.map((p) => p.text.toLowerCase()) ?? [];
    expect(new Set(texts).size).toBe(3);
    expect(texts).not.toContain('house');
    expect(picked?.every((p) => p.partOfSpeech?.toLowerCase() === 'noun')).toBe(true);
  });

  it('fills up with other parts of speech, and gives up below three', () => {
    const pool = [c('w1', 'tree', 'noun'), c('w2', 'run', 'verb'), c('w3', 'quick')];
    expect(pickDistractors(correct, pool, Math.random)?.map((p) => p.wordId)[0]).toBe('w1');
    expect(pickDistractors(correct, pool.slice(0, 2), Math.random)).toBeNull();
    expect(
      pickDistractors(correct, [correct, c('w1', 'house'), ...pool.slice(0, 2)], Math.random),
    ).toBeNull();
  });
});

describe('shuffle', () => {
  it('keeps every item', () => {
    expect(shuffle([1, 2, 3, 4], Math.random).sort()).toEqual([1, 2, 3, 4]);
  });
});
