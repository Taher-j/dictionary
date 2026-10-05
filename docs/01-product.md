# Product

## Vision

A private vocabulary notebook that remembers for you. Saving a word takes under five seconds,
and the app decides when the user needs to see it again.

Three promises:

1. **Capture is instant.** One field is enough to save. Everything else can wait.
2. **Review is one tap and about five minutes.** The home screen always answers "what should I do
   now?" with a single button.
3. **The data is yours.** It lives on the device, works offline, and leaves as an open file.

The app has no vocabulary content of its own. It is not a dictionary, a course, or a game.
Its value is capture speed and scheduling quality; those two get the polish budget.

## Core loop

Discover a word -> save it -> (complete it later) -> review it on schedule -> it comes back less often.

## Constraints

- Zero running cost: no backend, accounts, paid APIs, AI APIs, analytics, ads, or push infrastructure.
- Offline-first and local-first. No network code in the app.
- Android and iOS. No web, no desktop.
- Solo developer. Prefer the simple solution; no enterprise patterns.
- Store account fees are accepted for publishing. They are not "running cost".

## Scope by stage

### MVP (Milestones 0-5)

- Dictionaries: create, rename, delete, reorder; name, emoji, term language, meaning language,
  "include in daily review" toggle
- Words: quick add, full edit, detail screen, trash with restore, star, Inbox of incomplete words
- Duplicate warning on manual add
- Global tags: add, remove, filter
- Search by term and meaning; filter by dictionary, tag, status, starred, incomplete
- FSRS scheduling with self-graded flashcards, one direction (term -> meaning)
- Daily review from the home screen, new-word limit, session cap, undo last rating, suspend
- Full JSON backup and restore (replace mode), automatic local snapshots
- Dark mode, localisation scaffolding, accessibility baseline in shared components

### V1 (Milestones 6-9)

- CSV and XLSX import with column mapping, preview, duplicate handling, undo
- CSV and XLSX export of a dictionary, a selection, or everything
- Bulk actions (move, tag, suspend, delete); merge mode for restore; backup reminder
- Recall direction (meaning -> term), typing mode, multiple choice, mixed sessions
- Weak-words queue, leech prompts, free practice by dictionary or tag
- Speak button (device TTS), lookup links (URL template per dictionary)
- Stats tab, activity heatmap with streak, local daily reminder, catch-up mode
- Share-to-app, app shortcut, deep-link quick add, pick-a-word-from-shared-sentence

### V2 and later (not planned in detail)

- Fill in the blank, listen-and-type, matching
- iOS home-screen widget
- FSRS parameters optimised on the user's own review log
- Scheduled backup into a user-chosen folder
- Opt-in definition suggestions from Wiktionary
- Anki package import
- Cloud sync

### Avoid (do not build, do not stub)

- XP, levels, achievements, leaderboards
- Speed round
- Clipboard detection (a Paste button in quick add is fine)
- Edit-distance / fuzzy duplicate matching
- Images or audio recordings attached to words
- A modelled "senses" structure for multiple meanings (free text is enough)
- App lock or PIN
- Dictionary archive, dictionary duplicate, dictionary description
- A user-set "difficulty" field or user-set learning status (both are derived from scheduling)
- Any statistics table (statistics are queries over the review log)

## Concepts

| Term | Meaning |
| --- | --- |
| Dictionary | A user-named collection of words, with a term language and a meaning language |
| Word | One entry: a term plus optional translation, definition, example, forms, notes, tags |
| Incomplete word | A word with neither translation nor definition. It cannot be reviewed. Shown in the Inbox |
| Meaning | `translation` if present, otherwise `definition`. The "answer" side of a card |
| Card | Scheduling state for one word in one direction (recognition or recall) |
| Review | A scheduled session of due cards. The only thing that moves due dates |
| Free practice | Practice of a chosen dictionary, tag or weak words. Logged, but never reschedules |
| Leech | A card with 8 or more lapses |
| Study day | Rolls over at 04:00 local time, not midnight |
