import type { CardDirection, DictionaryId, TagId } from '@/domain/models';
import type { PracticeMode } from '@/domain/practice/mode';

/** What a free-practice session draws its cards from (docs/04-learning-system.md). */
export type PracticeSource =
  | { kind: 'dictionary'; dictionaryId: DictionaryId }
  | { kind: 'tag'; tagId: TagId }
  | { kind: 'weak' };

export interface PracticeSetup {
  source: PracticeSource;
  /** Modes to use; flashcards fill in where a chosen mode does not fit a card. */
  modes: PracticeMode[];
  count: number;
}

export const PRACTICE_COUNTS = [10, 20, 50] as const;

export const DEFAULT_PRACTICE_SETUP: Omit<PracticeSetup, 'source'> = {
  modes: ['flashcard', 'typing', 'choice'],
  count: 20,
};

/**
 * The mode for the n-th practice card: the chosen modes take turns. Typing only fits recall
 * cards (the term is typed) and multiple choice needs enough other words; a card that fits
 * none of the chosen modes is a flashcard.
 */
export function pickPracticeMode(
  card: { direction: CardDirection },
  modes: readonly PracticeMode[],
  index: number,
  choiceAvailable: boolean,
): PracticeMode {
  const fits = (mode: PracticeMode) =>
    mode === 'flashcard' ||
    (mode === 'typing' && card.direction === 'recall') ||
    (mode === 'choice' && choiceAvailable);
  for (let i = 0; i < modes.length; i++) {
    const mode = modes[(index + i) % modes.length];
    if (mode && fits(mode)) return mode;
  }
  return 'flashcard';
}
