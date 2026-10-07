import {
  CHOICE_OPTIONS,
  pickDistractors,
  shuffle,
  type ChoiceCandidate,
} from '@/domain/practice/distractors';

export interface Choice {
  options: string[];
  correctIndex: number;
}

/** Four options with the correct one at a random place, or null when there are too few. */
export function buildChoice(
  correct: ChoiceCandidate,
  pool: readonly ChoiceCandidate[],
  random: () => number,
): Choice | null {
  const distractors = pickDistractors(correct, pool, random, CHOICE_OPTIONS - 1);
  if (!distractors) return null;
  const options = shuffle([correct, ...distractors], random);
  return {
    options: options.map((o) => o.text),
    correctIndex: options.findIndex((o) => o.wordId === correct.wordId),
  };
}

/** Deterministic random numbers from a string (mulberry32 on a string hash). */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
