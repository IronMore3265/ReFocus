// Shared UI building blocks, styled per the Serene Monochrome design system.
import { formatDate } from './store.js';

// Re-render the current route (main.js re-renders on hashchange)
export function rerender() {
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function icon(name, cls = '', fill = false) {
  return `<span class="material-symbols-outlined ${fill ? 'icon-fill' : ''} ${cls}">${name}</span>`;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---------- top app bar for tab pages ----------
export function appHeader() {
  return `
  <header class="pt-safe fixed top-0 w-full z-40 bg-surface border-b border-surface-container">
    <div class="flex justify-between items-center h-16 px-margin-mobile">
      <button data-nav="menu" class="p-2 rounded text-primary-container active:opacity-70 transition-opacity">
        ${icon('menu')}
      </button>
      <div class="text-headline-md font-bold text-primary-container">${formatDate()}</div>
      <button data-nav="#/profile" class="p-2 rounded text-primary-container active:opacity-70 transition-opacity">
        ${icon('account_circle')}
      </button>
    </div>
  </header>`;
}

// ---------- top app bar for sub-pages ----------
export function subHeader(title, actionsHtml = '') {
  return `
  <header class="pt-safe fixed top-0 w-full z-40 bg-surface border-b border-surface-container">
    <div class="flex items-center gap-2 h-16 px-2">
      <button data-nav="back" class="p-3 rounded-full text-on-surface active:opacity-70 transition-opacity">
        ${icon('arrow_back')}
      </button>
      <h1 class="text-headline-md text-on-surface flex-grow truncate">${esc(title)}</h1>
      ${actionsHtml}
    </div>
  </header>`;
}

// ---------- bottom navigation ----------
const TABS = [
  { route: '#/home', iconName: 'grid_view', label: 'Home' },
  { route: '#/timer', iconName: 'timer', label: 'Timer' },
  { route: '#/reading', iconName: 'book_2', label: 'Reading' },
  { route: '#/tasks', iconName: 'checklist', label: 'Tasks' },
];

export function bottomNav(activeRoute) {
  return `
  <nav class="pb-safe fixed bottom-0 left-0 w-full z-40 bg-surface border-t border-surface-container">
    <div class="flex justify-around items-center h-16 px-4">
      ${TABS.map((t) => {
        const active = t.route === activeRoute;
        return `
        <button data-nav="${t.route}" class="flex flex-col items-center justify-center w-full h-full active:scale-95 transition-transform duration-200 ${
          active ? 'text-primary-container font-bold' : 'text-secondary'
        }">
          ${icon(t.iconName, 'mb-1', active)}
          <span class="text-label-md ${active ? '' : 'font-normal'}">${t.label}</span>
        </button>`;
      }).join('')}
    </div>
  </nav>`;
}

// ---------- FAB ----------
export function fab(action = 'add') {
  return `
  <button data-action="${action}" class="fixed bottom-24 right-margin-mobile bg-primary-container text-on-primary w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.12)] active:scale-95 transition-transform z-40">
    ${icon('add')}
  </button>`;
}

// ---------- SVG progress ring ----------
// progress: 0..1 (fraction elapsed/complete)
export function progressRing({ progress = 0, size = 288, stroke = 8, centerHtml = '', extraClass = '' }) {
  const r = 140;
  const circ = 2 * Math.PI * r; // ~879.6
  const offset = circ * (1 - Math.min(1, Math.max(0, progress)));
  return `
  <div class="relative flex items-center justify-center ${extraClass}" style="width:${size}px;height:${size}px">
    <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 300 300">
      <circle class="stroke-surface-container" cx="150" cy="150" fill="none" r="${r}" stroke-linecap="round" stroke-width="${stroke}"></circle>
      <circle data-ring class="stroke-primary-container timer-ring" cx="150" cy="150" fill="none" r="${r}"
        stroke-linecap="round" stroke-width="${stroke}"
        stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"></circle>
    </svg>
    <div class="flex flex-col items-center justify-center z-10">${centerHtml}</div>
  </div>`;
}

export function setRingProgress(container, progress) {
  const ring = container.querySelector('[data-ring]');
  if (!ring) return;
  const circ = parseFloat(ring.getAttribute('stroke-dasharray'));
  ring.setAttribute('stroke-dashoffset', (circ * (1 - Math.min(1, Math.max(0, progress)))).toFixed(1));
}

// ---------- linear progress bar ----------
export function progressBar(pct, extraClass = '') {
  return `
  <div class="w-full h-1 bg-surface-container-low rounded-full overflow-hidden ${extraClass}">
    <div class="h-full bg-primary-container rounded-full" style="width:${Math.min(100, Math.max(0, pct))}%"></div>
  </div>`;
}

// ---------- empty state ----------
export function emptyState(iconName, title, hint) {
  return `
  <div class="flex flex-col items-center justify-center text-center py-16 px-8">
    ${icon(iconName, 'text-[48px] text-surface-dim mb-4')}
    <p class="text-body-lg text-on-surface font-semibold mb-1">${esc(title)}</p>
    <p class="text-body-sm text-secondary">${esc(hint)}</p>
  </div>`;
}

// ---------- modal bottom sheet ----------
// showSheet(innerHtml) → returns {el, close}. Buttons with data-close dismiss it.
export function showSheet(innerHtml) {
  const wrap = document.createElement('div');
  wrap.className = 'fixed inset-0 z-50 flex items-end justify-center';
  wrap.innerHTML = `
    <div class="modal-backdrop absolute inset-0 bg-black/40" data-close></div>
    <div class="modal-sheet relative w-full max-w-lg bg-surface-container-lowest rounded-t-2xl p-stack-md pb-safe max-h-[85vh] overflow-y-auto">
      <div class="w-10 h-1 bg-surface-dim rounded-full mx-auto mb-4"></div>
      ${innerHtml}
      <div class="h-4"></div>
    </div>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
  });
  return { el: wrap, close };
}

// Confirmation sheet; onConfirm runs when the destructive button is tapped.
export function confirmSheet({ title, message, confirmLabel = 'Delete', onConfirm }) {
  const { el, close } = showSheet(`
    <h2 class="text-headline-md text-on-surface mb-2">${esc(title)}</h2>
    <p class="text-body-md text-secondary mb-6">${esc(message)}</p>
    <div class="flex gap-3">
      <button data-close class="flex-1 py-3 rounded-full border border-on-surface text-on-surface text-label-md">Cancel</button>
      <button data-confirm class="flex-1 py-3 rounded-full bg-primary-container text-on-primary text-label-md">${esc(confirmLabel)}</button>
    </div>`);
  el.querySelector('[data-confirm]').addEventListener('click', () => {
    close();
    onConfirm();
  });
}

// ---------- form field helpers (sheet forms) ----------
export function field(label, inputHtml) {
  return `
  <label class="block mb-4">
    <span class="text-label-md uppercase tracking-wider text-secondary block mb-2">${esc(label)}</span>
    ${inputHtml}
  </label>`;
}

export const inputCls =
  'w-full px-4 py-3 rounded-lg border border-surface-container-highest bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary-container';

export function primaryBtn(label, attrs = '') {
  return `<button ${attrs} class="w-full py-4 rounded-full bg-primary-container text-on-primary text-label-md active:scale-[0.98] transition-transform">${esc(label)}</button>`;
}
