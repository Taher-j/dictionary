import type { Rating } from '@/domain/models';
import { termKeys } from '@/domain/termKeys';

/** Typo tolerance needs a word this long: one edit turns "cat" into "car". */
export const MIN_LENGTH_FOR_TYPO = 4;

export type TypingResult = 'exact' | 'close' | 'wrong';

export interface TypingGrade {
  result: TypingResult;
  /** Exact: Good. Close (accents or one edit): Hard. Wrong: Again (docs/04-learning-system.md). */
  rating: Rating;
  /** The accepted answer closest to the input, shown after a close or wrong answer. */
  expected: string;
}

/** Accepted answers: the expected text split on ";" and "/", blanks dropped. */
export function alternatives(expected: string): string[] {
  const parts = expected
    .split(/[;/]/)
    .map((part) => part.trim())
    .filter((part) => part !== '');
  return parts.length > 0 ? parts : [expected.trim()];
}

/** Damerau-Levenshtein distance capped at 2 (only "0, 1 or more" matters here). */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = [...a];
  const lb = [...b];
  if (Math.abs(la.length - lb.length) > 1) return false;
  let i = 0;
  while (i < la.length && i < lb.length && la[i] === lb[i]) i++;
  const restA = la.slice(i);
  const restB = lb.slice(i);
  const tail = (x: string[], y: string[]) => x.join('') === y.join('');
  return (
    tail(restA.slice(1), restB.slice(1)) || // substitution
    tail(restA.slice(1), restB) || // extra letter typed
    tail(restA, restB.slice(1)) || // letter missing
    (restA.length >= 2 && // two letters swapped
      restA[0] === restB[1] &&
      restA[1] === restB[0] &&
      tail(restA.slice(2), restB.slice(2)))
  );
}

function gradeOne(input: string, expected: string): TypingResult {
  const typed = termKeys(input);
  const answer = termKeys(expected);
  if (typed.norm === answer.norm) return 'exact';
  if (typed.norm === '') return 'wrong';
  if (typed.fold === answer.fold) return 'close'; // accents only
  if ([...answer.norm].length >= MIN_LENGTH_FOR_TYPO && withinOneEdit(typed.norm, answer.norm)) {
    return 'close';
  }
  return 'wrong';
}

const RATING: Record<TypingResult, Rating> = { exact: 3, close: 2, wrong: 1 };
const RANK: Record<TypingResult, number> = { exact: 2, close: 1, wrong: 0 };

/** Grades a typed answer against every accepted alternative; the best match counts. */
export function gradeTyping(input: string, expected: string): TypingGrade {
  let best: { result: TypingResult; expected: string } = {
    result: 'wrong',
    expected: alternatives(expected)[0] ?? expected,
  };
  for (const option of alternatives(expected)) {
    const result = gradeOne(input, option);
    if (RANK[result] > RANK[best.result]) best = { result, expected: option };
  }
  return { ...best, rating: RATING[best.result] };
}

/** Multiple choice: correct is Good, wrong is Again. */
export function gradeChoice(chosen: number, correct: number): Rating {
  return chosen === correct ? 3 : 1;
}
