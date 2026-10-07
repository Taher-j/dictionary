import { upgradeBackup, type UpgradeStep } from '@/domain/backup/upgrade';

describe('upgradeBackup', () => {
  it('leaves a current file unchanged', () => {
    const file = { formatVersion: 1, data: {} };
    expect(upgradeBackup(file)).toBe(file);
  });

  it('chains steps until the target version', () => {
    const steps: Record<number, UpgradeStep> = {
      1: (f) => ({ ...f, formatVersion: 2, renamed: f.old }),
      2: (f) => ({ ...f, formatVersion: 3, added: true }),
    };
    expect(upgradeBackup({ formatVersion: 1, old: 'x' }, steps, 3)).toEqual({
      formatVersion: 3,
      old: 'x',
      renamed: 'x',
      added: true,
    });
  });

  it('returns null when a step is missing', () => {
    expect(upgradeBackup({ formatVersion: 0 })).toBeNull();
    expect(upgradeBackup({ formatVersion: 'one' })).toBeNull();
  });
});
