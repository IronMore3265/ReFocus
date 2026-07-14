// Pomodoro timer tab — ported from stitch pomodoro_timer/code.html
import { getSettings, setSettings, addPreset } from '../store.js';
import {
  getTimer, startTimer, pauseTimer, resetTimer, skipPhase, endRound,
  remainingMs, phaseProgress, onTimerChange, fmtClock, refreshIdleTimer,
} from '../engine.js';
import {
  appHeader, bottomNav, icon, progressRing, setRingProgress, showSheet, confirmSheet,
  inputCls, primaryBtn, stepperRow, bindSteppers, setStepperValue, mountPresetChips,
} from '../ui.js';

// Sessions and Break only report; Skip acts. They used to share one style, which
// made a button look like a label — so the read-outs are flat and the action is
// outlined, matching the reset and options buttons above it.
const READOUT_BOX =
  'flex-1 bg-surface-container-low p-4 rounded-xl flex flex-col items-center justify-center';
const ACTION_BOX =
  'flex-1 bg-transparent border border-outline p-4 rounded-xl flex flex-col items-center justify-center text-accent-soft active:scale-95 transition-transform';

function centerHtml(t) {
  return `
    <span data-clock class="text-headline-xl text-on-surface font-bold tracking-tight" style="font-feature-settings:'tnum'">${fmtClock(remainingMs(t))}</span>
    <span data-phase class="text-label-sm text-secondary uppercase mt-2">${t.phase === 'focus' ? 'Focus Session' : 'Break'}</span>`;
}

function mainBtnHtml(t) {
  if (t.status === 'running') {
    return `${icon('pause', '', true)} Pause`;
  }
  const label = t.status === 'paused' ? 'Resume' : t.phase === 'focus' ? 'Start Focus' : 'Start Break';
  return `${icon('play', '', true)} ${label}`;
}

export function render() {
  const t = getTimer();
  const s = getSettings();
  return `
  ${appHeader()}
  <main class="min-h-screen flex flex-col items-center justify-center px-margin-mobile pt-20 pb-24 stagger">
    <div data-ring-wrap class="mb-stack-lg relative">
      <div data-pulse class="absolute inset-6 rounded-full border-2 border-accent-soft opacity-20 pulse-ring pointer-events-none ${t.status === 'running' ? '' : 'hidden'}"></div>
      ${progressRing({ progress: phaseProgress(t), centerHtml: centerHtml(t) })}
    </div>

    <div class="flex items-center gap-gutter">
      <button data-action="reset" class="w-14 h-14 rounded-full border border-outline text-on-surface flex items-center justify-center active:scale-95 transition-transform">
        ${icon('refresh')}
      </button>
      <!-- min-w + centred: the label cycles Pause / Resume / Start Focus / Start Break,
           and without a floor the button resized under your thumb on every change. -->
      <button data-action="toggle" class="min-w-[11.5rem] px-8 py-4 bg-accent text-on-primary rounded-full text-label-md flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        ${mainBtnHtml(t)}
      </button>
      <button data-action="options" class="w-14 h-14 rounded-full border border-outline text-on-surface flex items-center justify-center active:scale-95 transition-transform">
        ${icon('timer-options')}
      </button>
    </div>

    <div class="mt-stack-lg flex gap-4 w-full max-w-sm">
      <div class="${READOUT_BOX}">
        <span class="text-label-sm text-secondary">Sessions</span>
        <span data-round class="text-headline-md text-on-surface">${t.round}/${s.sessionsPerRound}</span>
      </div>
      <div class="${READOUT_BOX}">
        <span class="text-label-sm text-secondary">Break</span>
        <span data-break class="text-headline-md text-on-surface">${s.breakMin}m</span>
      </div>
      <button data-action="skip" class="${ACTION_BOX}">
        <span class="text-label-sm">Skip</span>
        ${icon('skip', 'mt-1')}
      </button>
    </div>
  </main>
  ${bottomNav('#/timer')}`;
}

function openOptions() {
  const s = getSettings();
  const { el, close } = showSheet(`
    <h2 class="text-headline-md text-on-surface mb-4">Timer Options</h2>
    <span class="text-label-md uppercase tracking-wider text-secondary block mb-2">Presets</span>
    <div data-presets class="mb-3"></div>
    ${stepperRow('Focus length', 'focusMin', s.focusMin, { min: 1, max: 180, step: 5 })}
    ${stepperRow('Break length', 'breakMin', s.breakMin, { min: 1, max: 60 })}
    ${stepperRow('Sessions per round', 'sessionsPerRound', s.sessionsPerRound, { min: 1, max: 12, unit: '' })}
    <button type="button" data-action="save-preset" class="w-full py-3 text-label-md text-accent-soft flex items-center justify-center gap-2 active:opacity-70 transition-opacity">
      ${icon('preset-save', 'text-[18px]')} Save current as preset
    </button>
    <div data-preset-name-row class="hidden flex gap-2 mb-3">
      <input data-preset-name placeholder="Preset name" class="${inputCls} flex-1" />
      <button type="button" data-action="add-preset" class="px-5 rounded-lg bg-accent text-on-primary text-label-md">Add</button>
    </div>
    ${primaryBtn('Save', 'data-action="save-options"')}
    <div class="mt-stack-md pt-4 border-t border-surface-container">
      <button type="button" data-action="end-round" class="w-full py-3 text-label-md text-error flex items-center justify-center gap-2 active:opacity-70 transition-opacity">
        ${icon('reset', 'text-[18px]')} End round &amp; start over
      </button>
    </div>`);

  const values = { focusMin: s.focusMin, breakMin: s.breakMin, sessionsPerRound: s.sessionsPerRound };
  const redrawChips = mountPresetChips(el.querySelector('[data-presets]'), {
    getCurrent: () => values,
    onApply: (p) => {
      Object.assign(values, { focusMin: p.focusMin, breakMin: p.breakMin, sessionsPerRound: p.sessionsPerRound });
      Object.keys(values).forEach((k) => setStepperValue(el, k, values[k]));
    },
  });
  bindSteppers(el, (key, v) => {
    values[key] = v;
    redrawChips();
  });

  const nameRow = el.querySelector('[data-preset-name-row]');
  const nameInput = el.querySelector('[data-preset-name]');
  el.querySelector('[data-action="save-preset"]').addEventListener('click', () => {
    nameRow.classList.toggle('hidden');
    if (!nameRow.classList.contains('hidden')) nameInput.focus();
  });
  el.querySelector('[data-action="add-preset"]').addEventListener('click', () => {
    const name = nameInput.value.trim() || `${values.focusMin}/${values.breakMin}`;
    addPreset({ name, ...values });
    nameInput.value = '';
    nameRow.classList.add('hidden');
    redrawChips();
  });

  el.querySelector('[data-action="save-options"]').addEventListener('click', () => {
    setSettings(values);
    refreshIdleTimer();
    close();
    document.dispatchEvent(new CustomEvent('rerender-screen'));
  });

  // Stacks on top of the options sheet; showSheet's openSheets keeps the back
  // button popping them in order.
  el.querySelector('[data-action="end-round"]').addEventListener('click', () => {
    confirmSheet({
      title: 'End this round?',
      message: `The session counter goes back to 0/${getSettings().sessionsPerRound} and the timer resets to a `
        + 'fresh focus session, so this round starts again from the beginning. Focus sessions you already '
        + 'finished stay in your history and stats.',
      confirmLabel: 'End round',
      onConfirm: () => {
        endRound();
        close();
        document.dispatchEvent(new CustomEvent('rerender-screen'));
      },
    });
  });
}

export function mount(root) {
  const ringWrap = root.querySelector('[data-ring-wrap]');
  const clock = root.querySelector('[data-clock]');
  const phaseEl = root.querySelector('[data-phase]');
  const toggleBtn = root.querySelector('[data-action="toggle"]');
  const roundEl = root.querySelector('[data-round]');
  const breakEl = root.querySelector('[data-break]');

  const pulseEl = root.querySelector('[data-pulse]');
  // Both read-outs are settings-derived, so both have to be rewritten here — the
  // Break tile had no hook and went on showing the old length until you left the
  // screen and came back.
  const sync = () => {
    const t = getTimer();
    const s = getSettings();
    clock.textContent = fmtClock(remainingMs(t));
    phaseEl.textContent = t.phase === 'focus' ? 'Focus Session' : 'Break';
    toggleBtn.innerHTML = mainBtnHtml(t);
    roundEl.textContent = `${t.round}/${s.sessionsPerRound}`;
    breakEl.textContent = `${s.breakMin}m`;
    setRingProgress(ringWrap, phaseProgress(t));
    pulseEl.classList.toggle('hidden', t.status !== 'running');
  };

  root.querySelector('[data-action="toggle"]').addEventListener('click', () => {
    const t = getTimer();
    if (t.status === 'running') pauseTimer(); else startTimer();
    sync();
  });
  root.querySelector('[data-action="reset"]').addEventListener('click', () => { resetTimer(); sync(); });
  root.querySelector('[data-action="skip"]').addEventListener('click', () => { skipPhase(); sync(); });
  root.querySelector('[data-action="options"]').addEventListener('click', openOptions);

  const rerender = () => sync();
  document.addEventListener('rerender-screen', rerender);
  const off = onTimerChange(() => sync());
  return () => {
    off();
    document.removeEventListener('rerender-screen', rerender);
  };
}
