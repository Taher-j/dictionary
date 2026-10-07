import { BACKUP_FORMAT_VERSION } from '@/domain/backup/format';

/**
 * Turns a version-n file into version n + 1 (docs/06-data-safety.md). Backups are read one row
 * at a time, so a step changes the header and each row separately. `row` may rename the table or
 * drop the row (null).
 */
export interface UpgradeStep {
  header?: (header: Record<string, unknown>) => Record<string, unknown>;
  row?: (
    table: string,
    row: Record<string, unknown>,
  ) => { table: string; row: Record<string, unknown> } | null;
}

/** `UPGRADE_STEPS[n]` upgrades version n. Version 1 is the first format. */
export const UPGRADE_STEPS: Readonly<Record<number, UpgradeStep>> = {};

/** The steps from `version` to the current one, or null when no path exists. */
export function upgradePath(
  version: number,
  steps: Readonly<Record<number, UpgradeStep>> = UPGRADE_STEPS,
  target: number = BACKUP_FORMAT_VERSION,
): UpgradeStep[] | null {
  const path: UpgradeStep[] = [];
  for (let v = version; v < target; v++) {
    const step = steps[v];
    if (!step) return null;
    path.push(step);
  }
  return version > target ? null : path;
}

export function upgradeHeader(path: readonly UpgradeStep[], header: Record<string, unknown>) {
  return path.reduce((h, step) => (step.header ? step.header(h) : h), header);
}

export function upgradeRow(
  path: readonly UpgradeStep[],
  table: string,
  row: Record<string, unknown>,
): { table: string; row: Record<string, unknown> } | null {
  let current: { table: string; row: Record<string, unknown> } | null = { table, row };
  for (const step of path) {
    if (!current) return null;
    if (step.row) current = step.row(current.table, current.row);
  }
  return current;
}
