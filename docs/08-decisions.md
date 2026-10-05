# Decisions and open questions

Append new decisions at the bottom of the log with a date. Do not rewrite history; supersede instead.

## Open questions (ask the owner before assuming)

| # | Question | Needed by |
| --- | --- | --- |
| Q1 | Final app name. Placeholder in use (see below). The display name can change at any time. | Milestone 11 at the latest |
| Q2 | Final Android package / iOS bundle identifier and URL scheme. Placeholders in use (see below). | **Before Milestone 5** |
| Q6 | `LIKE` search or FTS5 | Milestone 1, decided by measurement |

## Placeholders in use

Define these once in `app.config.ts` so that changing them is a one-line edit.

| Setting | Placeholder value |
| --- | --- |
| Display name | `Dictionary` |
| Slug | `dictionary-app` |
| URL scheme | `dictionaryapp` |
| Android package / iOS bundle identifier | `dev.placeholder.dictionaryapp` |

Why Q2 has a deadline: on Android the package name is the app's identity. Changing it after real
data exists means installing a new app and moving the data with backup and restore. Pick an
identifier that does **not** contain the app name (for example `io.github.<handle>.vocab`), so the
name can still change freely afterwards.

## Decision log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-05 | Zero running cost; store account fees are accepted for publishing on both platforms | Owner constraint |
| 2026-10-05 | Both Android and iOS are targets; set up both builds in Milestone 0 | Owner |
| 2026-10-05 | Expo + React Native + TypeScript + Expo Router; development builds, not Expo Go | Fits skills; share and notifications need dev builds |
| 2026-10-05 | `expo-sqlite` + Drizzle; repositories are the only database access | Typed schema, migrations, swap-ability |
| 2026-10-05 | TanStack Query for data, Zustand for interaction state only | One source of truth |
| 2026-10-05 | FSRS via `ts-fsrs` from the first review; no hand-rolled intervals | Fixed intervals are not spaced repetition |
| 2026-10-05 | Schedule cards (word x direction), not words | Recall direction later without a migration |
| 2026-10-05 | Learning status is derived from card state; no stored status, no difficulty field | Stored copies drift |
| 2026-10-05 | Only scheduled review moves due dates; free practice is logged with `scheduled = 0` | Keeps the schedule honest |
| 2026-10-05 | Daily new-word limit (10) and session cap (20) | Prevents backlog after imports |
| 2026-10-05 | Tags are global, not per dictionary | Practice and filter across dictionaries |
| 2026-10-05 | Duplicate detection = `term_norm` (exact) + `term_fold` (possible); warn, never block; no fuzzy matching | Simple and predictable |
| 2026-10-05 | UUIDv7 ids, `updated_at`, `deleted_at` on all user-editable tables; soft deletes | Backup merge and future sync |
| 2026-10-05 | Backup is JSON with `formatVersion`; ships in the MVP, before import | Local-only data must be recoverable |
| 2026-10-05 | Settings stored in SQLite | One backup captures everything |
| 2026-10-05 | Future-proofing conventions adopted from Milestone 0 (see `02-architecture.md`) | Owner: keep future integrations simple |
| 2026-10-05 | No analytics, crash reporting, OTA updates, ads, or any network code | Privacy and zero cost |
| 2026-10-05 | SheetJS installed from its own tarball and vendored; never from npm | npm copy is frozen at 0.18.5 |
| 2026-10-05 | Study day rolls over at 04:00 local time | Late-night reviews count for the same day |
| 2026-10-05 | App name and bundle id are placeholders for now (Q1, Q2) | Owner: name not chosen yet |
| 2026-10-05 | Minimum OS versions: the Expo SDK defaults | Owner |
| 2026-10-05 | Android is the owner's daily phone and the primary test platform | Owner |
| 2026-10-05 | Package manager: pnpm | Owner: matches other projects |
| 2026-10-05 | Expo SDK 57.0.26 (stable `latest` at scaffold time) | Milestone 0 |
| 2026-10-05 | `expo-crypto` supplies UUIDv7 random bytes | Owner: SDK 57/Hermes has no global `crypto.getRandomValues` |
| 2026-10-05 | ESLint stays on 9.x | `eslint-plugin-react` 7.37 (used by `eslint-config-expo`) crashes on ESLint 10 |
| 2026-10-05 | pnpm isolated installs (no `nodeLinker: hoisted`); `unrs-resolver` build script denied in `pnpm-workspace.yaml` | Expo supports isolated installs since SDK 54; the resolver's native binding comes from an optional dependency |
| 2026-10-05 | JS tabs (`expo-router/js-tabs`), not native tabs; [+] is a tab whose press is intercepted to open `/add` | A centre action button that opens a modal needs a custom tab press |
| 2026-10-05 | Tab icons from `expo-symbols` (shipped with the template) | No extra icon dependency |
| 2026-10-05 | Platforms: Android and iOS only; web support and `react-native-web` removed | Mobile app; web is not a target |
| 2026-10-05 | Theme follows the system until the `settings` table exists (Milestone 1+) | No database in Milestone 0 |
