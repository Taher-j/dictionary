# Data model

Nine tables (eight plus the `word_tags` join table), and the `words_fts` search index. Words hold content, cards hold scheduling state, and the review log is the permanent
record that all statistics are computed from. There is no statistics table.

Implement this in Drizzle (`src/data/db/schema.ts`). The SQL below is the reference for names,
types, constraints and indexes.

## Relationships

| Relationship | Cardinality | Note |
| --- | --- | --- |
| dictionary -> words | 1 to many | A word belongs to exactly one dictionary. Moving it is an update. |
| word -> cards | 1 to 0, 1 or 2 | None while incomplete; one for recognition; a second if the dictionary practises both directions (V1). |
| card -> review_logs | 1 to many | Append-only. |
| session -> review_logs | 1 to many | Groups answers for the summary screen. |
| words <-> tags | many to many | Through `word_tags`. Tags are global, not per dictionary. |
| import_batch -> words | 1 to many | Makes "Undo import" one query. |

## Schema

```sql
CREATE TABLE dictionaries (
  id              TEXT PRIMARY KEY,            -- UUIDv7, generated on device
  name            TEXT NOT NULL,
  icon            TEXT,                        -- emoji
  color           TEXT,
  term_lang       TEXT,                        -- BCP 47, e.g. 'de'
  meaning_lang    TEXT,
  both_directions INTEGER NOT NULL DEFAULT 0,  -- V1: also create recall cards
  in_daily_review INTEGER NOT NULL DEFAULT 1,
  lookup_url      TEXT,                        -- V1: 'https://de.wiktionary.org/wiki/{term}'
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,            -- epoch ms
  updated_at      INTEGER NOT NULL,
  deleted_at      INTEGER
);

CREATE TABLE import_batches (
  id            TEXT PRIMARY KEY,
  dictionary_id TEXT NOT NULL REFERENCES dictionaries(id),
  file_name     TEXT,
  rows_total    INTEGER NOT NULL,
  rows_imported INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE words (
  id              TEXT PRIMARY KEY,
  dictionary_id   TEXT NOT NULL REFERENCES dictionaries(id),
  term            TEXT NOT NULL,
  term_norm       TEXT NOT NULL,   -- exact-duplicate key
  term_fold       TEXT NOT NULL,   -- accent-folded: possible duplicates, sorting, prefix search
  translation     TEXT,
  definition      TEXT,
  example         TEXT,
  part_of_speech  TEXT,
  forms           TEXT,            -- free text: 'der, pl. -e' or 'went, gone'
  pronunciation   TEXT,
  notes           TEXT,
  source          TEXT,            -- where the word was met
  starred         INTEGER NOT NULL DEFAULT 0,
  import_batch_id TEXT REFERENCES import_batches(id),
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  deleted_at      INTEGER
);
CREATE INDEX words_dict_norm    ON words (dictionary_id, term_norm);
CREATE INDEX words_dict_fold    ON words (dictionary_id, term_fold, id);
CREATE INDEX words_dict_created ON words (dictionary_id, created_at DESC);
CREATE INDEX words_fold         ON words (term_fold, id);  -- prefix search across dictionaries

CREATE TABLE tags (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  name_norm  TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE word_tags (
  word_id TEXT NOT NULL REFERENCES words(id),
  tag_id  TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (word_id, tag_id)
);  -- WITHOUT ROWID dropped: drizzle-kit cannot express it (see 08-decisions.md)
CREATE INDEX word_tags_tag ON word_tags (tag_id);

CREATE TABLE cards (
  id             TEXT PRIMARY KEY,
  word_id        TEXT NOT NULL REFERENCES words(id),
  direction      TEXT NOT NULL CHECK (direction IN ('recognition', 'recall')),
  state          INTEGER NOT NULL DEFAULT 0,  -- 0 new, 1 learning, 2 review, 3 relearning
  due            INTEGER NOT NULL,
  stability      REAL    NOT NULL DEFAULT 0,
  difficulty     REAL    NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  learning_steps INTEGER NOT NULL DEFAULT 0,
  reps           INTEGER NOT NULL DEFAULT 0,
  lapses         INTEGER NOT NULL DEFAULT 0,
  last_review    INTEGER,
  suspended      INTEGER NOT NULL DEFAULT 0,
  updated_at     INTEGER NOT NULL,
  UNIQUE (word_id, direction)
);
CREATE INDEX cards_due ON cards (due) WHERE suspended = 0;

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,        -- 'review' | 'practice'
  filter     TEXT,                 -- JSON: dictionary, tag, weak words
  started_at INTEGER NOT NULL,
  ended_at   INTEGER
);

CREATE TABLE review_logs (
  id          TEXT PRIMARY KEY,
  card_id     TEXT NOT NULL REFERENCES cards(id),
  session_id  TEXT REFERENCES sessions(id),
  reviewed_at INTEGER NOT NULL,
  rating      INTEGER NOT NULL,    -- 1 again, 2 hard, 3 good, 4 easy
  mode        TEXT NOT NULL,       -- 'flashcard' | 'typed' | 'choice' | ...
  scheduled   INTEGER NOT NULL,    -- 1 moved the schedule, 0 free practice
  duration_ms INTEGER,
  prev_card   TEXT                 -- JSON of the card before this review: undo and replay
);
CREATE INDEX review_logs_card ON review_logs (card_id, reviewed_at);
CREATE INDEX review_logs_time ON review_logs (reviewed_at);

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,        -- JSON
  updated_at INTEGER NOT NULL
);
```

The card columns mirror the `ts-fsrs` card object. Check the installed version's `Card` type and
keep the columns aligned with it; if the library's shape differs from the above, follow the
library and record the change in `08-decisions.md`.

## Rules

- **Ids** are UUIDv7 strings from `src/lib/ids.ts`. Never auto-increment integers.
- **`updated_at`** is set on every write. **Deletes are soft** (`deleted_at`); every read filters
  `deleted_at IS NULL` unless it is the trash view. Trashed words are purged after 30 days.
- **Tag changes bump the word's `updated_at`**, so `word_tags` needs no tombstones.
- **No unique constraint on `term_norm`.** Homonyms are legitimate. Warn, never block.
- **Settings live in SQLite**, not in AsyncStorage or MMKV, so one backup captures everything.
- **Foreign keys on** (`PRAGMA foreign_keys = ON`) and **WAL mode** at open.

## Card lifecycle

- A word with no translation and no definition is **incomplete** and has **no card**.
- When a word first gets a meaning, create its `recognition` card with `state = 0` and
  `due = now`, in the same transaction.
- If the meaning is later removed, keep the card unchanged (not deleted, not suspended). The word
  counts as incomplete again and queues skip it; when a meaning is added back, it returns with its
  schedule unchanged. `suspended` is only ever set by the user.
- `recall` cards are created only when the dictionary has `both_directions = 1` (V1).
- Soft-deleting a word hides its cards from every queue. Restoring the word brings them back unchanged.

## Term keys and duplicate detection

Two stored keys per word give three tiers. No fuzzy or edit-distance matching.

```ts
// src/domain/termKeys.ts
export interface TermKeys {
  norm: string;
  fold: string;
}

export function termKeys(raw: string): TermKeys {
  const norm = raw
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^["'“”‘’«»„]+|["'“”‘’«»„.,;:!?]+$/g, '')
    .toLowerCase();

  const fold = norm
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');

  return { norm, fold };
}
```

Only quotes and sentence punctuation are stripped, so `C++`, `C#` and `.NET` survive.
`toLowerCase()` is deliberately locale-independent.

| Tier | Rule | On manual add | On import (M6) |
| --- | --- | --- | --- |
| Exact | Same `term_norm`, same dictionary | Inline warning with a link to the existing word. Saving is still allowed. | Default Skip. Alternatives: fill empty fields, replace, keep both. |
| Possible | Same `term_fold`, different `term_norm` ("schon" / "schön") | Quieter hint. | Listed under Review. Default Import. |
| Elsewhere | Same `term_norm` in another dictionary | Note: "Also in <dictionary>". | Ignored. |

Unit tests for `termKeys` must include: case, surrounding whitespace, inner whitespace, quotes,
trailing punctuation, `C++` / `C#` / `.NET`, German umlauts and ß, a Turkish sample, an Arabic
sample, a Japanese sample, and full-width Latin characters (NFKC).

## Search, sorting, paging

- **Search** (decided in Milestone 1 by measurement, Q6): terms match by prefix on indexed
  `term_fold`; translations and definitions match anywhere through a **standalone** FTS5 table,
  maintained by the repository in the same transaction as the word write. All behind
  `WordRepository.search()`. With 50,000 words, `LIKE` took 100-140 ms on the owner's phone;
  FTS5 brought every search under 20 ms.

  ```sql
  CREATE VIRTUAL TABLE words_fts USING fts5(
    word_id, translation, definition,
    tokenize = 'trigram remove_diacritics 1'
  );
  ```

  - One row per word with a translation or definition. `word_id` is indexed too, so one word's
    row is found by `MATCH 'word_id : "<id>"'` instead of a full scan.
  - Meaning matches are case- and accent-insensitive. The trigram index needs three characters,
    so shorter queries match terms only.
  - Query shape: candidate ids (term prefix `UNION ALL` FTS matches) drive the query, then
    deleted words and other dictionaries are filtered out. Starting from the dictionary index
    instead scans the whole dictionary.
- **Filters** (Milestone 3) add conditions to the same queries: tag through `word_tags`, status on
  the joined recognition card (mirrors "Derived status" below), starred, incomplete. Measured on
  the owner's phone with 50,000 words (2026-10-07): search with a filter 14-17 ms, a rare tag
  4 ms; the broadest status filter (mature) 81 ms, because SQLite drives it from `cards` and sorts.
  Rewriting the card conditions so the scan follows `words_dict_fold` made broad filters about
  1 ms but filters with few matches 160 ms (full scan), so the bounded plan stays.
- **Do not use an external-content FTS table.** `words` has a text primary key, so its implicit
  rowid can be renumbered by `VACUUM`, which would corrupt an external-content index.
- **Sort A-Z by `term_fold`** (places "ä" next to "a" without ICU collation).
- **Keyset pagination** on `(term_fold, id)`; for "recent" order, on `(created_at, id)`; for
  filtered lists grouped by dictionary, on `(dictionary_id, term_fold, id)`.

## Derived status (never stored)

| Status | Rule |
| --- | --- |
| Incomplete | No translation and no definition (no card) |
| New | `cards.state = 0` |
| Learning | `cards.state IN (1, 3)` |
| Young | `cards.state = 2` and `scheduled_days < 21` |
| Mature | `cards.state = 2` and `scheduled_days >= 21` |
| Suspended | `cards.suspended = 1` |

There is no "Mastered" status.
