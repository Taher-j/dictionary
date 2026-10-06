# Progress

Read this first in every session. Update it before stopping: tick what is done, note what is next,
and add one line to the session log.

## Status

| Milestone | Status |
| --- | --- |
| 0 — Project setup | Done (iOS unverified) |
| 1 — Data layer | Done (iOS unverified) |
| 2 — Dictionaries and words | Done (iOS unverified) |
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

## Current milestone: 2 — Dictionaries and words (done; next is Milestone 4, start with a task plan)

Milestone 1's checklist and phone timings are in git history (`docs/PROGRESS.md` before Milestone 2).
Milestone 1 timings: every list and search query under 20 ms at 50,000 words with FTS5.

### Decisions

- [x] `expo-haptics`, `expo-clipboard`, `react-native-keyboard-controller` added (owner approved)
- [x] Reorder with up/down buttons; `/add?context=` prefills Example (see `08-decisions.md`)

### Tasks

- [x] Repositories: Library counts, reorder, Inbox list and count, trash list, purge after 30 days
      at startup, `lastDictionaryId` setting (66 tests)
- [x] UI kit: toast (Zustand store, screen-reader announcement), action sheet, text field, chip,
      icon button, list row, status badge; `services/haptics.ts`, `services/clipboard.ts`
- [x] Screens: first launch, Library, dictionary (FlashList, A-Z / recent), quick add, word detail,
      Inbox, Trash
- [x] Keyboard handling with `react-native-keyboard-controller`

### Done-when checks

- [x] Add a word from any tab in about five seconds: [+] is in the tab bar on every tab, quick add
      opens with the term focused, Save closes (checked over adb; owner to confirm by hand)
- [x] 50,000-word dictionary scrolls without blanks: fling over adb, 746 frames, p99 16 ms,
      0.5 % janky, no blank rows in screenshots taken mid-fling
- [x] Duplicate messages: covered by `duplicates.test.ts`; "Already in this dictionary" checked on
      the phone
- [x] Delete, restore, purge: repository tests; delete and restore from Trash checked on the phone,
      the restored word kept its card ("New")
- [x] Completing an incomplete word creates exactly one recognition card: repository test; on the
      phone the status changed from "Needs meaning" to "New"

### Known issues

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
