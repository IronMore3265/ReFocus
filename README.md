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

### API keys

`app/.env` is gitignored, so a fresh clone builds without any keys. Everything still
works — each key only widens or speeds up a feature that has a free fallback:

| Variable | Without it |
| --- | --- |
| `VITE_GOOGLE_BOOKS_KEY` | Book search still runs keyless, on a lower quota |
| `VITE_MW_DICT_KEY` | No Merriam-Webster pronunciation for words the free dictionary lacks audio for, and no fallback definition when it 404s |
| `VITE_MW_THES_KEY` | No Merriam-Webster synonyms when the free dictionary returns none |

Merriam-Webster keys are free from [dictionaryapi.com](https://dictionaryapi.com), one
per reference (Collegiate Dictionary and Collegiate Thesaurus are separate products
with separate keys), capped at 1000 calls/key/day. A `VITE_` var is inlined into the
bundle and is extractable from the APK — `.env` keeps keys out of git, it does not
make them secret. Settings → Dictionary lets any user paste their own key over the
built-in one.

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
