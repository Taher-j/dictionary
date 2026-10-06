import { CardState, type CardSchedule, type WordDetails, type WordStatus } from '@/domain/models';

/** Cards with at least this interval (days) count as mature. */
export const MATURE_INTERVAL_DAYS = 21;

/** A word needs a translation or a definition before it gets a card. */
export function hasMeaning(word: Pick<WordDetails, 'translation' | 'definition'>): boolean {
  return Boolean(word.translation?.trim() || word.definition?.trim());
}

/**
 * Derived, never stored. `card` is the word's recognition card, if it has one. A word whose
 * meaning was removed keeps its card but counts as incomplete again.
 */
export function wordStatus(
  card: (Pick<CardSchedule, 'state' | 'scheduledDays'> & { suspended: boolean }) | null,
  meaningful: boolean,
): WordStatus {
  if (!meaningful) return 'incomplete';
  if (!card) return 'incomplete';
  if (card.suspended) return 'suspended';
  switch (card.state) {
    case CardState.New:
      return 'new';
    case CardState.Learning:
    case CardState.Relearning:
      return 'learning';
    default:
      return card.scheduledDays >= MATURE_INTERVAL_DAYS ? 'mature' : 'young';
  }
}
