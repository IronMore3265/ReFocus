import './style.css';
import { getProfile } from './store.js';
import { tickTimer, onTimerChange, syncFromNative } from './engine.js';
import { initNotifications } from './notify.js';
import { initCelebrations } from './celebrate.js';
import { applyTheme } from './theme.js';
import { icon, showSheet, avatarEl, closeTopSheet } from './ui.js';

import * as home from './screens/home.js';
import * as timer from './screens/timer.js';
import * as reading from './screens/reading.js';
import * as tasks from './screens/tasks.js';
import * as stats from './screens/stats.js';
import * as settings from './screens/settings.js';
import * as profile from './screens/profile.js';
import * as bookDetail from './screens/book-detail.js';
import * as taskDetail from './screens/task-detail.js';
import * as sessionComplete from './screens/session-complete.js';
import * as historyScreen from './screens/history.js';
import * as achievements from './screens/achievements.js';
import * as shelf from './screens/shelf.js';
import * as onboarding from './screens/onboarding.js';
import * as changelog from './screens/changelog.js';

// ---------- routes ----------
// `accent` scopes the section color profile (see style.css .accent-*)
const routes = [
  { pattern: /^#\/home$/, screen: home },
  { pattern: /^#\/timer$/, screen: timer, accent: 'timer' },
  { pattern: /^#\/reading$/, screen: reading, accent: 'reading' },
  { pattern: /^#\/tasks$/, screen: tasks, accent: 'tasks' },
  { pattern: /^#\/stats$/, screen: stats },
  { pattern: /^#\/settings$/, screen: settings },
  { pattern: /^#\/profile$/, screen: profile },
  { pattern: /^#\/book\/(\w+)$/, screen: bookDetail, accent: 'reading' },
  { pattern: /^#\/task\/(\w+)$/, screen: taskDetail, accent: 'tasks' },
  { pattern: /^#\/complete$/, screen: sessionComplete, accent: 'timer' },
  { pattern: /^#\/history$/, screen: historyScreen },
  { pattern: /^#\/achievements$/, screen: achievements },
  { pattern: /^#\/shelf$/, screen: shelf, accent: 'reading' },
  { pattern: /^#\/onboarding$/, screen: onboarding },
  { pattern: /^#\/changelog$/, screen: changelog },
];

const root = document.getElementById('app');
let cleanup = null;

export function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

// Tabs sit at depth 0, sub-pages at depth 1 — used to pick a slide direction.
const TAB_RE = /^#\/(home|timer|reading|tasks)$/;
let prevHash = null;

function render() {
  const hash = location.hash || '#/home';

  // First launch → onboarding
  if (!getProfile().onboarded && hash !== '#/onboarding') {
    location.hash = '#/onboarding';
    return;
  }

  const match = routes.find((r) => r.pattern.test(hash));
  if (!match) {
    location.hash = '#/home';
    return;
  }
  const params = hash.match(match.pattern).slice(1);

  const apply = () => {
    if (cleanup) { cleanup(); cleanup = null; }
    window.scrollTo(0, 0);
    document.body.className =
      `bg-surface text-on-surface antialiased${match.accent ? ` accent-${match.accent}` : ''}`;
    root.innerHTML = match.screen.render(...params);
    if (match.screen.mount) cleanup = match.screen.mount(root, ...params) || null;
  };

  // Cross-fade/slide between routes when the WebView supports view transitions.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && prevHash !== null && prevHash !== hash && !reduceMotion) {
    const fromDepth = TAB_RE.test(prevHash) ? 0 : 1;
    const toDepth = TAB_RE.test(hash) ? 0 : 1;
    document.documentElement.dataset.vt =
      toDepth > fromDepth ? 'forward' : toDepth < fromDepth ? 'back' : 'fade';
    document.startViewTransition(apply);
  } else {
    apply();
  }
  prevHash = hash;
}

// ---------- global navigation delegation ----------
document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]');
  if (!nav) return;
  const target = nav.getAttribute('data-nav');
  if (target === 'back') {
    if (history.length > 1) history.back();
    else navigate('#/home');
  } else if (target === 'menu') {
    openMenu();
  } else {
    navigate(target);
  }
});

// ---------- hamburger menu ----------
function openMenu() {
  const item = (route, iconName, label) => `
    <button data-nav="${route}" data-close class="w-full flex items-center gap-4 px-2 py-4 border-b border-surface-container text-on-surface active:bg-surface-bright transition-colors">
      ${icon(iconName, 'text-primary-container')}
      <span class="text-body-md">${label}</span>
    </button>`;
  showSheet(`
    <h2 class="text-headline-md text-on-surface mb-4">ReFocus</h2>
    ${item('#/stats', 'stats', 'Focus Stats')}
    ${item('#/history', 'calendar', 'History')}
    ${item('#/achievements', 'trophy', 'Achievements')}
    ${item('#/shelf', 'shelf', 'Finished Shelf')}
    ${item('#/changelog', 'sparkle', "What's New")}
    ${item('#/settings', 'settings', 'Settings')}
    <button data-nav="#/profile" data-close class="w-full flex items-center gap-4 px-2 py-4 border-b border-surface-container text-on-surface active:bg-surface-bright transition-colors">
      ${avatarEl('w-6 h-6')}
      <span class="text-body-md">Profile</span>
    </button>
  `);
}

// ---------- timer heartbeat ----------
setInterval(tickTimer, 1000);
document.addEventListener('visibilitychange', async () => {
  if (document.hidden) return;
  // While we were away the notification's buttons may have driven the timer.
  // Reconcile before the tick, or it would act on a stale state. A session that
  // ended while we were gone is left ringing on purpose: the user is most likely
  // opening the app *because* it is ringing, and a timer control (or Done) is
  // what stops it.
  await syncFromNative();
  tickTimer();
});

onTimerChange((event) => {
  if (event.type === 'focus-complete') navigate('#/complete');
});

// ---------- Android hardware back button ----------
// Priority: dismiss an open sheet → step back through history → only exit
// the app from the home tab.
import('@capacitor/app')
  .then(({ App }) => {
    App.addListener('backButton', ({ canGoBack }) => {
      if (closeTopSheet()) return;
      const hash = location.hash || '#/home';
      if (hash === '#/home' || hash === '#/onboarding') App.exitApp();
      else if (canGoBack) history.back();
      else navigate('#/home');
    });
  })
  .catch(() => { /* plugin absent on web — fine */ });

window.addEventListener('hashchange', render);
applyTheme();
initNotifications();
initCelebrations();
render();
// Cold start after the notification drove the timer (or the activity was killed
// under it): adopt the service's state before the first tick acts on a stale one.
syncFromNative().then(tickTimer);
