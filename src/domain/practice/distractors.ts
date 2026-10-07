import { termKeys } from '@/domain/termKeys';

/** A possible option: the text shown and what makes a good wrong answer. */
export interface ChoiceCandidate {
  wordId: string;
  text: string;
  partOfSpeech: string | null;
}

export const CHOICE_OPTIONS = 4;

/**
 * Wrong answers for multiple choice (docs/04-learning-system.md): from the same dictionary
 * (the caller's pool), same part of speech first, never the correct text, never duplicates.
 * Returns null when there are not enough; the mode is then not offered.
 */
export function pickDistractors(
  correct: ChoiceCandidate,
  pool: readonly ChoiceCandidate[],
  random: () => number,
  count = CHOICE_OPTIONS - 1,
): ChoiceCandidate[] | null {
  const seen = new Set([termKeys(correct.text).norm]);
  const usable: ChoiceCandidate[] = [];
  for (const candidate of pool) {
    const key = termKeys(candidate.text).norm;
    if (candidate.wordId === correct.wordId || key === '' || seen.has(key)) continue;
    seen.add(key);
    usable.push(candidate);
  }
  if (usable.length < count) return null;

  const shuffled = shuffle(usable, random);
  const pos = correct.partOfSpeech ? termKeys(correct.partOfSpeech).norm : null;
  const samePos = pos
    ? shuffled.filter((c) => c.partOfSpeech && termKeys(c.partOfSpeech).norm === pos)
    : [];
  const others = shuffled.filter((c) => !samePos.includes(c));
  return [...samePos, ...others].slice(0, count);
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}
