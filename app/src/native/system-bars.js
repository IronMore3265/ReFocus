// Bridge to the native SystemBars plugin (android/.../SystemBarsPlugin.java),
// which paints the status and navigation bar icons dark or light.
//
// A browser has no system bars to paint, so this is a no-op off-device and
// `npm run dev` never notices it exists.
import { Capacitor, registerPlugin } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const SystemBars = isNative ? registerPlugin('SystemBars') : null;

// `dark` is the app's own theme, resolved by applyTheme() — not the OS preference.
export async function setSystemBarsStyle(dark) {
  if (!SystemBars) return;
  try {
    await SystemBars.setStyle({ dark });
  } catch {
    // The bars keep whatever they had; a wrong icon colour is not worth a crash.
  }
}
