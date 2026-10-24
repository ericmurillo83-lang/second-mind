# Decisions that need owner approval

Nothing has been deployed, published, submitted to an app store, or sent to an external service.
The items below are blocked on your decision.

## Before any public release

| # | Decision | Why it needs you | Recommendation |
| --- | --- | --- | --- |
| 1 | **Regulatory review** for each launch market | Determines whether GlycoTrack stays a non-device "logbook". Needs a qualified professional. | Do this before beta. Keep the safety boundaries in `SAFETY.md`. |
| 2 | **App identity**: bundle ID / package name (currently placeholder `com.glycotrack.app`), app name availability, trademark | Permanent once published; must match a domain/org you control. | Pick a reverse-DNS ID you own, e.g. `com.<yourcompany>.glycotrack`. |
| 3 | **Apple Developer + Google Play accounts and EAS (Expo) account** | Costs money, legal agreements, signing keys. | Create under a company entity, not a personal account. |
| 4 | **Privacy policy and terms of use** | Required by both stores; legal text. | Draft from `PRIVACY.md`, have counsel review. |
| 5 | **License** for the code (template MIT license was removed) | Ownership/IP choice. | Proprietary "All rights reserved" for a commercial app. |
| 6 | **Encryption at rest** (SQLite + SQLCipher or encrypted document with a Keychain/Keystore key) | Adds native dependencies and a migration. | Approve for the next milestone, before beta. |

## Before connecting the backend

| # | Decision | Recommendation |
| --- | --- | --- |
| 7 | **Authentication provider** (e.g. Sign in with Apple + Google via a managed IdP, or self-hosted) | Managed provider with passkeys; the API already refuses to run in production without it. |
| 8 | **Hosting & region** for PostgreSQL/API, plus a HIPAA/GDPR posture (BAA if US-covered) | A managed Postgres with encryption, backups and a signed BAA if needed. |
| 9 | **Sync model** (opt-in cloud backup vs. always-on sync) | Opt-in, end-to-end encrypted backup first. |

## Integrations (later milestones)

| # | Decision | Notes |
| --- | --- | --- |
| 10 | **Which CGM / health integrations** (Apple Health, Health Connect, Dexcom/Abbott partner APIs) | Each needs vendor approval/agreements. Display-only; no alerts or dosing (see `SAFETY.md`). |
| 11 | **Recipe/nutrition data source** (e.g. USDA FoodData Central vs. licensed database) | Licensing and accuracy. |
| 12 | **Analytics/crash reporting** (none today) | If wanted: privacy-preserving, opt-in, no health data in events. |

## Small product questions (sensible defaults already chosen)

- Default target range 70–180 mg/dL (a common consensus range) with copy saying to set it with
  your care team. Change it if you'd prefer users enter their own with no default.
- Daily carb goal is off by default and only shown as "if your care team recommends one".
- Medication reminders don't show names by default.
