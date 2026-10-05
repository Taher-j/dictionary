# Progress

Read this first in every session. Update it before stopping: tick what is done, note what is next,
and add one line to the session log.

## Status

| Milestone | Status |
| --- | --- |
| 0 — Project setup | Done (iOS unverified) |
| 1 — Data layer | Done (iOS unverified) |
| 2 — Dictionaries and words | Not started |
| 4 — Review core | Not started |
| 3 — Search, tags and filters | Not started |
| 5 — Backup and restore (MVP gate) | Not started |
| 6 — Import, export and bulk edits | Not started |
| 7 — Practice modes | Not started |
| 8 — Statistics and motivation | Not started |
| 9 — Capture from anywhere | Not started |
| 10 — Polish, accessibility, performance | Not started |
| 11 — Release preparation | Not started |

(Rows are in build order: 4 comes before 3.)

## Current milestone: 1 — Data layer (done; next is Milestone 2, start with a task plan)

Milestone 0 is done; its checklist is in git history (`docs/PROGRESS.md` before Milestone 1).

### Decisions

- [x] Q6 `LIKE` or FTS5: FTS5 for meanings, measured on the phone (see `08-decisions.md`)

### Tasks

- [x] `expo-sqlite` + Drizzle + drizzle-kit; schema for all tables; migrations `0000_init`,
      `0001_words_fold_index`, `0002_words_fts`
- [x] `client.ts`: WAL, foreign keys, `VACUUM INTO` snapshot when migrations are pending (keep 5),
      migrate
- [x] `src/domain/models.ts` with branded ids
- [x] `src/domain/termKeys.ts` with the full test list
- [x] Repositories: dictionaries, words, tags, cards, review logs, settings
- [x] `RepositoriesProvider` and `queryKeys.ts`
- [x] Repository tests in Node with `better-sqlite3`, same schema and migrations
- [x] Dev screen (Settings → Developer tools, dev builds only): seed, wipe, timings

### Done-when checks

- [x] Migrations run from an empty database and repository tests pass (59 tests, `pnpm check`)
- [x] 50,000 words on the phone: first list page and search under 100 ms (with FTS5; table below)
- [x] Every user-editable table has `id`, `updated_at`, `deleted_at` (tested)
- [x] Lint stops files outside `src/data` from importing the database (and `expo-file-system`
      outside `src/services`)

Timings on the S24 Ultra, 50,000 words / 45,017 cards / 200,000 review logs, median of 7 runs:

| Query | Before (LIKE) | After (FTS5) |
| --- | --- | --- |
| List A-Z, first page | 4.3 ms | 3.3 ms |
| List recent, first page | 5.1 ms | 3.0 ms |
| Search prefix "ka" (one dictionary) | 113.7 ms | 6.3 ms |
| Search "mountain" in meanings (one dictionary) | 121.8 ms | 15.7 ms |
| Search "mountain", all dictionaries | — | 16.0 ms |
| Search prefix "ka", all dictionaries | — | 7.5 ms |
| Search with no match | 102.4 ms | 0.9 ms |
| Duplicate check | 9.0 ms | 6.6 ms |

## Verified on device only (owner to confirm)

- M0, checked by Claude over adb on the S24 Ultra on 2026-10-05: tabs in dark and light, [+] opens
  quick add, `dictionaryapp://add?term=hello` shows "hello" while the app is running, Back from it
  returns to the tabs. A cold-start deep link only reaches the dev-client launcher (dev-build
  behaviour; recheck with a release build later).
- M1, checked by Claude over adb on 2026-10-05: database opens and migrates on the phone; with
  pending migrations a `snapshots/snapshot-…-pre-migrate.db` was written first; seeding 50,000
  words and 200,000 logs takes about 70 s; WAL stays at 32 MB after bulk writes.
- iOS build: not verified, needs a Mac.

## Session log

| Date | What was done | Next |
| --- | --- | --- |
| 2026-10-05 | Milestone 0: scaffold (SDK 57.0.26), tooling, lint rules, ui kit, i18n, tab shell, dev build on Android | Milestone 1 — Data layer (plan first) |
| 2026-10-05 | Milestone 1: schema + 3 migrations, repositories, startup with snapshot, dev tools; Q6 decided (FTS5); fixed WAL growth | Milestone 2 — Dictionaries and words (plan first) |
