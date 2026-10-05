import type { EpochMs } from '@/domain/models';

/** Trashed words and dictionaries are deleted for good after this many days. */
export const TRASH_RETENTION_DAYS = 30;

const DAY_MS = 86_400_000;

/** Items deleted before this time are purged. */
export function purgeCutoff(now: EpochMs): EpochMs {
  return now - TRASH_RETENTION_DAYS * DAY_MS;
}
