# ReFocus

A minimalist focus app for Android — Pomodoro timer, reading tracker, and tasks — built from the Stitch design in `stitch_minimalist_focus_suite/` ("Ember Serenity" design system — see `serene_monochrome/DESIGN.md`, the source of truth for color).

Web app (Vite + Tailwind v4, vanilla JS) wrapped with Capacitor. All data stays on the device in localStorage.

## Project layout

- `app/` — the application
  - `src/screens/` — one module per screen (14 screens)
  - `src/store.js` — data layer (books, tasks, sessions, settings, achievements)
  - `src/engine.js` — pomodoro state machine (survives reloads/backgrounding via a persisted end-timestamp)
  - `src/notify.js` — local notifications + sound/vibration
  - `android/` — Capacitor-generated Android project
- `stitch_minimalist_focus_suite/` — original design reference

## Development

```powershell
cd app
npm install
npm run dev        # http://localhost:5173
```

## Building the APK

Requires JDK 21 (`JAVA_HOME`) and Android SDK (`ANDROID_HOME=C:\Android\sdk`) — both already configured as user environment variables on this machine.

```powershell
cd app
npm run build
npx cap sync android
cd android
.\gradlew assembleDebug
```

APK output: `app\android\app\build\outputs\apk\debug\app-debug.apk`

## Installing on a phone

- **USB**: enable Developer Options → USB debugging, then `adb install app-debug.apk`
- **Manual**: copy the APK to the phone, tap it, allow installing from unknown sources

## Notes

- The debug APK is signed with the debug keystore — fine for personal use, not for the Play Store. For a release build: `.\gradlew assembleRelease` plus a signing keystore (see Capacitor docs).
- App ID: `com.nfraiyan.refocus` (was `com.nfraiyan.focussuite` before v0.2.3 — uninstall any older build before installing, Android treats it as a separate app)
