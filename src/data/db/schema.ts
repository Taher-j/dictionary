// Drizzle schema. Reference: docs/03-data-model.md. Timestamps are epoch milliseconds.
// Never edit a committed migration: change this file, then run `pnpm db:generate`.
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core';

export const dictionaries = sqliteTable('dictionaries', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  termLang: text('term_lang'),
  meaningLang: text('meaning_lang'),
  bothDirections: integer('both_directions', { mode: 'boolean' }).notNull().default(false),
  inDailyReview: integer('in_daily_review', { mode: 'boolean' }).notNull().default(true),
  lookupUrl: text('lookup_url'),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const importBatches = sqliteTable('import_batches', {
  id: text('id').primaryKey(),
  dictionaryId: text('dictionary_id')
    .notNull()
    .references(() => dictionaries.id),
  fileName: text('file_name'),
  rowsTotal: integer('rows_total').notNull(),
  rowsImported: integer('rows_imported').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const words = sqliteTable(
  'words',
  {
    id: text('id').primaryKey(),
    dictionaryId: text('dictionary_id')
      .notNull()
      .references(() => dictionaries.id),
    term: text('term').notNull(),
    termNorm: text('term_norm').notNull(),
    termFold: text('term_fold').notNull(),
    translation: text('translation'),
    definition: text('definition'),
    example: text('example'),
    partOfSpeech: text('part_of_speech'),
    forms: text('forms'),
    pronunciation: text('pronunciation'),
    notes: text('notes'),
    source: text('source'),
    starred: integer('starred', { mode: 'boolean' }).notNull().default(false),
    importBatchId: text('import_batch_id').references(() => importBatches.id),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    deletedAt: integer('deleted_at'),
  },
  (t) => [
    // No unique constraint on term_norm: homonyms are legitimate.
    index('words_dict_norm').on(t.dictionaryId, t.termNorm),
    index('words_dict_fold').on(t.dictionaryId, t.termFold, t.id),
    index('words_dict_created').on(t.dictionaryId, sql`${t.createdAt} DESC`),
  ],
);

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameNorm: text('name_norm').notNull().unique(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const wordTags = sqliteTable(
  'word_tags',
  {
    wordId: text('word_id')
      .notNull()
      .references(() => words.id),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id),
  },
  (t) => [primaryKey({ columns: [t.wordId, t.tagId] }), index('word_tags_tag').on(t.tagId)],
);

export const cards = sqliteTable(
  'cards',
  {
    id: text('id').primaryKey(),
    wordId: text('word_id')
      .notNull()
      .references(() => words.id),
    direction: text('direction', { enum: ['recognition', 'recall'] }).notNull(),
    state: integer('state').notNull().default(0),
    due: integer('due').notNull(),
    stability: real('stability').notNull().default(0),
    difficulty: real('difficulty').notNull().default(0),
    scheduledDays: integer('scheduled_days').notNull().default(0),
    learningSteps: integer('learning_steps').notNull().default(0),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    lastReview: integer('last_review'),
    suspended: integer('suspended', { mode: 'boolean' }).notNull().default(false),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    unique('cards_word_direction').on(t.wordId, t.direction),
    check('cards_direction_check', sql`${t.direction} IN ('recognition', 'recall')`),
    index('cards_due')
      .on(t.due)
      .where(sql`${t.suspended} = 0`),
  ],
);

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  filter: text('filter'),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
});

export const reviewLogs = sqliteTable(
  'review_logs',
  {
    id: text('id').primaryKey(),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id),
    sessionId: text('session_id').references(() => sessions.id),
    reviewedAt: integer('reviewed_at').notNull(),
    rating: integer('rating').notNull(),
    mode: text('mode').notNull(),
    scheduled: integer('scheduled', { mode: 'boolean' }).notNull(),
    durationMs: integer('duration_ms'),
    prevCard: text('prev_card'),
  },
  (t) => [
    index('review_logs_card').on(t.cardId, t.reviewedAt),
    index('review_logs_time').on(t.reviewedAt),
  ],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
