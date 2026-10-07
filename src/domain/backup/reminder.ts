import type { EpochMs } from '@/domain/models';

export const BACKUP_REMINDER_DAYS = 14;
export const BACKUP_REMINDER_CHANGES = 20;
const DAY_MS = 86_400_000;

/**
 * Today's backup banner (docs/06-data-safety.md): 14 or more days since the last backup (or none
 * yet), and 20 or more words created or edited since then.
 */
export function needsBackupReminder(
  lastBackupAt: EpochMs | null,
  wordsChangedSince: number,
  now: EpochMs,
): boolean {
  const longAgo = lastBackupAt === null || now - lastBackupAt >= BACKUP_REMINDER_DAYS * DAY_MS;
  return longAgo && wordsChangedSince >= BACKUP_REMINDER_CHANGES;
}
