import {
  BACKUP_COLUMNS,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BACKUP_TABLES,
  type Backup,
  type BackupData,
  type BackupError,
  type BackupHeader,
  type BackupTable,
  type ParseResult,
} from '@/domain/backup/format';
import { createBackupSplitter } from '@/domain/backup/splitter';
import { upgradeHeader, upgradePath, upgradeRow, type UpgradeStep } from '@/domain/backup/upgrade';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTable(name: string): name is BackupTable {
  return (BACKUP_TABLES as readonly string[]).includes(name);
}

function matches(type: string, value: unknown): boolean {
  if (type.endsWith('?') && value === null) return true;
  const base = type.replace('?', '');
  if (base === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === base;
}

/** A row has exactly the table's columns, each with the right type. */
export function isValidRow(table: BackupTable, row: unknown): row is Record<string, unknown> {
  if (!isRecord(row)) return false;
  const columns: Record<string, string> = BACKUP_COLUMNS[table];
  const keys = Object.keys(row);
  if (keys.length !== Object.keys(columns).length) return false;
  return keys.every((key) => {
    const type = columns[key];
    return type !== undefined && matches(type, row[key]);
  });
}

/** Bytes looked at before deciding whether a file can be a backup at all. */
const SNIFF_LENGTH = 4096;

/**
 * Looks at the start of a file: an unrelated file (a photo, another app's JSON) is rejected
 * before it is read to the end. Our writer always puts `format` and `formatVersion` first.
 */
function sniff(
  start: string,
): { ok: true; path: UpgradeStep[]; recognized: boolean } | { ok: false; error: BackupError } {
  const text = start.trimStart();
  if (text !== '' && text[0] !== '{' && text[0] !== '[') {
    // A short file may still be JSON ("null", a number): then it is just not a backup.
    if (text.length < SNIFF_LENGTH) {
      try {
        JSON.parse(text);
        return { ok: false, error: 'notBackup' };
      } catch {
        // falls through
      }
    }
    return { ok: false, error: 'notJson' };
  }
  if (!new RegExp(`^\\{\\s*"format"\\s*:\\s*"${BACKUP_FORMAT}"`).test(text)) {
    // Too short to tell, or another JSON file: decided once the file is read.
    return text.length < 200
      ? { ok: true, path: [], recognized: false }
      : { ok: false, error: 'notBackup' };
  }
  const version = /"formatVersion"\s*:\s*(\d+)/.exec(text)?.[1];
  if (version === undefined) return { ok: true, path: [], recognized: true };
  if (Number(version) > BACKUP_FORMAT_VERSION) return { ok: false, error: 'newerVersion' };
  const path = upgradePath(Number(version));
  return path ? { ok: true, path, recognized: true } : { ok: false, error: 'notBackup' };
}

/** Header checks on the skeleton (the file without its rows). */
function checkHeader(
  skeleton: string | null,
): { ok: true; header: BackupHeader } | { ok: false; error: BackupError } {
  if (skeleton === null) return { ok: false, error: 'notJson' };
  let raw: unknown;
  try {
    raw = JSON.parse(skeleton);
  } catch {
    return { ok: false, error: 'notJson' };
  }
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT || typeof raw.formatVersion !== 'number') {
    return { ok: false, error: 'notBackup' };
  }
  if (raw.formatVersion > BACKUP_FORMAT_VERSION) return { ok: false, error: 'newerVersion' };
  const path = upgradePath(raw.formatVersion);
  if (!path) return { ok: false, error: 'notBackup' };
  const { data, ...rest } = raw;
  const header = upgradeHeader(path, { ...rest, formatVersion: BACKUP_FORMAT_VERSION });
  const { schemaVersion, exportedAt, app } = header;
  if (
    typeof schemaVersion !== 'number' ||
    typeof exportedAt !== 'string' ||
    !isRecord(app) ||
    typeof app.version !== 'string' ||
    typeof app.platform !== 'string' ||
    !isRecord(data) ||
    !BACKUP_TABLES.every((table) => Array.isArray(data[table]))
  ) {
    return { ok: false, error: 'invalidData' };
  }
  return {
    ok: true,
    header: {
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion,
      exportedAt,
      app: { version: app.version, platform: app.platform },
    },
  };
}

export type ScanResult =
  | {
      ok: true;
      header: BackupHeader;
      counts: Record<BackupTable, number>;
      activeDictionaries: number;
      activeWords: number;
    }
  | { ok: false; error: BackupError };

/**
 * Reads a backup piece by piece and checks every row; `onRow` receives each checked row (for a
 * restore). Never throws for bad input: anything that is not a usable backup gives an error code
 * the UI turns into a message. Errors thrown by `onRow` propagate.
 */
export async function scanBackup(
  pieces: AsyncIterable<string> | Iterable<string>,
  onRow?: (table: BackupTable, row: Record<string, unknown>) => void | Promise<void>,
): Promise<ScanResult> {
  const counts = Object.fromEntries(BACKUP_TABLES.map((t) => [t, 0])) as Record<
    BackupTable,
    number
  >;
  let activeDictionaries = 0;
  let activeWords = 0;
  let path: UpgradeStep[] = [];
  let recognized = false;
  let failure: BackupError | null = null;
  let pending: { table: BackupTable; row: Record<string, unknown> }[] = [];

  const splitter = createBackupSplitter((rawTable, json) => {
    if (failure) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      failure = 'invalidData';
      return;
    }
    const upgraded = isRecord(parsed) ? upgradeRow(path, rawTable, parsed) : null;
    if (!upgraded) return;
    const { table, row } = upgraded;
    if (!isTable(table) || !isValidRow(table, row)) {
      failure = 'invalidData';
      return;
    }
    counts[table] += 1;
    if (table === 'dictionaries' && row.deletedAt === null) activeDictionaries += 1;
    if (table === 'words' && row.deletedAt === null) activeWords += 1;
    pending.push({ table, row });
  });

  let start = '';
  let sniffed = false;
  for await (const piece of pieces) {
    if (!sniffed) {
      start += piece;
      if (start.length < SNIFF_LENGTH) continue;
      const result = sniff(start);
      if (!result.ok) return result;
      path = result.path;
      recognized = result.recognized;
      sniffed = true;
      splitter.push(start);
    } else {
      splitter.push(piece);
    }
    if (failure) return { ok: false, error: failure };
    if (onRow) for (const { table, row } of pending) await onRow(table, row);
    pending = [];
  }
  if (!sniffed) {
    const result = sniff(start);
    if (!result.ok) return result;
    path = result.path;
    recognized = result.recognized;
    splitter.push(start);
    if (onRow) for (const { table, row } of pending) await onRow(table, row);
    pending = [];
  }
  if (failure) return { ok: false, error: failure };

  const skeleton = splitter.finish();
  // A file that starts like our backup but is cut off (an interrupted copy) is damaged.
  if (skeleton === null && recognized) return { ok: false, error: 'invalidData' };
  const header = checkHeader(skeleton);
  if (!header.ok) return header;
  return { ok: true, header: header.header, counts, activeDictionaries, activeWords };
}

/** What the restore preview shows. Deleted rows are in the file but not counted. */
export interface BackupSummary {
  dictionaries: number;
  words: number;
  reviews: number;
  exportedAt: string;
}

export function summaryOf(result: Extract<ScanResult, { ok: true }>): BackupSummary {
  return {
    dictionaries: result.activeDictionaries,
    words: result.activeWords,
    reviews: result.counts.reviewLogs,
    exportedAt: result.header.exportedAt,
  };
}

/** Parses a whole backup held in memory (small files, tests). */
export async function parseBackup(text: string): Promise<ParseResult> {
  const data = Object.fromEntries(BACKUP_TABLES.map((t) => [t, []])) as unknown as Record<
    BackupTable,
    Record<string, unknown>[]
  >;
  const result = await scanBackup([text], (table, row) => {
    data[table].push(row);
  });
  if (!result.ok) return result;
  // Every row was checked against its table's columns.
  return { ok: true, backup: { ...result.header, data: data as unknown as BackupData } as Backup };
}
