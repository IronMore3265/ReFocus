import './style.css';
import { getProfile } from './store.js';
import { tickTimer, onTimerChange } from './engine.js';
import { initNotifications } from './notify.js';
import { applyTheme } from './theme.js';
import { icon, showSheet, avatarEl } from './ui.js';

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
];

const root = document.getElementById('app');
let cleanup = null;

export function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

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

  if (cleanup) { cleanup(); cleanup = null; }
  window.scrollTo(0, 0);
  document.body.className =
    `bg-surface text-on-surface antialiased${match.accent ? ` accent-${match.accent}` : ''}`;
  root.innerHTML = match.screen.render(...params);
  if (match.screen.mount) cleanup = match.screen.mount(root, ...params) || null;
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
    ${item('#/stats', 'monitoring', 'Focus Dashboard')}
    ${item('#/history', 'calendar_month', 'History')}
    ${item('#/achievements', 'trophy', 'Achievements')}
    ${item('#/shelf', 'collections_bookmark', 'Finished Shelf')}
    ${item('#/settings', 'settings', 'Settings')}
    <button data-nav="#/profile" data-close class="w-full flex items-center gap-4 px-2 py-4 border-b border-surface-container text-on-surface active:bg-surface-bright transition-colors">
      ${avatarEl('w-6 h-6')}
      <span class="text-body-md">Profile</span>
    </button>
  `);
}

// ---------- timer heartbeat ----------
setInterval(tickTimer, 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) tickTimer();
});

onTimerChange((event) => {
  if (event.type === 'focus-complete') navigate('#/complete');
});

// ---------- Android hardware back button ----------
import('@capacitor/app')
  .then(({ App }) => {
    App.addListener('backButton', ({ canGoBack }) => {
      const tab = /^#\/(home|timer|reading|tasks)$/.test(location.hash);
      if (tab || !canGoBack) App.exitApp();
      else history.back();
    });
  })
  .catch(() => { /* plugin absent on web — fine */ });

window.addEventListener('hashchange', render);
applyTheme();
initNotifications();
render();
