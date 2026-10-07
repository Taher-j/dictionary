# Milestones

Twelve milestones. 0-5 make the MVP. 6-9 are independent V1 milestones. 10-11 finish.

**Build order:** 0 -> 1 -> 2 -> 4 -> 3 -> 5 -> (use the app daily for two weeks) -> 6, 7, 9, 8 in
whatever order the owner chooses -> 10 -> 11.

Milestone 4 (review) is built before Milestone 3 (search) on purpose: reviewing is what makes the
app worth opening every day.

Rules for every milestone:

- Build only what is listed. Respect "Not yet".
- Accessibility, i18n and theming rules from `05-ux.md` apply to every screen from the start.
- Finish by running the done-when checks, updating `PROGRESS.md`, and listing anything that could
  only be verified on a device.

---

## Milestone 0 — Project setup

**Goal:** a development build on the owner's phone, with the skeleton every later screen stands on.

**Before starting:** Q1-Q5 are answered in `08-decisions.md` (placeholder name and ids, default OS
versions, Android first, pnpm). Use those values; do not ask again.

**Tasks**

1. Scaffold the Expo project in the repository root with the current default TypeScript template
   using pnpm (check `pnpm create expo-app --help` for current flags). The root already contains `CLAUDE.md`
   and `docs/`; scaffold into a temporary folder and move the result in if needed. If the template
   generates its own `CLAUDE.md` or `AGENTS.md`, keep this repository's `CLAUDE.md` and append the
   template's useful content under a heading "Expo template notes".
2. Confirm the SDK is 57 or newer (stable, not beta). Remove template demo screens and assets.
   Check Expo's current guidance for pnpm and add an `.npmrc` (for example `node-linker=hoisted`)
   only if the installed SDK still needs it.
3. Routes in `src/app`. Path alias `@/` -> `src/`. TypeScript `strict`.
4. ESLint (Expo config) + Prettier. Add the three lint rule groups from `02-architecture.md`
   (no literal UI strings, no left/right style properties, import boundaries).
5. Jest with one real test (for example `src/lib/ids.test.ts` for the UUIDv7 helper).
6. `package.json` scripts: `start`, `android`, `ios`, `lint`, `typecheck`, `test`, `check`.
7. App config: name, slug, URL scheme, iOS bundle identifier, Android package, taken from the
   placeholders in `08-decisions.md` and defined once as constants in `app.config.ts`. Add
   `expo-dev-client`. Use Continuous Native Generation: `android/` and `ios/` are git-ignored.
8. `src/ui`: tokens, light and dark theme, `Screen` (safe areas + optional footer slot), `Text`,
   `Button`, each with accessibility defaults.
9. `src/i18n`: i18next + `expo-localization`, `locales/en.json`.
10. Root layout with providers: TanStack Query, theme, i18n.
11. Tabs: Today, Library, [+], Stats, Settings as placeholder screens. `/add` modal placeholder
    that displays the `term` query parameter.
12. `src/lib`: `ids.ts` (UUIDv7), `clock.ts` (injectable `now`).
13. `git init`, `.gitignore`, short `README.md`, first commit.

**Decisions:** none open. Q1 and Q2 hold placeholders (see `08-decisions.md`).

**Depends on:** nothing.

**Done when**

- `pnpm check` passes.
- The dev build installs and launches on the owner's Android phone. iOS is checked if a Mac is
  available; otherwise note it as unverified.
- Tabs and the add button render correctly in light and dark themes.
- Opening `<scheme>://add?term=hello` shows the quick-add placeholder with "hello".
- Lint fails on: a hard-coded JSX string, `marginLeft`, and a `react` import under `src/domain`
  (prove each with a temporary file, then delete it).
- No template leftovers remain.

**Not yet:** database, real screens, any feature, any dependency for later milestones.

---

## Milestone 1 — Data layer

**Goal:** schema, migrations and repositories proven against 50,000 seeded words.

**Tasks**

1. `expo-sqlite` + Drizzle + drizzle-kit. Schema for all eight tables per `03-data-model.md`.
2. `src/data/db/client.ts`: open the database, WAL mode, foreign keys on, snapshot if migrations
   are pending, run migrations.
3. `src/domain/models.ts`: domain types and branded id types.
4. `src/domain/termKeys.ts` with the full unit-test list from `03-data-model.md`.
5. Repositories (interface + SQLite implementation) for dictionaries, words, tags, cards,
   review logs, settings. Soft deletes, `updated_at`, keyset pagination.
6. `RepositoriesProvider` and `queryKeys.ts`.
7. Repository tests in Node with `better-sqlite3` using the same schema and migrations.
8. Dev-only screen (reachable from Settings in development builds): seed 50,000 words and
   200,000 review logs; wipe all data; time list and search queries and show the results.

**Decisions:** Q6 — `LIKE` or FTS5, from the timing on a real phone. Record it.

**Depends on:** Milestone 0.

**Done when**

- Migrations run from an empty database and repository tests pass.
- With 50,000 words on the phone, first list page and a search each return in under 100 ms
  (or FTS5 has been added and they do).
- Every user-editable table has `id`, `updated_at`, `deleted_at`.
- A lint rule stops any file outside `src/data` from importing the database.

**Not yet:** user-facing UI, backup, anything sync-related beyond the three columns.

---

## Milestone 2 — Dictionaries and words

**Goal:** capture and browse. The app replaces a notes app for vocabulary.

**Features**

- First-launch sheet (create first dictionary -> quick add).
- Library: dictionary list with counts; create, rename, delete, reorder.
- Dictionary screen: word list, sort A-Z / recent.
- Quick add (`/add`) per `05-ux.md`, with inline duplicate warning.
- Word detail with in-place editing, star, move to dictionary, delete.
- Trash (Settings): list, restore, purge after 30 days.
- Inbox: incomplete words, reachable from Today.

**Technical work:** FlashList with `useInfiniteQuery` and keyset cursors; card creation when a word
first gets a meaning (see "Card lifecycle"); toast component; `src/services/haptics.ts`.

**Depends on:** Milestone 1.

**Done when**

- A word can be added from any tab in about five seconds (open, type, save).
- A seeded 50,000-word dictionary scrolls without dropped rows or visible blanks.
- Exact and possible duplicates produce the right inline messages.
- Delete, restore and purge work; a restored word keeps its card.
- Completing an incomplete word creates exactly one recognition card.

**Not yet:** tag screens, cross-dictionary search, filters, import, review.

---

## Milestone 3 — Search, tags and filters

**Goal:** any word found within two seconds.

**Features**

- Global search in Library, results grouped by dictionary.
- Filter chips/sheet: dictionary, tag, status, starred, incomplete.
- Tags on words with autocomplete; tag management in Settings (rename, merge, delete).

**Technical work:** debounced search hook; the shared `WordQuery` object; status filter joins `cards`.

**Decisions:** tag names are unique regardless of case (`name_norm`).

**Depends on:** Milestone 2 (and Milestone 4 for the status filter values).

**Done when**

- Search-as-you-type shows no visible lag at 50,000 words.
- Filter combinations are covered by repository tests.
- Renaming or merging a tag updates every word that had it.

**Not yet:** bulk actions, saved filters, FTS unless measurement demanded it.

---

## Milestone 4 — Review core

**Goal:** the daily habit loop works end to end.

**Features**

- Today screen per `05-ux.md` with due and new counts.
- Flashcard session: reveal, four ratings with interval previews, progress, undo, edit card.
- New-word limit and session cap (settings), in-session requeue, suspend.
- Session summary with missed words.
- Derived status on word detail.

**Technical work:** everything in `04-learning-system.md` marked MVP — `scheduler.ts`, `studyDay.ts`,
`buildQueue`, `sessionReducer`, flashcard mode, transactional answer writes, Zustand session store,
card flip with reduced-motion fallback.

**Depends on:** Milestone 2.

**Done when**

- All "Required tests" in `04-learning-system.md` pass.
- Killing the app mid-session loses no answered card.
- A full session works with a screen reader.

**Not yet:** other modes, recall direction, free practice, Stats tab, reminders.

---

## Milestone 5 — Backup and restore (MVP gate)

**Goal:** real data is safe. From here the owner uses the app daily.

**Features**

- "Back up now" (JSON through the share sheet), last-backup date.
- Restore with preview, replace mode. "Restore a backup" link on the first-launch sheet.
- Daily snapshots, snapshot list and restore in Settings.
- Backup reminder banner on Today.

**Technical work:** everything in `06-data-safety.md` marked M5 — chunked serializer, format
version + upgrade chain, `src/services/files.ts`, snapshot service, migration fixture test.

**Depends on:** Milestones 1 and 4.

**Before starting:** the owner fixes the final Android package and iOS bundle identifier (Q2).
After this milestone the app holds real data, and on Android a different package name is a
different app: its data only moves across by backup and restore. (Deferred to release by the
owner, 2026-10-07: the move will go through backup and restore.)

**Done when**

- Back up, wipe the app, restore: every row count and every card's due date matches.
- A Jest round-trip test (serialize -> parse -> restore into an empty database) passes.
- A malformed or foreign JSON file produces a message, not a crash.

**Not yet:** merge restore, scheduled or cloud-folder backups, encrypted backups.

**Stop here.** The owner uses the app for at least two weeks and collects annoyances. That list
orders Milestones 6-9.

---

## Milestone 6 — Import, export and bulk edits

**Goal:** existing lists get in; any data gets out.

**Prototype first:** parse a real 50,000-row XLSX file on a mid-range phone. Record time and
memory. Adjust the caps in `06-data-safety.md` if needed.

**Features**

- Import wizard for CSV and XLSX: file, sheet, column mapping with preview rows, options (target
  dictionary, duplicate policy, tag for the batch), plan summary, progress, result, undo.
- Export: dictionary, selection or everything; XLSX and CSV. Sample CSV.
- Multi-select in lists: move, tag, suspend, delete.
- Restore in merge mode.

**Technical work:** the import pipeline and export rules in `06-data-safety.md`; vendored SheetJS;
Papa Parse; `import_batches`.

**Depends on:** Milestones 2 and 5.

**Done when**

- A 50,000-row file imports with a moving progress bar and a responsive screen.
- Empty, malformed and oversized files each produce a clear message.
- Undo removes exactly the batch. Export then import round-trips words and tags.
- Merging the same backup twice changes nothing (test).

**Not yet:** Anki packages, Google Sheets, any cloud source.

---

## Milestone 7 — Practice modes

**Goal:** richer sessions on the unchanged loop.

**Prototype first:** typing with autocorrect off on the system keyboards (including umlauts and a
non-Latin script); TTS voices available for the owner's languages.

**Features**

- Recall direction per dictionary (`both_directions`), sibling rule.
- Typing mode and multiple choice; mixed sessions by card state; "flashcards only" setting.
- Free practice by dictionary or tag; weak-words queue; leech prompt.
- Speak button; lookup links.

**Technical work:** `PracticeMode` objects and renderers; answer comparison; distractor picker;
`scheduled = 0` logging; `src/services/speech.ts` with a voice check.

**Depends on:** Milestone 4.

**Done when**

- Each mode's `grade()` has unit tests, including alternatives and one-edit tolerance.
- A 20-card session mixes all three modes.
- A test asserts that free practice leaves every card's state and due date unchanged.

**Not yet:** fill in the blank, matching, dictation, speed round.

---

## Milestone 8 — Statistics and motivation

**Goal:** show whether the schedule is working; nudge the habit.

**Features**

- Stats tab: seven-day due forecast; retention over 30 days (review-state cards not rated Again);
  New / Learning / Young / Mature per dictionary; activity heatmap with current streak; hardest words.
- Local daily reminder with a time picker. Permission is requested only when the user turns it on.
- Catch-up mode (spread a backlog over several days). Target retention setting.

**Technical work:** aggregate queries over `review_logs` and `cards`; hand-drawn SVG charts;
`src/services/notifications.ts`.

**Decisions:** streak rule — at least one scheduled review in a study day. Reminder text is generic
(no counts that can go stale).

**Depends on:** Milestone 4.

**Done when**

- Every number on the screen is reproduced by a test over fixture logs.
- The tab loads in under 200 ms with 200,000 log rows.
- The reminder fires at the chosen time on both platforms.

**Not yet:** XP, achievements, more charts, push notifications.

---

## Milestone 9 — Capture from anywhere

**Goal:** adding a word from another app takes two taps.

**Prototype first:** iOS share extension opening the app with the shared text, on a real device.
Expo's docs warn that opening the main app from a share extension is not officially supported by
Apple. If it is unreliable, fall back to an iOS Shortcut that opens the `/add` deep link.

**Features**

- Share text to the app: Android first, then iOS.
- When a sentence is shared: tap the word to use as the term; keep the sentence as the example
  and the URL (if any) as the source.
- App shortcut (long-press the icon): "Add word".

**Technical work:** `expo-sharing` config plugin (receive side); `+native-intent.ts` routing into
`/add`; a simple word splitter.

**Depends on:** Milestone 2 only.

**Done when:** sharing a word from the browser opens quick add prefilled, from both a cold and a
warm start, on each supported platform.

**Not yet:** widgets, clipboard detection, a browser extension.

---

## Milestone 10 — Polish, accessibility and performance

**Goal:** the app feels finished.

**Tasks**

- Empty and error states, final copy, complete Settings, icon and splash screen.
- TalkBack and VoiceOver walkthrough of every screen; 200% font-size pass; contrast check.
- Performance pass with 50,000 words and 200,000 logs on a mid-range phone.
- Maestro flows: add word, review session, backup and restore, import.
- Dependency licence check.

**Depends on:** everything before it.

**Done when:** all Maestro flows pass; cold start is under two seconds on the test phone; no screen
truncates text or fails the screen-reader walkthrough.

**Not yet:** new features.

---

## Milestone 11 — Release preparation

**Goal:** other people can install it.

**Tasks**

- About screen: version, licences, privacy statement.
- Release signing, screenshots, store listings, privacy policy page on a free static host.
- Android: developer verification; Google Play closed test (12 testers for 14 continuous days on
  a new personal account).
- iOS: Apple Developer Program, TestFlight, privacy labels ("Data not collected").
- Try removing Android's INTERNET permission from release builds.
- Freeze backup `formatVersion` 1.

**Depends on:** Milestone 10.

**Done when:** a stranger can install, add a word, review, back up and restore without help.

**Not yet:** monetisation, analytics, sync.
