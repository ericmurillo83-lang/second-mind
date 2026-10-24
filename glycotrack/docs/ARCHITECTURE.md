# Architecture

```
glycotrack/
├── mobile/            React Native app (Expo SDK 58, React 19.3, RN 0.88, TypeScript 6)
│   ├── src/app/       Routes (Expo Router, file-based). Every file here is a screen.
│   ├── src/features/  Feature UI shared between screens (dose rows, meal views, tab bars, shell)
│   ├── src/ui/        Design system: tokens, text, buttons, fields, cards, chart, status
│   ├── src/domain/    Pure TypeScript logic: types, dates, glucose, meals, medications
│   ├── src/data/      Local store, schema + migrations, storage adapter, fictional seed data
│   ├── src/services/  Platform services: reminders, app lock, dialogs/share
│   └── e2e/           Browser end-to-end suite (Playwright + axe-core) on the web build
├── api/               FastAPI + PostgreSQL backend (Milestone 2, not yet connected to the app)
└── docs/              Product, safety, privacy, design, testing, milestones, approvals
```

## Mobile app

### Navigation

`src/app/_layout.tsx` is the root **Stack**:

- `welcome` is only reachable before onboarding; everything else only after. Both are wrapped in
  `Stack.Protected` guards.
- `(tabs)` holds the five tabs: Home, Glucose, Meals, Meds, Care. On iOS/Android this uses
  `expo-router/native-tabs` (real `UITabBar` / Material bottom navigation; Liquid Glass on iOS 26).
  The web build (used for browser testing) uses a matching custom tab bar
  (`features/app-tabs.web.tsx`).
- Editors (`glucose/edit`, `meals/log`, `meals/recipe-edit`, `meals/plan-add`, `meds/edit`,
  `care/appointment|note|record`) open as **modals** with Cancel + a pinned Save footer.
- `settings`, `safety` and `meals/recipe/[id]` are pushed pages.

Typed routes are enabled (`experiments.typedRoutes`), so every `router.push` is type-checked.

### State and persistence

`data/store.ts` holds one immutable `AppData` snapshot (see `domain/types.ts`):

- `subscribe/getState` plus React's `useSyncExternalStore` (`data/store-context.tsx`). Collections
  keep their references unless changed, so selectors like `useAppData(d => d.glucose)` re-render
  only what changed.
- Generic `upsert / patch / remove` for every collection, with referential cleanup (deleting a
  recipe removes it from the plan; deleting a medication removes its dose history).
- Writes are debounced (200 ms) and flushed when the app backgrounds, before export, and in tests.
- `data/storage.ts` is a 3-method `StorageAdapter`. Production uses AsyncStorage; tests use an
  in-memory adapter. Moving to SQLite/SQLCipher only means writing a new adapter (or splitting
  collections into tables behind the same store API).
- `data/schema.ts` versions the document (`SCHEMA_VERSION`) and migrates/repairs it on load.

Glucose is always stored in **mg/dL** and converted for display (`domain/glucose.ts`).

### Domain logic

All calculations are pure functions with unit tests: date math (local-day keys, Monday weeks,
month grids), glucose conversion/validation/stats, carb totals and plan sums, the daily dose
schedule (`due / missed / upcoming / taken / skipped`) and adherence. See `SAFETY.md` for what
this logic deliberately does **not** do.

### UI system

`src/ui` is a small, accessible component kit built on React Native primitives (no UI library):
themed `Text` honoring Dynamic Type, `Button`/`IconButton` with 44–48 pt targets, `Card`,
`ListGroup/ListRow`, `SegmentedControl` (tablist semantics), `Chip`, `ToggleRow`, `Stepper` and
`TimeField` (VoiceOver/TalkBack "adjustable"), `DateField` (pure-JS calendar), `TextField` with
inline errors, `RangeBadge`, `StatTile`, `ProgressBar`, `TimeInRangeBar`, and an SVG
`GlucoseChart` with a text alternative. Icons use SF Symbols on iOS and Material Symbols on
Android/web via `expo-symbols`. Details in `DESIGN.md`.

## Backend (Milestone 2)

See `api/README.md`. FastAPI + SQLAlchemy 2 + Alembic on PostgreSQL, with user-scoped tables
mirroring the mobile model. It is **local development only** and intentionally refuses to start
in production mode until real authentication is configured.

## Key decisions

| Decision | Why |
| --- | --- |
| Local-first, no account in v1 | Fastest path to a useful, private app; no health data on our servers yet. |
| AsyncStorage JSON document behind an adapter | Simple and reliable for manual-entry volumes (thousands of records). Swap to SQLite before CGM import (high volume). |
| Expo Router + native tabs | Platform-native navigation and accessibility for free; typed routes. |
| Own small UI kit instead of a UI library | Full control over accessibility and visual polish; fewer dependencies to audit. |
| Pure-JS date/time pickers | Identical behavior on iOS, Android and web (testable in the browser). |
| Web build used only for testing/preview | Lets the whole app be exercised in CI without simulators. Not a product target. |
