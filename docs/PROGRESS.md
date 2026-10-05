# Progress

Read this first in every session. Update it before stopping: tick what is done, note what is next,
and add one line to the session log.

## Status

| Milestone | Status |
| --- | --- |
| 0 — Project setup | Not started |
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

## Current milestone: 0 — Project setup

### Answers for this milestone (nothing is blocking)

- [x] Q1 App name: placeholder `Dictionary` (final name still open)
- [x] Q2 Bundle id and URL scheme: placeholders, see `08-decisions.md` (final id due before Milestone 5)
- [x] Q3 Minimum OS versions: Expo SDK defaults
- [x] Q4 Owner's daily phone: Android
- [x] Q5 Package manager: pnpm

### Tasks

- [ ] Scaffold Expo project with pnpm (SDK 57+), remove template leftovers
- [ ] `src/app` routes, `@/` alias, TypeScript strict
- [ ] ESLint + Prettier + custom lint rules (literal strings, left/right props, import boundaries)
- [ ] Jest with one real test
- [ ] `package.json` scripts incl. `check`
- [ ] App config: name, scheme, bundle ids; `expo-dev-client`; CNG with `android/` `ios/` ignored
- [ ] `src/ui`: tokens, themes, `Screen`, `Text`, `Button`
- [ ] `src/i18n` with `en.json`
- [ ] Root layout providers
- [ ] Tabs + `/add` placeholder showing the `term` param
- [ ] `src/lib/ids.ts`, `src/lib/clock.ts`
- [ ] git init, README, first commit

### Done-when checks

- [ ] `pnpm check` passes
- [ ] Dev build runs on the owner's Android phone (iOS if a Mac is available)
- [ ] Tabs render in light and dark
- [ ] `<scheme>://add?term=hello` opens the placeholder with "hello"
- [ ] Lint fails on a literal JSX string, `marginLeft`, and a `react` import under `src/domain`
- [ ] No template leftovers

## Verified on device only (owner to confirm)

- (nothing yet)

## Session log

| Date | What was done | Next |
| --- | --- | --- |
| | | |
