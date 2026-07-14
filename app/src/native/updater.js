// Bridge to the native Updater plugin (android/.../UpdaterPlugin.java), which
// downloads a release APK and hands it to Android's package installer.
//
// Off-device there is no installer to hand anything to, so `nativeUpdater` is
// false and Settings falls back to opening the release page in a browser — the
// web build and `npm run dev` keep working.
import { Capacitor, registerPlugin } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const UpdaterNative = isNative ? registerPlugin('Updater') : null;

export const nativeUpdater = isNative;

// Streams the APK to the app's cache. onProgress gets 0..100 as it goes; GitHub
// always sends a content length, but if one ever went missing the download still
// completes, just without moving the bar.
export async function downloadUpdate({ url, version, onProgress }) {
  if (!UpdaterNative) throw new Error('Updating in place is only available in the Android app.');
  const handle = onProgress
    ? await UpdaterNative.addListener('progress', ({ percent }) => onProgress(percent))
    : null;
  try {
    return await UpdaterNative.download({ url, version });
  } finally {
    await handle?.remove();
  }
}

// Opens the system install prompt. Resolves { permissionRequired: true } when
// the user still has to allow this app to install unknown apps — Android sends
// them to that setting, and they come back and tap Update again.
export async function installUpdate(version) {
  if (!UpdaterNative) throw new Error('Updating in place is only available in the Android app.');
  return UpdaterNative.install({ version });
}
