// Light/dark theme switching. Theme lives in settings ('light'|'dark'|'system');
// 'system' follows the OS preference live.
import { getSettings } from './store.js';

const media = window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme() {
  const pref = getSettings().theme;
  const dark = pref === 'dark' || (pref === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#131315' : '#f9f9f9');
}

media.addEventListener('change', () => {
  if (getSettings().theme === 'system') applyTheme();
});
