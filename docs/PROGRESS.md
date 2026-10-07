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
| 7 — Practice modes | In progress |
| 8 — Statistics and motivation | Not started |
| 9 — Capture from anywhere | Not started |
| 10 — Polish, accessibility, performance | Not started |
| 11 — Release preparation | Not started |

(Rows are in build order: 4 comes before 3.)

## Current milestone: 7 — Practice modes (in progress, during the owner's trial)

Milestone 5's checklist is in git history (`docs/PROGRESS.md` before Milestone 7). Plan approved on
2026-10-07: part A (directions and modes), phone check, then part B (free practice and extras).

### Tasks — part A

- [ ] `expo-speech`; dev build; prototype: TTS voices for en/de/ar, typing (umlauts, Arabic)
- [ ] Both directions per dictionary: recall cards, toggle in the dictionary menu, queue filter
- [ ] Sibling rule in the queue
- [ ] Modes: `grade()` for typing and multiple choice, distractor picker, mode choice per card,
      "Flashcards only" setting
- [ ] Review screen renders all three modes; one rating per card per session
- [ ] Tests: grading, distractors, mode choice, sibling rule

### Tasks — part B

- [ ] Free practice (dictionary, tag, weak words), logged with `scheduled = 0`
- [ ] Weak-words query; leech prompt
- [ ] Speak button (`src/services/speech.ts`, voice check); lookup links

### Done-when checks

- [ ] Each mode's `grade()` has unit tests, including alternatives and one-edit tolerance
- [ ] A 20-card session mixes all three modes
- [ ] A test asserts that free practice leaves every card's state and due date unchanged

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
