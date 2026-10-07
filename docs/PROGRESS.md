# Progress

Read this first in every session. Update it before stopping: tick what is done, note what is next,
and add one line to the session log.

## Status

| Milestone | Status |
| --- | --- |
| 0 — Project setup | Done (iOS unverified) |
| 1 — Data layer | Done (iOS unverified) |
| 2 — Dictionaries and words | Done (iOS unverified) |
| 4 — Review core | In progress (code done; device checks left) |
| 3 — Search, tags and filters | Not started |
| 5 — Backup and restore (MVP gate) | Not started |
| 6 — Import, export and bulk edits | Not started |
| 7 — Practice modes | Not started |
| 8 — Statistics and motivation | Not started |
| 9 — Capture from anywhere | Not started |
| 10 — Polish, accessibility, performance | Not started |
| 11 — Release preparation | Not started |

(Rows are in build order: 4 comes before 3.)

## Current milestone: 4 — Review core (in progress; pick up at "Next steps")

Milestone 2's checklist is in git history (`docs/PROGRESS.md` before Milestone 4). Plan approved on
2026-10-06 with: no automatic suspend, 10 s per card for the estimate, Suspend in the session menu
and word detail. Also decided: review cards are due by study day (see `08-decisions.md`).

### Tasks

- [x] `ts-fsrs` 5.4.2; `scheduler.ts`, `studyDay.ts`, `queue.ts` (`buildQueue`), `session.ts`
      (`sessionReducer`), `intervals.ts`, with tests
- [x] `ReviewRepository`: queue candidates, Today summary, introduced-today count, due tomorrow,
      sessions, transactional `answer`, `undoAnswer`; `cards.setSuspendedForWord`
- [x] Removing a meaning no longer suspends the card; status is "incomplete" without a meaning
- [x] Today: review card (counts, estimate, Start, "All caught up" + next review), Recently added
- [x] Review session `/review`: flip (crossfade with reduced motion), ratings with intervals,
      progress, undo, edit, "I know this"; summary with missed words, due tomorrow, Keep going
- [x] Settings: new words per day, cards per session; word detail: next review, Suspend/Unsuspend
- [x] Zustand session store (ids only)

### Done-when checks

- [x] All "Required tests" in `04-learning-system.md` pass (`pnpm check`: 97 tests)
- [x] Killing the app mid-session loses no answered card: answered Good, force-stopped 0.3 s later;
      card and log row were in the database (adb, 2026-10-06)
- [ ] A full session with a screen reader: labels checked in the UI dump ("Good, next review in 10
      minutes", answer read as the meaning); a full TalkBack session needs the owner

### Checked on the phone (dev build, 2026-10-06)

Reveal and flip, rating intervals for a new card (1 min / 6 min / 10 min / 8 d), Again requeues,
Undo restores the card (state New, reps 0) and deletes the log, summary, Today counts after
relaunch, "All caught up" with next review time, word detail "Young" + next review date, Suspend
and Unsuspend from word detail keep the schedule.

2026-10-07: "I know this" suspends the card (no log, schedule kept) and moves on; with Remove
animations on, the reveal crossfades (screen recording); the normal flip is unchanged. Found and
fixed: seeded cards had memory states ts-fsrs rejects (crash on reveal); Reanimated skipped the
crossfade under reduced motion.

### Next steps

1. Owner: one full session with TalkBack.
2. Done 2026-10-07: data deleted, release build installed (not debuggable, opens on the
   first-launch sheet with an empty database). Do the TalkBack session on it.
3. Tick the last done-when check, set Milestone 4 to Done, plan Milestone 3.

### Known issues

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
