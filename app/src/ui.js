// Shared UI building blocks, styled per the Ember Serenity design system.
import { formatDate, getProfile, currentStreak, dayKey } from './store.js';

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

// ---------- avatar ----------
// Falls back to the name's initial, then to a generic glyph.
export function avatarEl(sizeCls = 'w-8 h-8') {
  const p = getProfile();
  if (p.picture) {
    return `<img src="${esc(p.picture)}" alt="" class="${sizeCls} rounded-full object-cover bg-surface-container" />`;
  }
  if (p.name) {
    return `<span class="${sizeCls} rounded-full bg-accent text-on-primary flex items-center justify-center text-label-md font-bold">${esc(p.name[0].toUpperCase())}</span>`;
  }
  return icon('account_circle');
}

// ---------- top app bar for tab pages ----------
export function appHeader() {
  const streak = currentStreak();
  return `
  <header class="pt-safe fixed top-0 w-full z-40 bg-surface border-b border-surface-container transition-colors">
    <div class="flex justify-between items-center gap-2 h-16 px-margin-mobile">
      <button data-nav="menu" class="p-2 rounded text-accent-soft active:opacity-70 transition-opacity shrink-0">
        ${icon('menu')}
      </button>
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-headline-md font-bold text-accent-soft transition-colors truncate">${formatDate()}</span>
        ${streak ? `
        <button data-nav="#/stats" aria-label="${streak} day streak"
          class="shrink-0 flex items-center gap-0.5 pl-1.5 pr-2 py-0.5 rounded-full bg-accent-tint text-accent-soft active:scale-95 transition-transform">
          ${icon('local_fire_department', 'text-[16px]', true)}
          <span class="text-label-sm font-bold">${streak}</span>
        </button>` : ''}
      </div>
      <button data-nav="#/profile" class="p-1 rounded-full text-accent-soft active:opacity-70 transition-opacity shrink-0">
        ${avatarEl('w-8 h-8')}
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
  { route: '#/home', iconName: 'home', label: 'Home' },
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
          active ? 'text-accent-soft font-bold' : 'text-secondary'
        }">
          ${icon(t.iconName, `mb-1 ${active ? 'pop-in' : ''}`, active)}
          <span class="text-label-md ${active ? '' : 'font-normal'}">${t.label}</span>
        </button>`;
      }).join('')}
    </div>
  </nav>`;
}

// ---------- FAB ----------
export function fab(action = 'add') {
  return `
  <button data-action="${action}" class="pop-in fixed bottom-24 right-margin-mobile bg-accent text-on-primary w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.12)] active:scale-95 transition-transform z-40" style="animation-delay:0.25s">
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
      <circle data-ring class="stroke-accent-soft timer-ring" cx="150" cy="150" fill="none" r="${r}"
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
    <div class="grow-x h-full bg-accent-soft rounded-full" style="width:${Math.min(100, Math.max(0, pct))}%"></div>
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
      <button data-confirm class="flex-1 py-3 rounded-full bg-error text-on-error text-label-md">${esc(confirmLabel)}</button>
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
  'w-full px-4 py-3 rounded-lg border border-surface-container-highest bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-accent-soft';

export function primaryBtn(label, attrs = '') {
  return `<button ${attrs} class="w-full py-4 rounded-full bg-accent text-on-primary text-label-md active:scale-[0.98] transition-transform">${esc(label)}</button>`;
}

// ---------- priority pills ----------
export const PRIORITIES = ['low', 'medium', 'high'];

// Colour ramps light → deep with rising priority (see .prio-* in style.css).
export function priorityPills(selected = 'medium') {
  return `
  <div class="flex gap-2" data-priority-group>
    ${PRIORITIES.map((p) => `
    <button type="button" data-priority="${p}"
      class="prio-pill prio-${p} flex-1 py-2 rounded-full text-label-md capitalize border transition-colors ${
        p === selected ? 'is-selected' : ''
      }">${p}</button>`).join('')}
  </div>`;
}

// Wires a priorityPills() group inside `scope`; onChange gets the new priority.
export function bindPriorityPills(scope, onChange) {
  const group = scope.querySelector('[data-priority-group]');
  if (!group) return;
  const pills = [...group.querySelectorAll('[data-priority]')];
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-priority]');
    if (!btn) return;
    pills.forEach((p) => p.classList.toggle('is-selected', p === btn));
    onChange(btn.getAttribute('data-priority'));
  });
}

// ---------- date + time wheel picker ----------
// Row height; must stay in sync with .wheel-item in style.css.
const WHEEL_ITEM_H = 40;

// Opens the 4-column wheel sheet. `initial` is a Date (or null → now);
// onSave receives the chosen Date. Stacks safely on top of another sheet.
export function openDateTimeSheet({ initial = null, onSave }) {
  const now = new Date();
  const d = initial ? new Date(initial) : now;
  const pad = (n) => String(n).padStart(2, '0');

  const dates = [];
  for (let i = -30; i < 365; i++) {
    dates.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
  }

  const { el, close } = showSheet(`
    <div class="flex justify-between items-center mb-4 px-2">
      <button data-close class="text-secondary px-2 py-1 text-label-md">Cancel</button>
      <h3 class="text-headline-md font-bold text-on-surface">Set Date &amp; Time</h3>
      <button data-picker-save class="text-accent px-2 py-1 text-label-md font-bold">Save</button>
    </div>
    <div class="wheel-picker mb-4">
      <div class="wheel-column" data-wheel="date">
        <div class="wheel-pad"></div>
        ${dates.map((dt) => {
          const label = dt.toDateString() === now.toDateString()
            ? 'Today'
            : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          // dayKey is local-time; toISOString() here would shift the day off-UTC.
          return `<div class="wheel-item" data-val="${dayKey(dt)}">${label}</div>`;
        }).join('')}
        <div class="wheel-pad"></div>
      </div>
      <div class="wheel-column" data-wheel="hour">
        <div class="wheel-pad"></div>
        ${Array.from({ length: 12 }, (_, i) => {
          const h = i === 0 ? 12 : i;
          return `<div class="wheel-item" data-val="${h}">${h}</div>`;
        }).join('')}
        <div class="wheel-pad"></div>
      </div>
      <div class="wheel-column" data-wheel="min">
        <div class="wheel-pad"></div>
        ${Array.from({ length: 60 }, (_, i) => `<div class="wheel-item" data-val="${i}">${pad(i)}</div>`).join('')}
        <div class="wheel-pad"></div>
      </div>
      <div class="wheel-column" data-wheel="ampm">
        <div class="wheel-pad"></div>
        <div class="wheel-item" data-val="AM">AM</div>
        <div class="wheel-item" data-val="PM">PM</div>
        <div class="wheel-pad"></div>
      </div>
    </div>`);

  const col = (name) => el.querySelector(`[data-wheel="${name}"]`);

  const setupWheel = (c, initialVal) => {
    const items = [...c.querySelectorAll('.wheel-item')];
    const updateActive = () => {
      const idx = Math.round(c.scrollTop / WHEEL_ITEM_H);
      items.forEach((it, i) => it.classList.toggle('active', i === idx));
    };
    let activeIdx = items.findIndex((it) => it.dataset.val === String(initialVal));
    if (activeIdx === -1) activeIdx = 0;
    requestAnimationFrame(() => {
      c.scrollTop = activeIdx * WHEEL_ITEM_H;
      updateActive();
    });
    c.addEventListener('scroll', () => requestAnimationFrame(updateActive));
    c.addEventListener('click', (e) => {
      const item = e.target.closest('.wheel-item');
      if (item) c.scrollTo({ top: items.indexOf(item) * WHEEL_ITEM_H, behavior: 'smooth' });
    });
  };

  const valueOf = (c) => {
    const items = c.querySelectorAll('.wheel-item');
    const idx = Math.min(Math.max(0, Math.round(c.scrollTop / WHEEL_ITEM_H)), items.length - 1);
    return items[idx].dataset.val;
  };

  const hours = d.getHours();
  setupWheel(col('date'), dayKey(d));
  setupWheel(col('hour'), hours % 12 || 12);
  setupWheel(col('min'), d.getMinutes());
  setupWheel(col('ampm'), hours >= 12 ? 'PM' : 'AM');

  el.querySelector('[data-picker-save]').addEventListener('click', () => {
    const dateStr = valueOf(col('date'));
    const min = valueOf(col('min'));
    const ampm = valueOf(col('ampm'));
    let hour = parseInt(valueOf(col('hour')), 10);
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    close(); // close *this* sheet, not whichever one is first in the DOM
    onSave(new Date(`${dateStr}T${pad(hour)}:${pad(min)}:00`));
  });
}
