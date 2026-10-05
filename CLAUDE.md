# Personal Dictionary App

Offline-first mobile app (Android + iOS) for saving vocabulary into personal dictionaries and
reviewing it with spaced repetition. Solo project.

Hard constraint: **zero running cost**. No backend, no accounts, no paid APIs, no analytics,
no network code at all in the app.

## Read first, every session

1. `docs/PROGRESS.md` — current milestone, what is done, what is next. Update it before you stop.
2. `docs/07-milestones.md` — scope, done-when checks and "not yet" list for the current milestone.

Read on demand, when the task touches them:

| File | Covers |
| --- | --- |
| `docs/01-product.md` | Vision, scope per stage (MVP / V1 / V2), features we will not build |
| `docs/02-architecture.md` | Stack, layers, folder structure, patterns, testing |
| `docs/03-data-model.md` | SQLite schema, term keys, duplicate detection, search and paging |
| `docs/04-learning-system.md` | FSRS scheduling, card status, practice modes, session algorithm |
| `docs/05-ux.md` | Navigation, screens, accessibility, i18n, theming |
| `docs/06-data-safety.md` | Snapshots, backup format, restore, import/export, security rules |
| `docs/08-decisions.md` | Decision log and open questions |

## Working agreement

1. **One milestone at a time.** Build only what the current milestone lists. Every milestone has a
   "Not yet" list: do not build those things, not even as stubs.
2. **Plan before code.** At the start of a milestone, post a short task list and wait for approval.
3. **Done means the done-when checks pass.** Run `pnpm check` (lint + typecheck + tests) before
   reporting anything as finished. Say plainly what you could not verify (for example on a device).
4. **Verify APIs, do not recall them.** Expo, Expo Router, Drizzle, ts-fsrs and SheetJS change often.
   Check current docs before using an API (Expo: https://docs.expo.dev/llms.txt) and match the
   versions in `package.json`.
5. **Ask before adding a dependency** that is not listed in `docs/02-architecture.md`.
6. **Docs are the spec.** If code and docs disagree, or a doc looks wrong, stop and ask. When a
   decision is made, record it in `docs/08-decisions.md` and fix the affected doc in the same change.
7. **Small commits**, one concern each, conventional commit messages (`feat:`, `fix:`, `chore:`, ...).

## Stack

- Package manager: **pnpm** (never npm or yarn; `pnpm dlx` instead of `npx`)
- Expo SDK 57 or newer (stable), React Native, development builds (not Expo Go)
- Primary test device: Android. iOS is a target too and is verified when a Mac is available
- TypeScript, strict
- Expo Router (file-based routes in `src/app`)
- `expo-sqlite` + Drizzle ORM + drizzle-kit migrations
- TanStack Query for data read from repositories
- Zustand for interaction state only
- `ts-fsrs` for scheduling
- FlashList for long lists
- i18next + `expo-localization`
- Jest for domain and repository tests; Maestro for a few end-to-end flows (from Milestone 10)

Full table with reasons: `docs/02-architecture.md`.

## Commands

These scripts are created in Milestone 0. Keep this list in sync with `package.json`.

```bash
pnpm android         # build and run the dev build on Android
pnpm ios             # build and run the dev build on iOS
pnpm start           # start Metro for an installed dev build
pnpm lint
pnpm typecheck
pnpm test
pnpm check           # lint + typecheck + test; must pass before a task is "done"
pnpm format          # prettier --write + eslint --fix
pnpm db:generate     # drizzle-kit: new migration from src/data/db/schema.ts (add --name <name>)
pnpm expo install <pkg>   # add an Expo package at the version matching the SDK
```

## Architecture rules

Layers, dependencies pointing one way:

```
src/app (routes)  ->  src/features (UI + hooks)  ->  src/domain (pure TS)
                                                 ->  src/data (repositories, SQL)
                                                 ->  src/services (device wrappers)
```

- SQLite is the single source of truth. Components read through feature hooks; hooks call
  repositories; repositories own all SQL.
- `src/domain` is plain TypeScript: no React, no React Native, no SQLite, no Expo imports.
- Only `src/data` imports Drizzle or `expo-sqlite`.
- Only `src/domain/scheduler.ts` imports `ts-fsrs`.
- Only `src/services` imports device modules (file system, sharing, speech, haptics, notifications).
- Route files in `src/app` stay thin: read params, call one feature hook, render one feature component.
- TanStack Query holds data. Zustand holds interaction state (active session, filters, open sheets).
  Never copy database rows into Zustand.
- Time is injected: scheduler and session code take a `now()` function.

## Code conventions

- No `any`. No non-null assertions without a comment explaining why it is safe.
- Named exports. One component per file. Files in `camelCase.ts`, components in `PascalCase.tsx`.
- Path alias `@/` maps to `src/`.
- Every user-visible string goes through `t()`, with interpolation and plural forms. No concatenation.
- Dates and numbers are formatted with `Intl`.
- Use logical style properties (`marginStart`, `paddingEnd`), never `marginLeft` / `paddingRight`.
- Every screen is wrapped in the shared `Screen` component (it owns safe areas and has a footer slot).
- Interactive elements: minimum 44 pt / 48 dp touch target, an accessibility label, never colour alone.
- Ids are UUIDv7 strings generated on the device. Timestamps are epoch milliseconds.
- Every user-editable table has `id`, `updated_at`, `deleted_at`. Deletes are soft deletes.
- Pagination is keyset-based. Never `OFFSET`.

## Never

- Network requests, analytics, crash reporting, ads, or `expo-updates`.
- React Navigation packages installed next to Expo Router.
- The `xlsx` package from the npm registry (it is outdated; see `docs/02-architecture.md`).
- Editing a migration that has already been committed. Add a new one.
- A unique constraint on `words.term_norm` (homonyms are legitimate).
- Features from the "Avoid" list in `docs/01-product.md`.

## Expo template notes

Kept from the `AGENTS.md` generated by `create-expo-app` (SDK 57). Commands are adapted to pnpm.

- Expo ships breaking changes every SDK release. Before touching an Expo, EAS or React Native API,
  read the `expo` major version in `package.json` and use the versioned docs
  (`https://docs.expo.dev/versions/v<major>.0.0/`), or start from https://docs.expo.dev/llms.txt.
- `pnpm expo install <pkg>` always, never `pnpm add`, so versions match the SDK.
  `pnpm expo install --fix` repairs mismatches; `pnpm dlx expo-doctor` diagnoses config problems.
- `android/` and `ios/` are generated (Continuous Native Generation). Never create or edit them by
  hand; configure native behaviour in `app.config.ts` and config plugins.
- Adding a library with native code needs a new development build (`pnpm android` / `pnpm ios`).
- Keep non-route code (components, hooks, utils) out of `src/app/`.
