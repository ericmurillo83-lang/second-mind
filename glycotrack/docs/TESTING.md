# Testing

## Mobile (`mobile/`)

| Command | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript (strict) incl. typed routes. Run `npx expo start` once first so `.expo/types` exists. |
| `npm run lint` | `expo lint` (ESLint + React Compiler and hooks rules) |
| `npm test` | Jest (`jest-expo`) unit + screen tests |
| `npm run check` | All three above |
| `npm run export:web && npm run e2e` | Builds the web bundle and runs the browser E2E suite |

### Unit tests (`src/**/*.test.ts`)

Domain logic (dates, glucose, meals, medications), the store (CRUD, persistence, migrations,
corrupt/newer data handling, cascades, sample data, delete-all, export), fictional seed data
invariants, and reminder planning. Safety guards are tests too; see `SAFETY.md`.

### Screen tests (`src/__tests__/screens/*.test.tsx`)

Each screen is rendered with a real store (in-memory storage), real theme and safe-area providers,
driven with React Native Testing Library `userEvent`. `expo-router` is mocked (navigation calls
are asserted); real navigation is covered by E2E. The clock is pinned to
**Sat 24 Oct 2026 15:00** in `jest.setup.js` so "today", due doses and relative labels are
deterministic. Route params and spies reset between tests; the suite passes with `--randomize`.

### Browser E2E (`e2e/run.mjs`)

Runs the exported web app in headless Chromium at phone size (393×852 @2x):

onboarding (acknowledgement gate) → home → log glucose → glucose history (period switch, open
and cancel an edit) → meals (today, plan, recipes, log from recipe) → meds (mark taken) → care
(visits, notes, records, add record) → settings (units, safety page, dark mode) → reload
persistence → delete all → no uncaught errors. axe-core scans 11 screens and fails on any
serious/critical WCAG violation. Screenshots + `results.json` land in `e2e/artifacts/`.

## What is not covered yet

- Native builds on real iOS/Android devices or simulators (no macOS / Android SDK in this
  environment). The native-only pieces are native tabs, notifications, haptics and biometrics;
  their JS paths are unit-tested and they are standard Expo modules.
- `expo-doctor`: 18/20 checks pass offline; the remaining 2 need Expo's online API, which this
  environment's network policy blocks.

## Backend (`api/`)

See `api/README.md`. 30 `pytest` tests run against a throwaway PostgreSQL database built with
the real Alembic migrations (CRUD, validation, isolation, cascades, export/delete, migrations,
startup guard, safety guards), plus `ruff` lint/format.
