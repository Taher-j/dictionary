import type { DictionaryId, DuplicateTier } from '@/domain/models';
import type { TermKeys } from '@/domain/termKeys';

interface Candidate {
  dictionaryId: DictionaryId;
  termNorm: string;
  termFold: string;
}

/**
 * Duplicate tier of an existing word relative to a new term, or null if it is not a duplicate.
 * Exact: same norm, same dictionary. Possible: same fold, same dictionary. Elsewhere: same norm,
 * other dictionary.
 */
export function duplicateTier(
  dictionaryId: DictionaryId,
  keys: TermKeys,
  candidate: Candidate,
): DuplicateTier | null {
  const sameDictionary = candidate.dictionaryId === dictionaryId;
  if (candidate.termNorm === keys.norm) return sameDictionary ? 'exact' : 'elsewhere';
  if (sameDictionary && candidate.termFold === keys.fold) return 'possible';
  return null;
}
