# GlycoTrack: rules for contributors and coding agents

Read `docs/SAFETY.md` before changing any feature. These rules override convenience.

## Hard safety rules

- Never implement insulin or medication dose calculation, correction/bolus calculators, carb
  ratios, treatment suggestions, glucose alarms/alerts/predictions, or result interpretation.
- Medications are stored exactly as the user enters them from the label (free-text strength).
- Range colors always ship with a text label and an icon.
- Sample data must stay fictional, flagged `demo: true`, and labelled in the UI.
- Do not add analytics, networking or third-party SDKs without an entry in `docs/APPROVALS.md`.
- Do not deploy, publish, or submit builds without explicit owner approval.

## Conventions

- Mobile app lives in `mobile/` (see `mobile/AGENTS.md` for Expo-specific guidance: Expo
  changes every SDK, so check installed type definitions rather than memory).
- Routes only in `mobile/src/app/`; reusable UI in `src/ui`, feature UI in `src/features`, pure
  logic in `src/domain` (unit-tested), persistence in `src/data`.
- Glucose is stored in mg/dL; convert only for display.
- Use the design tokens in `src/ui/theme.ts`; no hard-coded colors in screens.
- Every interactive element needs an accessible name; screen tests assert this.
- Before committing: `npm run check` in `mobile/`, plus `npm run export:web && npm run e2e` for UI
  changes. Update `docs/MILESTONES.md` when a milestone changes.
