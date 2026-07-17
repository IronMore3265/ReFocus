# ReFocus

Android app (Capacitor + vanilla JS/Vite) for focus timers, reading tracking, and tasks.
Source lives in `app/`; the Android project is `app/android/`.

## Commit conventions

Do not include AI attribution in any git metadata. Specifically, no `Co-Authored-By:`
trailers naming an AI tool, and no "Generated with" footers, in commit messages or PR
descriptions.

## Release signing

Release APKs use an APK Signature Scheme v3 key rotation and must be built via
`scripts/release-apk.mjs`, not a Gradle `signingConfig` — the lineage in
`signing-lineage.bin` proves the release key succeeds the original debug key, so
existing installs keep updating. See the README before changing anything about signing.
