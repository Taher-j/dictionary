import { buildChoice, seededRandom } from '@/domain/practice/choice';

const pool = ['tree', 'car', 'cat', 'dog', 'sun'].map((text, i) => ({
  wordId: `w${i + 1}`,
  text,
  partOfSpeech: null,
}));
const correct = { wordId: 'w0', text: 'house', partOfSpeech: null };

describe('buildChoice', () => {
  it('gives four different options with the correct one marked', () => {
    const choice = buildChoice(correct, pool, seededRandom('card-1'));
    expect(choice?.options).toHaveLength(4);
    expect(new Set(choice?.options).size).toBe(4);
    expect(choice?.options[choice.correctIndex]).toBe('house');
  });

  it('is the same for the same seed (no reshuffle on re-render)', () => {
    expect(buildChoice(correct, pool, seededRandom('card-1'))).toEqual(
      buildChoice(correct, pool, seededRandom('card-1')),
    );
  });

  it('puts the correct answer in every position across seeds', () => {
    const positions = new Set(
      Array.from(
        { length: 40 },
        (_, i) => buildChoice(correct, pool, seededRandom(`c${i}`))?.correctIndex,
      ),
    );
    expect(positions).toEqual(new Set([0, 1, 2, 3]));
  });

  it('is null with too few other words', () => {
    expect(buildChoice(correct, pool.slice(0, 2), seededRandom('x'))).toBeNull();
  });
});
