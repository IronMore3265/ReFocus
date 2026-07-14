// Shared UI building blocks, styled per the Ember Serenity design system.
import {
  formatDate, getProfile, currentStreak, dayKey, getPresets, deletePreset,
  getSettings, setSettings,
} from './store.js';
import { applyTheme } from './theme.js';
import { iconSvg } from './icons.js';

// Re-render the current route (main.js re-renders on hashchange)
export function rerender() {
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

// `solid` fills the glyph instead of stroking it. Lucide has no filled variants,
// so it only reads well where the silhouette IS the shape — the flame, play/pause.
// Anything drawn as open paths loses them to the fill (the trophy sheds its stem
// and base); a filled Timer or ListChecks is a blob. Those use .icon-strong.
export function icon(name, cls = '', solid = false) {
  return iconSvg(name, `${solid ? 'icon-solid' : ''} ${cls}`);
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
    return `<img src="${esc(p.picture)}" alt="" class="${sizeCls} rounded-full object-cover bg-accent" />`;
  }
  if (p.name) {
    return `<span class="${sizeCls} rounded-full bg-accent text-on-primary flex items-center justify-center text-label-md font-bold">${esc(p.name[0].toUpperCase())}</span>`;
  }
  return icon('user');
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
          ${icon('streak', 'text-[16px]', true)}
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
        ${icon('back')}
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
  { route: '#/reading', iconName: 'book', label: 'Reading' },
  { route: '#/tasks', iconName: 'tasks', label: 'Tasks' },
];

export function bottomNav(activeRoute) {
  return `
  <nav class="pb-safe fixed bottom-0 left-0 w-full z-40 bg-surface border-t border-surface-container">
    <div class="flex justify-around items-center h-16 px-4">
      ${TABS.map((t) => {
        const active = t.route === activeRoute;
        return `
        <button data-nav="${t.route}" class="flex flex-col items-center justify-center w-full h-full active:scale-95 transition-[transform,color] duration-200 ${
          active ? 'text-accent-soft font-bold' : 'text-secondary'
        }">
          ${icon(t.iconName, `mb-1 ${active ? 'icon-strong pop-in' : ''}`)}
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

// ---------- collapsible long text ----------
// Long text clamped to a Show more/less toggle that hides itself when the text
// fits anyway. Whether it fits can only be measured in the document, so every
// clampedText() needs a bindClampToggles(scope) once its screen has mounted.
//
// `clampCls` has to arrive as a whole class name ('line-clamp-5', not a built
// one) — Tailwind extracts candidates from the source text, so a class it never
// sees spelled out is a class it never generates.
export function clampedText(text, { clampCls = 'line-clamp-5', cls = '' } = {}) {
  return `
  <div data-clamp="${clampCls}">
    <p data-clamp-text class="${cls} whitespace-pre-line ${clampCls}">${esc(text)}</p>
    <button type="button" data-clamp-toggle class="text-label-md text-accent-soft mt-2">Show more</button>
  </div>`;
}

export function bindClampToggles(scope) {
  scope.querySelectorAll('[data-clamp]').forEach((wrap) => {
    const textEl = wrap.querySelector('[data-clamp-text]');
    const btn = wrap.querySelector('[data-clamp-toggle]');
    if (!textEl || !btn) return;
    // An unclamped scrollHeight no taller than the box means nothing is being cut.
    if (textEl.scrollHeight <= textEl.clientHeight + 2) {
      btn.classList.add('hidden');
      return;
    }
    const clampCls = wrap.getAttribute('data-clamp');
    btn.addEventListener('click', () => {
      const clamped = textEl.classList.toggle(clampCls);
      btn.textContent = clamped ? 'Show more' : 'Show less';
    });
  });
}

// ---------- modal bottom sheet ----------
// Open sheets, top-most last — lets the Android back button pop them in order.
const openSheets = [];

// Closes the top-most open sheet (with its exit animation). Returns whether
// there was one — the back-button handler uses this to decide what back means.
export function closeTopSheet() {
  const top = openSheets[openSheets.length - 1];
  if (!top) return false;
  top();
  return true;
}

// showSheet(innerHtml) → returns {el, close}. Buttons with data-close dismiss
// it; so do a backdrop tap, a downward swipe, and the hardware back button.
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

  const sheet = wrap.querySelector('.modal-sheet');
  const backdrop = wrap.querySelector('.modal-backdrop');
  let closed = false;

  const remove = () => {
    wrap.remove();
    const i = openSheets.indexOf(close);
    if (i !== -1) openSheets.splice(i, 1);
  };

  const close = () => {
    if (closed) return;
    closed = true;
    sheet.style.transition = 'none';
    sheet.style.animation = 'sheetOut 0.25s cubic-bezier(0.4, 0, 1, 1) both';
    backdrop.style.animation = 'backdropOut 0.25s ease-out both';
    setTimeout(remove, 250);
  };
  openSheets.push(close);

  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
  });

  // --- swipe down to dismiss ---
  // Only when the sheet is scrolled to the top and the touch doesn't start
  // inside something that handles its own vertical drag: the date/time wheel
  // columns scroll themselves, and a textarea scrolls its own text — dragging
  // down inside one used to pull the whole sheet away and lose what was typed.
  // The sheet can still be dismissed by the backdrop, the handle, a drag on any
  // other part of it, and the hardware back button.
  const NO_DRAG = '.wheel-column, textarea, input, select, [data-no-drag]';
  let startY = null;
  let startT = 0;
  let dragging = false;

  sheet.addEventListener('touchstart', (e) => {
    startY = null;
    if (closed || sheet.scrollTop > 0) return;
    if (e.target.closest(NO_DRAG)) return;
    startY = e.touches[0].clientY;
    startT = Date.now();
    dragging = false;
  }, { passive: true });

  sheet.addEventListener('touchmove', (e) => {
    if (startY === null || closed) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0 && !dragging) { startY = null; return; } // upward — let it scroll
    if (!dragging) {
      dragging = true;
      // `.modal-sheet` fills the sheetIn keyframes forwards, and an animation's
      // transform outranks the style attribute — so the drag below is invisible
      // until the animation is off. Also take the gesture off the compositor, or
      // Android hands us non-cancelable touchmoves and preventDefault is ignored.
      sheet.style.animation = 'none';
      sheet.classList.add('is-dragging');
    }
    sheet.style.transition = 'none';
    sheet.style.transform = `translateY(${Math.max(0, dy)}px)`;
    e.preventDefault();
  }, { passive: false });

  const endDrag = (e) => {
    if (startY === null || closed || !dragging) { startY = null; return; }
    const dy = e.changedTouches[0].clientY - startY;
    const dt = Date.now() - startT;
    startY = null;
    dragging = false;
    sheet.classList.remove('is-dragging');
    const flick = dy > 60 && dt < 300;
    if (dy > sheet.offsetHeight * 0.25 || flick) {
      closed = true;
      sheet.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 1, 1)';
      sheet.style.transform = 'translateY(110%)';
      backdrop.style.animation = 'backdropOut 0.2s ease-out both';
      setTimeout(remove, 200);
    } else {
      sheet.style.transition = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)';
      sheet.style.transform = 'translateY(0)';
    }
  };
  sheet.addEventListener('touchend', endDrag);
  sheet.addEventListener('touchcancel', endDrag);

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

// ---------- theme chooser ----------
// Shared by Settings and onboarding; applies the theme live on tap.
const THEMES = [
  { id: 'light', icon: 'light', label: 'Light' },
  { id: 'dark', icon: 'dark', label: 'Dark' },
  { id: 'system', icon: 'theme-auto', label: 'System' },
];

const themeBtnCls = (active) =>
  `flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-all duration-200 ${
    active ? 'bg-accent text-on-primary border-transparent' : 'border-surface-container-highest text-secondary'
  }`;

export function themeChooser() {
  const cur = getSettings().theme;
  return `
  <div class="flex gap-2" data-theme-group>
    ${THEMES.map((t) => `
    <button type="button" data-theme="${t.id}" class="${themeBtnCls(cur === t.id)}">
      ${icon(t.icon)}
      <span class="text-label-md">${t.label}</span>
    </button>`).join('')}
  </div>`;
}

// Wires the themeChooser() inside `scope`: stores the pick, applies it, and
// swaps the selection in place (no re-render, so the transition stays smooth).
export function bindThemeChooser(scope) {
  const group = scope.querySelector('[data-theme-group]');
  if (!group) return;
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme]');
    if (!btn) return;
    setSettings({ theme: btn.getAttribute('data-theme') });
    applyTheme();
    group.querySelectorAll('[data-theme]').forEach((b) => {
      b.className = themeBtnCls(b === btn);
    });
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

// ---------- card + section buttons ----------
// A row of same-sized grey glyphs can't say which one is destructive, so card
// actions are worded instead of drawn: the label carries the meaning and the
// tone carries the warning.
const TONES = {
  accent: 'text-accent-soft',
  error: 'text-error',
  muted: 'text-secondary',
};

export function textBtn(label, attrs = '', { tone = 'accent' } = {}) {
  return `
  <button type="button" ${attrs}
    class="px-3 py-2 -my-1 rounded-lg text-label-md ${TONES[tone] || TONES.accent} active:bg-surface-container transition-colors">
    ${esc(label)}
  </button>`;
}

// Compact labelled pill for section headers — replaces the bare glyph buttons
// that gave no hint of what they'd do.
export function pillBtn(label, iconName, attrs = '') {
  return `
  <button type="button" ${attrs}
    class="flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 rounded-full border border-surface-container-highest
           text-accent-soft text-label-md active:bg-accent-tint active:scale-95 transition-all">
    ${icon(iconName, 'text-[16px]')}
    ${esc(label)}
  </button>`;
}

// ---------- duration stepper ----------
// [−] value unit [+] row; the value is still an input so typing works as a fallback.
export function stepperRow(label, key, value, { min, max, step = 1, unit = 'min' } = {}) {
  const stepBtn = (dir, iconName) => `
    <button type="button" data-step-dir="${dir}" aria-label="${dir > 0 ? 'Increase' : 'Decrease'} ${esc(label)}"
      class="w-10 h-10 shrink-0 rounded-full border border-surface-container-highest text-on-surface flex items-center justify-center active:scale-90 transition-transform">
      ${icon(iconName, 'text-[20px]')}
    </button>`;
  return `
  <div class="flex items-center justify-between gap-3 py-3 border-b border-surface-container"
    data-stepper="${key}" data-min="${min}" data-max="${max}" data-step="${step}">
    <span class="text-body-md text-on-surface">${esc(label)}</span>
    <div class="flex items-center gap-1">
      ${stepBtn(-1, 'remove')}
      <div class="w-14 flex flex-col items-center">
        <input data-step-value type="number" min="${min}" max="${max}" value="${value}"
          class="w-full bg-transparent text-center text-body-lg font-bold text-on-surface focus:outline-none" />
        ${unit ? `<span class="text-label-sm text-secondary -mt-1">${esc(unit)}</span>` : ''}
      </div>
      ${stepBtn(1, 'add')}
    </div>
  </div>`;
}

// Wires every stepperRow() inside `scope`; onChange(key, value) fires on each change.
export function bindSteppers(scope, onChange) {
  scope.querySelectorAll('[data-stepper]').forEach((row) => {
    const key = row.getAttribute('data-stepper');
    const min = Number(row.getAttribute('data-min'));
    const max = Number(row.getAttribute('data-max'));
    const step = Number(row.getAttribute('data-step'));
    const input = row.querySelector('[data-step-value]');
    const clamp = (v) => Math.min(max, Math.max(min, v));
    const commit = (v) => {
      input.value = v;
      onChange(key, v);
    };
    row.querySelectorAll('[data-step-dir]').forEach((btn) => {
      const dir = Number(btn.getAttribute('data-step-dir'));
      btn.addEventListener('click', () => {
        // snap to the next multiple of step (27 → 30 / 25) instead of blind adding
        const cur = clamp(Number(input.value) || min);
        const next = dir > 0 ? Math.floor(cur / step) * step + step : Math.ceil(cur / step) * step - step;
        commit(clamp(next));
      });
    });
    input.addEventListener('change', () => commit(clamp(Number(input.value) || min)));
  });
}

export function setStepperValue(scope, key, v) {
  const input = scope.querySelector(`[data-stepper="${key}"] [data-step-value]`);
  if (input) input.value = v;
}

// ---------- timer preset chips ----------
// Renders tappable preset chips into `container` and keeps them in sync.
// getCurrent() → {focusMin, breakMin, sessionsPerRound} decides the highlighted chip;
// onApply(preset) fires on tap. Returns a redraw function for callers to invoke
// when the current values change elsewhere (e.g. a stepper tap).
export function mountPresetChips(container, { getCurrent, onApply }) {
  const draw = () => {
    const cur = getCurrent();
    const active = (p) => p.focusMin === cur.focusMin && p.breakMin === cur.breakMin
      && p.sessionsPerRound === cur.sessionsPerRound;
    container.innerHTML = `
    <div class="flex flex-wrap gap-2">
      ${getPresets().map((p) => `
      <button type="button" data-preset="${p.id}"
        class="pl-3 ${p.custom ? 'pr-1.5' : 'pr-3'} py-2 rounded-full border text-label-md flex items-center gap-1.5 transition-colors ${
          active(p) ? 'bg-accent text-on-primary border-transparent' : 'border-surface-container-highest text-secondary'
        }">
        ${esc(p.name)}
        <span class="opacity-70 font-normal">${p.focusMin}/${p.breakMin}</span>
        ${p.custom ? `<span data-preset-delete="${p.id}" role="button" aria-label="Delete ${esc(p.name)}"
          class="p-1 rounded-full opacity-70">${icon('close', 'text-[14px]')}</span>` : ''}
      </button>`).join('')}
    </div>`;
  };
  container.addEventListener('click', (e) => {
    const del = e.target.closest('[data-preset-delete]');
    if (del) {
      deletePreset(del.getAttribute('data-preset-delete'));
      draw();
      return;
    }
    const btn = e.target.closest('[data-preset]');
    if (!btn) return;
    const preset = getPresets().find((p) => p.id === btn.getAttribute('data-preset'));
    if (preset) {
      onApply(preset);
      draw();
    }
  });
  draw();
  return draw;
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
