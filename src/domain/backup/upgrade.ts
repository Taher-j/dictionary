import { BACKUP_FORMAT_VERSION } from '@/domain/backup/format';

/**
 * One step per older format version: `steps[n]` turns a version-n file into version n + 1. Pure
 * functions on the parsed JSON, chained until the current version (docs/06-data-safety.md).
 */
export type UpgradeStep = (file: Record<string, unknown>) => Record<string, unknown>;

export const UPGRADE_STEPS: Readonly<Record<number, UpgradeStep>> = {
  // Version 1 is the first format; add `1: (file) => ({ ...file, formatVersion: 2, ... })` with v2.
};

/** Upgrades to the current format version, or returns null when no path exists. */
export function upgradeBackup(
  file: Record<string, unknown>,
  steps: Readonly<Record<number, UpgradeStep>> = UPGRADE_STEPS,
  target: number = BACKUP_FORMAT_VERSION,
): Record<string, unknown> | null {
  let current = file;
  while (current.formatVersion !== target) {
    const version = current.formatVersion;
    const step = typeof version === 'number' ? steps[version] : undefined;
    if (!step) return null;
    current = step(current);
  }
  return current;
}
