// Bridge to the native Lens plugin (android/.../LensPlugin.java), which opens the
// Google app so a quote can be read off the page with Lens instead of typed out.
//
// The Google app rather than Lens itself: Google gates the Lens intent to callers
// on an allowlist we aren't on, and every way in either bounces straight back or
// dumps the user somewhere else. LensPlugin.java has the evidence. Lens is one tap
// away once the Google app is open — the camera icon in its search bar.
//
// Lens can't hand the text back either, so the user copies it over there and
// returns; the note sheet offers to paste it.
//
// Off-device there is no Google app to open, so `nativeLens` is false and the note
// sheet omits the button entirely — the web build and `npm run dev` keep working.
import { Capacitor, registerPlugin } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const LensNative = isNative ? registerPlugin('Lens') : null;

export const nativeLens = isNative;

// → true when the Google app came up, false when it isn't installed. The caller
// says so; a missing Google app isn't an error worth throwing over.
export async function openLens() {
  if (!LensNative) return false;
  const { opened } = await LensNative.open();
  return !!opened;
}
