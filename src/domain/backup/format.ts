// Backup file format (docs/06-data-safety.md). Plain TypeScript: rows are checked against the
// column lists below; the data layer maps them to and from the database.

export const BACKUP_FORMAT = 'dictionary-backup';
/** Bump when the JSON shape changes, and add an upgrade step in upgrade.ts. */
export const BACKUP_FORMAT_VERSION = 1;

type ColumnType = 'string' | 'string?' | 'number' | 'number?' | 'boolean';

/**
 * Columns per table, in the database's camelCase names. `words.importBatchId` is left out: import
 * history is not backed up, so restored words belong to no import batch.
 */
export const BACKUP_COLUMNS = {
  dictionaries: {
    id: 'string',
    name: 'string',
    icon: 'string?',
    color: 'string?',
    termLang: 'string?',
    meaningLang: 'string?',
    bothDirections: 'boolean',
    inDailyReview: 'boolean',
    lookupUrl: 'string?',
    position: 'number',
    createdAt: 'number',
    updatedAt: 'number',
    deletedAt: 'number?',
  },
  tags: {
    id: 'string',
    name: 'string',
    nameNorm: 'string',
    createdAt: 'number',
    updatedAt: 'number',
    deletedAt: 'number?',
  },
  words: {
    id: 'string',
    dictionaryId: 'string',
    term: 'string',
    termNorm: 'string',
    termFold: 'string',
    translation: 'string?',
    definition: 'string?',
    example: 'string?',
    partOfSpeech: 'string?',
    forms: 'string?',
    pronunciation: 'string?',
    notes: 'string?',
    source: 'string?',
    starred: 'boolean',
    createdAt: 'number',
    updatedAt: 'number',
    deletedAt: 'number?',
  },
  wordTags: { wordId: 'string', tagId: 'string' },
  sessions: {
    id: 'string',
    kind: 'string',
    filter: 'string?',
    startedAt: 'number',
    endedAt: 'number?',
  },
  cards: {
    id: 'string',
    wordId: 'string',
    direction: 'string',
    state: 'number',
    due: 'number',
    stability: 'number',
    difficulty: 'number',
    scheduledDays: 'number',
    learningSteps: 'number',
    reps: 'number',
    lapses: 'number',
    lastReview: 'number?',
    suspended: 'boolean',
    updatedAt: 'number',
  },
  reviewLogs: {
    id: 'string',
    cardId: 'string',
    sessionId: 'string?',
    reviewedAt: 'number',
    rating: 'number',
    mode: 'string',
    scheduled: 'boolean',
    durationMs: 'number?',
    prevCard: 'string?',
  },
  settings: { key: 'string', value: 'string', updatedAt: 'number' },
} as const satisfies Record<string, Record<string, ColumnType>>;

export type BackupTable = keyof typeof BACKUP_COLUMNS;

/** Parents before children: the order rows are written and restored in. */
export const BACKUP_TABLES: readonly BackupTable[] = [
  'dictionaries',
  'tags',
  'words',
  'wordTags',
  'sessions',
  'cards',
  'reviewLogs',
  'settings',
];

type ValueOf<T> = T extends 'string'
  ? string
  : T extends 'string?'
    ? string | null
    : T extends 'number'
      ? number
      : T extends 'number?'
        ? number | null
        : boolean;

export type BackupRow<T extends BackupTable> = {
  -readonly [K in keyof (typeof BACKUP_COLUMNS)[T]]: ValueOf<(typeof BACKUP_COLUMNS)[T][K]>;
};

export type BackupData = { [T in BackupTable]: BackupRow<T>[] };

export interface BackupHeader {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  /** Number of database migrations applied when the backup was written. */
  schemaVersion: number;
  /** ISO 8601. */
  exportedAt: string;
  app: { version: string; platform: string };
}

export interface Backup extends BackupHeader {
  data: BackupData;
}

/** Why a file could not be read as a backup. Each has its own message in the UI. */
export type BackupError = 'notJson' | 'notBackup' | 'newerVersion' | 'invalidData';

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: BackupError };

/** What the restore preview shows. Deleted rows are in the file but not counted. */
export interface BackupSummary {
  dictionaries: number;
  words: number;
  reviews: number;
  exportedAt: string;
}

export function summarize(backup: Backup): BackupSummary {
  return {
    dictionaries: backup.data.dictionaries.filter((d) => d.deletedAt === null).length,
    words: backup.data.words.filter((w) => w.deletedAt === null).length,
    reviews: backup.data.reviewLogs.length,
    exportedAt: backup.exportedAt,
  };
}

/** `dictionary-backup-2026-10-07.json`, from the local date. */
export function backupFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `dictionary-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}
