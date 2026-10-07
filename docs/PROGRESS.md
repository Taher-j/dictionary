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
| 7 — Practice modes | Done (iOS unverified) |
| 8 — Statistics and motivation | Not started |
| 9 — Capture from anywhere | Not started |
| 10 — Polish, accessibility, performance | Not started |
| 11 — Release preparation | Not started |

(Rows are in build order: 4 comes before 3.)

## Current milestone: 7 — Practice modes (done; owner trial continues)

Milestone 5's checklist is in git history (`docs/PROGRESS.md` before Milestone 7). Plan approved on
2026-10-07: part A (directions and modes), phone check, then part B (free practice and extras).

### Tasks — part A

- [x] `expo-speech`; dev build; TTS voices on the S24 Ultra: en 52, de 9, ar 9; speech plays
      (Google TTS). Typing umlauts and Arabic on the Samsung keyboard: owner to check
- [x] Both directions per dictionary: recall cards, toggle in the dictionary menu, queue filter
- [x] Sibling rule in the queue
- [x] Modes: `grade()` for typing and multiple choice, distractor picker, mode choice per card,
      "Flashcards only" setting
- [x] Review screen renders all three modes; one rating per card per session
- [x] Tests: grading, distractors, mode choice, sibling rule

### Tasks — part B

- [x] Free practice (dictionary, tag, weak words), logged with `scheduled = 0`
- [x] Weak-words query; leech prompt
- [x] Speak button (`src/services/speech.ts`, voice check); lookup links

### Done-when checks

- [x] Each mode's `grade()` has unit tests, including alternatives and one-edit tolerance
- [x] A 20-card session mixes all three modes: test (`practiceSession.test.ts`) and phone
      (2026-10-07, seeded data: 16 choice, 11 flashcard, 2 typing in one session)
- [x] A test asserts that free practice leaves every card's state and due date unchanged
      (`freePractice.test.ts`; phone 2026-10-07: 14-card practice, all 14 cards unchanged, 14 logs
      with `scheduled = 0` in all three modes)

### Checked on the phone (2026-10-07)

Speech voices (en 52, de 9, ar 9) and playback; a 20-card review mixing all three modes; practice
setup and session; speak button and lookup link (Chrome opened Wiktionary). Not observed: the
leech prompt (needs 8 lapses; unit-tested). Owner to check: typing umlauts and Arabic on the
Samsung keyboard (adb cannot type them).

### Next steps

1. Owner trial continues; collect annoyances. Q8 (more practice games) is open.
2. Remaining V1 milestones: 6 (import/export, bulk edits), 8 (statistics), 9 (capture), then 10
   and 11.

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
| 2026-10-07 | Milestone 7: recall cards, sibling rule, typing and multiple choice in reviews, practice setup and sessions, weak words, leech prompt, speech, lookup links; fixed mode switching under feedback | Owner trial; Q8; next V1 milestone |
