// Profile — name + lifetime totals.
import { getProfile, setProfile, lifetimeStats } from '../store.js';
import { subHeader, icon, esc, inputCls } from '../ui.js';

export function render() {
  const p = getProfile();
  const s = lifetimeStats();
  const initial = (p.name || 'F')[0].toUpperCase();

  const stat = (value, label) => `
    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-4 text-center">
      <div class="text-headline-md text-on-surface">${value}</div>
      <div class="text-label-sm text-secondary uppercase mt-1">${label}</div>
    </div>`;

  return `
  ${subHeader('Profile')}
  <main class="pt-24 pb-16 px-margin-mobile max-w-2xl mx-auto page-enter">

    <div class="flex flex-col items-center mb-stack-lg">
      <div class="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center mb-4">
        <span class="text-headline-lg text-on-primary font-bold">${esc(initial)}</span>
      </div>
      <input data-name value="${esc(p.name)}" placeholder="Your name"
        class="${inputCls} !bg-transparent !border-transparent text-center !text-2xl font-semibold focus:!border-surface-container-highest max-w-xs" />
      <span class="text-label-sm text-secondary mt-1 flex items-center gap-1">${icon('edit', 'text-[12px]')} tap name to edit</span>
    </div>

    <h2 class="text-label-md uppercase tracking-wider text-secondary mb-3 px-1">Lifetime</h2>
    <div class="grid grid-cols-2 gap-4 mb-gutter">
      ${stat(`${Math.floor(s.focusMinutes / 60)}h ${s.focusMinutes % 60}m`, 'Focus time')}
      ${stat(s.sessions, 'Sessions')}
      ${stat(s.tasksDone, 'Tasks done')}
      ${stat(s.booksFinished, 'Books finished')}
    </div>
    <div class="grid grid-cols-1 gap-4">
      ${stat(s.pagesRead, 'Pages read')}
    </div>
  </main>`;
}

export function mount(root) {
  root.querySelector('[data-name]').addEventListener('change', (e) => {
    setProfile({ name: e.target.value.trim() });
  });
}
