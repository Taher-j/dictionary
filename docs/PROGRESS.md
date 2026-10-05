# Progress

Read this first in every session. Update it before stopping: tick what is done, note what is next,
and add one line to the session log.

## Status

| Milestone | Status |
| --- | --- |
| 0 — Project setup | Done (iOS unverified) |
| 1 — Data layer | Not started |
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

## Current milestone: 0 — Project setup (done; next is Milestone 1, start with a task plan)

### Answers for this milestone (nothing is blocking)

- [x] Q1 App name: placeholder `Dictionary` (final name still open)
- [x] Q2 Bundle id and URL scheme: placeholders, see `08-decisions.md` (final id due before Milestone 5)
- [x] Q3 Minimum OS versions: Expo SDK defaults
- [x] Q4 Owner's daily phone: Android
- [x] Q5 Package manager: pnpm

### Tasks

- [x] Scaffold Expo project with pnpm (SDK 57+), remove template leftovers
- [x] `src/app` routes, `@/` alias, TypeScript strict
- [x] ESLint + Prettier + custom lint rules (literal strings, left/right props, import boundaries)
- [x] Jest with one real test
- [x] `package.json` scripts incl. `check`
- [x] App config: name, scheme, bundle ids; `expo-dev-client`; CNG with `android/` `ios/` ignored
- [x] `src/ui`: tokens, themes, `Screen`, `Text`, `Button`
- [x] `src/i18n` with `en.json`
- [x] Root layout providers
- [x] Tabs + `/add` placeholder showing the `term` param
- [x] `src/lib/ids.ts`, `src/lib/clock.ts`
- [x] git init, README, first commit

### Done-when checks

- [x] `pnpm check` passes
- [x] Dev build runs on the owner's Android phone (Galaxy S24 Ultra, local `pnpm android`). iOS: not verified (no Mac)
- [x] Tabs render in light and dark
- [x] `<scheme>://add?term=hello` opens the placeholder with "hello"
- [x] Lint fails on a literal JSX string, `marginLeft`, and a `react` import under `src/domain`
- [x] No template leftovers

## Verified on device only (owner to confirm)

- M0, checked by Claude over adb on the S24 Ultra on 2026-10-05: tabs in dark and light, [+] opens
  quick add, `dictionaryapp://add?term=hello` shows "hello" while the app is running, Back from it
  returns to the tabs. A cold-start deep link only reaches the dev-client launcher (dev-build
  behaviour; recheck with a release build later).
- iOS build: not verified, needs a Mac.

## Session log

| Date | What was done | Next |
| --- | --- | --- |
| 2026-10-05 | Milestone 0: scaffold (SDK 57.0.26), tooling, lint rules, ui kit, i18n, tab shell, dev build on Android | Milestone 1 — Data layer (plan first) |
