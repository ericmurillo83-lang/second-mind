# Milestones

Each milestone is built, tested and committed before the next one starts.

## ✅ Milestone 1 — Mobile app with local storage

**Built**

- Expo SDK 58 app (React 19.3, React Native 0.88, TypeScript 6, React Compiler, typed routes).
- First-run onboarding with a required safety acknowledgement and a choice of empty app or
  clearly labelled fictional sample data.
- **Home:** greeting, latest reading with range badge and 24-hour sparkline, quick actions, today's
  average / % in range / carbs (with optional goal), next medication doses with one-tap logging,
  next appointment, today's meal plan.
- **Glucose:** 24 h / 7 / 14 / 30-day chart with target band, context filters, average, % in range,
  lowest/highest, readings-in-range bar, day-grouped history; add/edit/delete with validation,
  mg/dL ⇄ mmol/L.
- **Meals:** today's carb log by meal, previous days; weekly planner with planned carbs; recipe box
  with search, tags, favorites, detail view, create/edit/delete; log a meal from a recipe with
  servings scaling.
- **Medications:** daily checklist (due / upcoming / not logged / taken / skipped, with undo), 7-day
  adherence, medication list with refill tracking, archive vs. delete, local reminders.
- **Care:** appointments (upcoming/past), medical notes with search and tags, health records with
  presets.
- **Settings & privacy:** name, units, target range, carb goal, reminders (+ hide names), theme,
  app lock, export JSON, load/remove sample data, delete all data, safety page, version.
- Local persistence with schema versioning, migration, corruption backup and newer-version guard.
- Brand: app icon (iOS 26 icon bundle + Android adaptive + monochrome), splash, favicon.

**Tested**

- `tsc` strict: clean · `expo lint`: clean
- Jest: **116 tests** (unit + screen), passing in random order; domain/data coverage ~90% lines
- Browser E2E: **11/11 steps** across every tab and editor, reload persistence and delete-all;
  axe-core: **0 serious/critical** WCAG violations on 11 screens
- `expo-doctor`: 18/20 (2 checks need Expo's online API, blocked by this environment's network)

**Not yet done:** native device runs (needs macOS/Xcode or an EAS account; see `APPROVALS.md`),
manual VoiceOver/TalkBack pass, encryption at rest.

## Milestone 2 — Backend foundation (FastAPI + PostgreSQL)

See `api/README.md` and the entry below once complete.

## Proposed next milestones

3. **Hardening:** encrypted storage (SQLite/SQLCipher), app-switcher privacy, error reporting
   decision, VoiceOver/TalkBack audit on devices, EAS development builds.
4. **Accounts & sync:** chosen auth provider, opt-in encrypted backup/sync against the API.
5. **Insights (descriptive only):** weekly summaries, printable/shareable PDF report for visits.
6. **Integrations:** Apple Health / Health Connect read-only import, then approved CGM partner
   APIs (display only).
7. **Beta:** TestFlight / Play internal testing, store listings, privacy policy, regulatory sign-off.
