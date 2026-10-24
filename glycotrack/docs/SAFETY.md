# Safety boundaries

GlycoTrack is a personal **logging and organization** app. It is not a medical device and must
never behave like one. These rules are product requirements, not suggestions, and apply to every
milestone, contributor and AI agent working on the codebase.

## Never implement

| Never | Why |
| --- | --- |
| Insulin dosing, bolus/correction calculators, carb-ratio or sensitivity math | Dosing errors can cause severe harm. This is regulated medical-device functionality. |
| Automated medical decisions or treatment suggestions ("eat 15 g", "take X") | Clinical advice belongs to the user's care team. |
| Glucose alarms/alerts, predictive lows/highs, or anything that could be mistaken for a CGM alarm replacement | Users must keep relying on their meter/CGM and its alarms. |
| Interpretation of lab results ("your A1C is good/bad") | Interpretation is clinical judgment. |

## What the app does instead

- **Glucose:** stores values the user types in from their meter. Shows them on a chart and counts
  how many fall below/within/above a **target range the user sets with their care team**. Range
  colors always come with a text label and icon.
- **Below-range entry:** shows a neutral note: "This value is below the target range you set.
  Follow the plan from your care team. GlycoTrack does not monitor glucose or send alerts." No
  instructions, amounts or timers.
- **Carbs:** totals the grams the user enters or that a recipe lists. A daily goal is optional and
  only if the care team recommends one. Carbs are never converted into any dose.
- **Medications:** the user copies name, strength and instructions exactly from the label. The app
  schedules a checklist and optional reminders for those times. It never computes amounts. Sample
  data contains no insulin.
- **Reminders:** local notifications, explicitly labelled as a convenience that the OS may delay.
  By default they don't name the medication (lock-screen privacy).
- **Records:** stored as entered; the UI states that GlycoTrack doesn't interpret results.

## Where this is enforced

| Guard | Location |
| --- | --- |
| Onboarding requires acknowledging the limits before use | `mobile/src/app/welcome.tsx` (+ `welcome.test.tsx`) |
| Persistent safety notes on Home, Glucose, Meals, Meds, Records | screen footers (`SafetyNote`) |
| Safety & limitations page incl. emergency guidance | `mobile/src/app/safety.tsx` |
| Domain code is descriptive only | `mobile/src/domain/glucose.ts`, `medications.ts` (header comments) |
| Test: sample data contains no insulin/dosing language | `mobile/src/data/seed.test.ts` |
| Test: reminders contain no dosing/glucose language; names hidden by default | `mobile/src/services/reminders.test.ts` |
| Test: below-range note gives no amounts or instructions | `mobile/src/__tests__/screens/glucose.test.tsx` |
| Medication model has free-text `strength` only; no numeric dose field | `mobile/src/domain/types.ts` |

## Future CGM integrations

Approved CGM integrations (e.g. via official partner APIs or Apple Health / Health Connect) may
**display** imported readings. They must not add alerts, predictions, or dosing. Imported data
will carry a `source` other than `manual`, and the UI must keep stating that the CGM's own app
remains the source of alarms. Any integration requires explicit approval (see `APPROVALS.md`)
and a regulatory review before release.

## Regulatory note (needs professional review)

Positioning as a "general wellness / logbook" product, avoiding dosing and alarms, is intended to
keep GlycoTrack outside medical-device regulation, but that determination must be confirmed by a
qualified regulatory professional for each launch market (FDA, EU MDR, UK MHRA, etc.) before
public release.
