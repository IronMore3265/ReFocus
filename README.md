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

## Releasing

```powershell
cd app
npm run release:apk     # build + sync + assembleRelease + sign, all in one
```

Output: `app\dist-apk\ReFocus-v<version>.apk` — this is the file that goes on the
GitHub release, and what the in-app updater downloads.

### Signing, and why it's not a plain Gradle signingConfig

ReFocus shipped signed with the **debug** key up to and including v1.3.0. Android
refuses any update whose signing certificate differs from the installed one, so
moving to a real release key can't be a straight swap — it has to be a **key
rotation**: an APK Signature Scheme v3 lineage proving the release key is the
rightful successor to the debug key. The Android Gradle Plugin has no `--lineage`
option, so `scripts/release-apk.mjs` signs with `apksigner` after Gradle emits the
unsigned APK, and then verifies the result before letting it out.

Every release APK therefore carries two signer blocks:

| Device | Signed with | Why it installs |
| --- | --- | --- |
| API 24–32 | the original debug key | the exact certificate already installed |
| API 33+ | the release key | the lineage proves it descends from the debug key |

Three files matter, none of which are in git:

| File | What it is |
| --- | --- |
| `app/android/refocus-release.jks` | the release keystore |
| `app/android/keystore.properties` | its passwords |
| `~/.android/debug.keystore` | the **original** debug key — still signs v1/v2 |

`app/android/signing-lineage.bin` *is* committed: it holds public certificates and
the proof-of-rotation, no private keys, and every future release has to be signed
against it.

> **Back up all three files somewhere off this machine.** Lose the release keystore
> and you can never ship an update again. Lose `debug.keystore` — which Android
> Studio will silently regenerate if it goes missing — and no device on API 32 or
> below, nor anyone still on v1.3.0, will ever accept another update. The lineage
> can be recovered from a signed APK (`apksigner rotate --in ReFocus-v1.3.1.apk`);
> the keystores cannot be recovered from anything.

## Installing on a phone

- **USB**: enable Developer Options → USB debugging, then `adb install app-debug.apk`
- **Manual**: copy the APK to the phone, tap it, allow installing from unknown sources

## Notes

- `assembleDebug` is for local iteration only. Anything you hand to someone else should come from `npm run release:apk` — it's ~20% smaller and not flagged debuggable. See [Releasing](#releasing).
- Play Store: the release key above is a valid upload key, but Play App Signing re-signs with a key Google holds, so a Play install and a sideloaded install are two different apps to Android and won't update each other. Pick one channel per user.
- App ID: `com.nfraiyan.refocus` (was `com.nfraiyan.focussuite` before v0.2.3 — uninstall any older build before installing, Android treats it as a separate app)
