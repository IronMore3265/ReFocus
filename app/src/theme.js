// Light/dark theme switching. Theme lives in settings ('light'|'dark'|'system');
// 'system' follows the OS preference live.
import { getSettings } from './store.js';
import { setSystemBarsStyle } from './native/system-bars.js';

const media = window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme() {
  const pref = getSettings().theme;
  const dark = pref === 'dark' || (pref === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#1c0f0e' : '#f3ece4');
  // The meta tag above does nothing on Android; the status/nav bar icons are the
  // native side's to paint, and they follow *this* setting rather than the OS.
  setSystemBarsStyle(dark);
}

media.addEventListener('change', () => {
  if (getSettings().theme === 'system') applyTheme();
});
