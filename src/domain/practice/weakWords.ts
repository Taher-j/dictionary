/** Weak words (docs/04-learning-system.md): 3+ lapses, or 2+ Again ratings in the last 30 days. */
export const WEAK_LAPSES = 3;
export const WEAK_AGAINS = 2;
export const WEAK_WINDOW_DAYS = 30;

/** A leech has this many lapses; reaching it prompts once to edit or suspend the word. */
export const LEECH_LAPSES = 8;

export function isWeak(card: { lapses: number }, againsInWindow: number): boolean {
  return card.lapses >= WEAK_LAPSES || againsInWindow >= WEAK_AGAINS;
}

/** True only for the answer that makes the card a leech, so the prompt shows once. */
export function becameLeech(lapsesBefore: number, lapsesAfter: number): boolean {
  return lapsesBefore < LEECH_LAPSES && lapsesAfter >= LEECH_LAPSES;
}
