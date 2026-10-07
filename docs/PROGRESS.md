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
| 5 — Backup and restore (MVP gate) | Not started |
| 6 — Import, export and bulk edits | Not started |
| 7 — Practice modes | Not started |
| 8 — Statistics and motivation | Not started |
| 9 — Capture from anywhere | Not started |
| 10 — Polish, accessibility, performance | Not started |
| 11 — Release preparation | Not started |

(Rows are in build order: 4 comes before 3.)

## Current milestone: 3 — Search, tags and filters (done; next: plan Milestone 5)

Milestone 4's checklist is in git history (`docs/PROGRESS.md` before Milestone 3). Plan approved on
2026-10-07 with: filters without search text list the matching words grouped by dictionary;
renaming a tag to an existing name offers a merge (see `08-decisions.md`).

### Tasks

- [x] `WordQuery` gains `tagId`, `status`, `starred`; grouped sort for filtered lists
- [x] `WordRepository.list` and `search` apply every filter (status joins `cards`), with tests
- [x] `TagRepository`: merge, delete removes word links, rename conflict, prefix suggestions, counts
- [x] Library: debounced search, results grouped by dictionary, filter chips and picker sheets
      (filter state in Zustand)
- [x] Word detail: tag chips, "+ tag" with autocomplete, remove a tag
- [x] Settings → Tags: list with word counts, rename, merge, delete
- [x] Seeder adds tags (and stars); the benchmark times filtered queries
- [x] Phone: search-as-you-type at 50,000 words (dev build)

### Done-when checks

- [x] Search-as-you-type shows no visible lag at 50,000 words: screen recording while typing
      "kabe", results follow each letter, previous results stay until the next arrive; search
      14-17 ms with filters (phone benchmark, 2026-10-07)
- [x] Filter combinations are covered by repository tests (144 combinations against a reference
      filter, plus search and grouped paging)
- [x] Renaming or merging a tag updates every word that had it (repository tests)

### Checked on the phone (dev build, 2026-10-07)

Search grouped by dictionary, Status filter (Young), adding a tag on word detail, suggestion
chip, "Show words with this tag" opens Library filtered, Settings → Tags list with counts, rename.
Not tried on the phone: merge and delete (one tag only; covered by tests), rename conflict.
Broadest status filter (mature, grouped) takes 81 ms; see `03-data-model.md`.

### Between milestones (owner request, 2026-10-07)

- [x] Action sheets: backdrop fades, sheet slides (the dim layer slid up with the sheet)
- [x] Tab buttons: icon glyph no longer read by TalkBack before the tab name
- [x] Settings → Appearance: Theme (System / Light / Dark), Language (System / English / Deutsch)
- [x] German and Arabic translations (Arabic only via the system language); RTL layout for Arabic,
      headers included; restart prompt when the direction changes
- Checked on the phone: theme switch and persistence, German live switch (tabs, headers, numbers),
  Arabic via Android per-app language (layout, headers, lists, word detail), back to English.
  Not observed: the restart prompt at startup (Android ran the app when the per-app language
  changed, so the direction was already right). Arabic and German texts need a native check.
- New dev build installed (native change: supported locales).

### Next steps

1. Q2 (final package id and URL scheme) deferred to release by the owner; placeholders stay.
2. Plan Milestone 5 — Backup and restore (MVP gate).
3. The phone runs the dev build with seeded data (50,000 words) next to the owner's "English
   Arabic" dictionary (7 words, tag "core").

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
