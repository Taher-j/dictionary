import { needsBackupReminder } from '@/domain/backup/reminder';

const DAY = 86_400_000;
const now = Date.UTC(2026, 9, 7, 12);

describe('needsBackupReminder', () => {
  it('needs 14 days and 20 changed words', () => {
    expect(needsBackupReminder(now - 14 * DAY, 20, now)).toBe(true);
    expect(needsBackupReminder(now - 14 * DAY + 1, 20, now)).toBe(false);
    expect(needsBackupReminder(now - 30 * DAY, 19, now)).toBe(false);
  });

  it('counts "never backed up" as long ago', () => {
    expect(needsBackupReminder(null, 20, now)).toBe(true);
    expect(needsBackupReminder(null, 5, now)).toBe(false);
  });
});
