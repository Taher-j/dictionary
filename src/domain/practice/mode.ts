import { CardState, type CardDirection, type CardStateValue } from '@/domain/models';

export type PracticeMode = 'flashcard' | 'typing' | 'choice';

export interface ModeOptions {
  /** The "Flashcards only" setting. */
  flashcardsOnly: boolean;
  /** Whether enough distractors exist for multiple choice. */
  choiceAvailable: boolean;
}

/**
 * Mode per card (docs/04-learning-system.md): typing for recall cards in review, multiple choice
 * for new and (re)learning cards, flashcards otherwise.
 */
export function pickMode(
  card: { direction: CardDirection; state: CardStateValue },
  { flashcardsOnly, choiceAvailable }: ModeOptions,
): PracticeMode {
  if (flashcardsOnly) return 'flashcard';
  if (card.state === CardState.Review) return card.direction === 'recall' ? 'typing' : 'flashcard';
  return choiceAvailable ? 'choice' : 'flashcard';
}
