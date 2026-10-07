# Progress

Read this first in every session. Update it before stopping: tick what is done, note what is next,
and add one line to the session log.

## Status

| Milestone | Status |
| --- | --- |
| 0 — Project setup | Done (iOS unverified) |
| 1 — Data layer | Done (iOS unverified) |
| 2 — Dictionaries and words | Done (iOS unverified) |
| 4 — Review core | Done (iOS unverified) |
| 3 — Search, tags and filters | Done (iOS unverified) |
| 5 — Backup and restore (MVP gate) | Done (iOS unverified) |
| 6 — Import, export and bulk edits | Not started |
| 7 — Practice modes | Not started |
| 8 — Statistics and motivation | Not started |
| 9 — Capture from anywhere | Not started |
| 10 — Polish, accessibility, performance | Not started |
| 11 — Release preparation | Not started |

(Rows are in build order: 4 comes before 3.)

## Current milestone: 5 — Backup and restore (done; owner trial period)

Milestone 3's checklist and the between-milestones work are in git history (`docs/PROGRESS.md`
before Milestone 5). Plan approved on 2026-10-07 with: snapshot restore copies rows into the open
database (same schema version only); restore reads the whole backup file, measured on the phone.
Q2 deferred to release.

### Tasks

- [x] `expo-sharing`, `expo-document-picker`; new dev build
- [x] `src/domain/backup/`: format, validation, upgrade chain (header and rows), row checks,
      splitter for reading in pieces
- [x] Backup writer: table by table, paged by rowid, tombstones included
- [x] Replace restore: snapshot, one transaction, search index rebuilt, preferences applied
- [x] `src/services/files.ts`: cache file, share sheet, pick, read in 512 KB pieces
- [x] Snapshots: daily on first launch of the study day; list and restore in Settings
- [x] Screens: Backup and restore, first-launch "Restore a backup", Today reminder banner
- [x] Tests: round trip, malformed/foreign/cut-off files, splitter (any piece size, UTF-8),
      upgrade chain, reminder rule, migration fixture (`schema-3.db`)
- [x] Phone: back up, wipe, restore at 50,000 words / 200,000 reviews

### Done-when checks

- [x] Back up, wipe the app, restore: every row count and every card's due date matches. Phone,
      2026-10-07: counts of all tables and fingerprints of all card schedules, words and review
      logs identical before and after
- [x] A Jest round-trip test (serialize -> parse -> restore into an empty database) passes
- [x] A malformed or foreign JSON file produces a message, not a crash (tests; on the phone: a
      foreign JSON file, a cut-off backup)

### Measured on the phone (50,000 words, 200,000 reviews, 80.5 MB file)

Back up about 23 s; preview (read and check every row) under 10 s; replace restore about 65 s
with progress; snapshot restore about 4 s. Snapshots of this database are about 106 MB each
(five kept). Real data is far smaller.

### Next steps

1. **Stop here** (07-milestones.md): the owner uses the app daily for at least two weeks and
   collects annoyances; that list orders Milestones 6-9.
2. Done 2026-10-07: seed data removed with the new dev tool (the owner's 7 words, schedules and
   tags verified unchanged), release build installed.
   The three older snapshots on the phone still contain the seed data (about 236 MB); they rotate
   out as new daily snapshots are taken (five kept).
3. Not checked on the phone: "Back up now" through a real share target (the file was copied out
   with adb), restore on iOS.

### Known issues

- TalkBack: after the reveal the answer is not read correctly (owner, 2026-10-07, English → Arabic
  dictionary). Not investigated; likely the Arabic meaning read by the English voice. Parked by
  the owner; revisit in Milestone 10 (accessibility).
- Developer tools: "Delete all data" runs without a confirmation (dev builds only). A stray tap
  wiped the seeded data on 2026-10-07.
- In quick add with the keyboard closed, a toast (for example "moved to the trash" after deleting
  from a word opened via the duplicate link) covers the Save button until it times out.
- Restoring a word gives no duplicate warning when a word with the same `term_norm` was added while
  it was in the trash. The docs do not cover this case yet.

## Verified on device only (owner to confirm)

- M0, checked by Claude over adb on the S24 Ultra on 2026-10-05: tabs in dark and light, [+] opens
  quick add, `dictionaryapp://add?term=hello` shows "hello" while the app is running, Back from it
  returns to the tabs. A cold-start deep link only reaches the dev-client launcher (dev-build
  behaviour; recheck with a release build later).
- M1, checked by Claude over adb on 2026-10-05: database opens and migrates on the phone; with
  pending migrations a `snapshots/snapshot-…-pre-migrate.db` was written first; seeding 50,000
  words and 200,000 logs takes about 70 s; WAL stays at 32 MB after bulk writes.
- M2, checked by Claude over adb on 2026-10-06: buttons and toast stay above the keyboard; Save
  closes the keyboard. 50,000-word scrolling checked on 2026-10-05. First-launch sheet opens on a
  fresh install of the release build; with the keyboard open it shows title, fields and Save
  (fixed on 2026-10-06: sheets no longer avoid the keyboard twice).
- iOS build: not verified, needs a Mac.

## Session log

| Date | What was done | Next |
| --- | --- | --- |
| 2026-10-05 | Milestone 0: scaffold (SDK 57.0.26), tooling, lint rules, ui kit, i18n, tab shell, dev build on Android | Milestone 1 — Data layer (plan first) |
| 2026-10-05 | Milestone 1: schema + 3 migrations, repositories, startup with snapshot, dev tools; Q6 decided (FTS5); fixed WAL growth | Milestone 2 — Dictionaries and words (plan first) |
| 2026-10-05/06 | Milestone 2: Library, dictionary list, quick add, word detail, Inbox, Trash; keyboard-controller | Milestone 4 — Review core (plan first) |
| 2026-10-06 | M2 wrap-up (keyboard, sheet fix), release build; M4 domain, data and UI, most phone checks | M4 next steps above, then Milestone 3 |
| 2026-10-07 | M4 phone checks: "I know this", reduced-motion crossfade; fixed seeder memory states and skipped crossfade; Q7 opened | TalkBack session (owner) on the release build, then Milestone 3 |
| 2026-10-07 | M4 done (TalkBack issue parked). Milestone 3: filters in repositories, tag merge/rename/delete, Library search and chips, word tags, Settings → Tags, seeded tags | Q2, then plan Milestone 5 |
| 2026-10-07 | Owner test pass: action sheet animation, tab labels, Theme and Language settings, German and Arabic (RTL) | Q2, then plan Milestone 5 |
| 2026-10-07 | Milestone 5: backup format, writer, streaming restore, snapshots (daily, list, restore), screens, reminder; phone round trip at 50,000 words | Owner trial (two weeks), then order Milestones 6-9 |
