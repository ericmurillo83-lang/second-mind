# Privacy & data handling

## Current behavior (Milestone 1)

- **Local-only.** All data lives on the device. No account, no server calls, no analytics, no
  advertising SDKs, no third-party tracking. The FastAPI backend (Milestone 2) is not connected
  to the app.
- **Storage:** a single JSON document in AsyncStorage (`glycotrack.appdata`), versioned with
  `schemaVersion` and migrated on load. If data is unreadable, the app keeps a backup copy before
  offering to start fresh, and it refuses to open data written by a newer app version rather
  than risk overwriting it.
- **App lock (optional):** Face ID / Touch ID / fingerprint / device passcode via
  `expo-local-authentication`. Changing the setting requires a successful unlock. The app re-locks
  when sent to the background.
- **Reminders:** local notifications only. By default the text is generic ("You have a scheduled
  medication") so nothing sensitive shows on the lock screen. Users can opt in to showing names.
- **Export:** "Export my data" produces a full JSON copy via the system share sheet (download on
  web). Nothing is sent anywhere automatically.
- **Delete:** "Delete all data" erases the stored document and returns to onboarding.
- **Sample data:** fictional, flagged `demo: true` on every record, labelled in the UI, removable
  without touching the user's own records.
- **Android:** `allowBackup: false` (health data is excluded from automatic cloud backup), and
  unused storage/overlay permissions are blocked in `app.json`.
- **iOS privacy manifest:** declares no tracking and no collected data types.

## Known gaps before public release

| Gap | Plan |
| --- | --- |
| AsyncStorage is not encrypted at rest beyond the OS's device encryption | Move to SQLite with SQLCipher (or encrypt the document with a key in `expo-secure-store`). Needs approval: adds native dependencies. |
| No privacy policy / terms | Must be written (ideally reviewed by counsel) and linked in-app and in store listings. |
| App Store / Play "data safety" forms | Fill from this document once storage and any sync are final. |
| Screenshot privacy (app switcher) | Optionally blur the app preview when backgrounded. |
| HIPAA/GDPR | Not applicable while data stays on device; becomes applicable once sync to our servers exists. Requires a review before Milestone "Sync". |
