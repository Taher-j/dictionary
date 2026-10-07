import {
  BACKUP_COLUMNS,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BACKUP_TABLES,
  type Backup,
  type BackupTable,
  type ParseResult,
} from '@/domain/backup/format';
import { upgradeBackup } from '@/domain/backup/upgrade';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function matches(type: string, value: unknown): boolean {
  if (type.endsWith('?') && value === null) return true;
  const base = type.replace('?', '');
  if (base === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === base;
}

/** A row has exactly the table's columns, each with the right type. */
function isValidRow(table: BackupTable, row: unknown): boolean {
  if (!isRecord(row)) return false;
  const columns: Record<string, string> = BACKUP_COLUMNS[table];
  const keys = Object.keys(row);
  if (keys.length !== Object.keys(columns).length) return false;
  return keys.every((key) => {
    const type = columns[key];
    return type !== undefined && matches(type, row[key]);
  });
}

/**
 * Parses and checks a backup file. Never throws: anything that is not a usable backup gives an
 * error code the UI turns into a message.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'notJson' };
  }
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT || typeof raw.formatVersion !== 'number') {
    return { ok: false, error: 'notBackup' };
  }
  if (raw.formatVersion > BACKUP_FORMAT_VERSION) return { ok: false, error: 'newerVersion' };

  const file = upgradeBackup(raw);
  if (!file) return { ok: false, error: 'notBackup' };

  const { schemaVersion, exportedAt, app, data } = file;
  if (
    typeof schemaVersion !== 'number' ||
    typeof exportedAt !== 'string' ||
    !isRecord(app) ||
    typeof app.version !== 'string' ||
    typeof app.platform !== 'string' ||
    !isRecord(data)
  ) {
    return { ok: false, error: 'invalidData' };
  }
  for (const table of BACKUP_TABLES) {
    const rows = data[table];
    if (!Array.isArray(rows) || !rows.every((row) => isValidRow(table, row))) {
      return { ok: false, error: 'invalidData' };
    }
  }
  // Every field was checked above.
  return { ok: true, backup: file as unknown as Backup };
}
