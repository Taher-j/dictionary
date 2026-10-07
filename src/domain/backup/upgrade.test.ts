import { upgradeHeader, upgradePath, upgradeRow, type UpgradeStep } from '@/domain/backup/upgrade';

const steps: Record<number, UpgradeStep> = {
  1: {
    header: (h) => ({ ...h, renamedField: h.oldField }),
    row: (table, row) => (table === 'old' ? { table: 'renamed', row } : { table, row }),
  },
  2: { row: (table, row) => (row.drop ? null : { table, row: { ...row, added: true } }) },
};

describe('backup upgrades', () => {
  it('needs no steps for the current version, and no path from the future or a gap', () => {
    expect(upgradePath(1)).toEqual([]);
    expect(upgradePath(2)).toBeNull();
    expect(upgradePath(0)).toBeNull();
  });

  it('chains header and row steps', () => {
    const path = upgradePath(1, steps, 3);
    if (!path) throw new Error('expected a path');
    expect(upgradeHeader(path, { oldField: 'x' })).toEqual({ oldField: 'x', renamedField: 'x' });
    expect(upgradeRow(path, 'old', { id: 'a' })).toEqual({
      table: 'renamed',
      row: { id: 'a', added: true },
    });
    expect(upgradeRow(path, 'words', { id: 'b', drop: true })).toBeNull();
  });
});
