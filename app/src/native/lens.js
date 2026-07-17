// Bridge to the native Lens plugin (android/.../LensPlugin.java), which opens
// Google Lens so a quote can be read off the page instead of typed out.
//
// Lens can't hand the text back — there's no "start Lens for result" on Android.
// The user copies it inside Lens and returns; the note sheet offers to paste it.
//
// Off-device there is no Lens to open, so `nativeLens` is false and the note
// sheet omits the button entirely — the web build and `npm run dev` keep working.
import { Capacitor, registerPlugin } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const LensNative = isNative ? registerPlugin('Lens') : null;

export const nativeLens = isNative;

// → true when Lens actually came up, false when it isn't installed. The caller
// says so; a missing Lens isn't an error worth throwing over.
export async function openLens() {
  if (!LensNative) return false;
  const { opened } = await LensNative.open();
  return !!opened;
}
