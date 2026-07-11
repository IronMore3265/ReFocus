// Settings — timer defaults, feedback toggles, daily goal, data reset.
import { getSettings, setSettings, resetAllData } from '../store.js';
import { refreshIdleTimer } from '../engine.js';
import { subHeader, icon, confirmSheet, inputCls, rerender } from '../ui.js';

function numRow(label, key, value, min, max) {
  return `
  <div class="flex items-center justify-between py-4 border-b border-surface-container">
    <span class="text-body-md text-on-surface">${label}</span>
    <input data-num="${key}" type="number" min="${min}" max="${max}" value="${value}"
      class="${inputCls} !w-24 text-center" />
  </div>`;
}

function toggleRow(label, key, on) {
  return `
  <button data-toggle="${key}" class="w-full flex items-center justify-between py-4 border-b border-surface-container">
    <span class="text-body-md text-on-surface">${label}</span>
    <span class="w-12 h-7 rounded-full relative transition-colors ${on ? 'bg-primary-container' : 'bg-surface-container-highest'}">
      <span class="absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}"></span>
    </span>
  </button>`;
}

export function render() {
  const s = getSettings();
  return `
  ${subHeader('Settings')}
  <main class="pt-24 pb-16 px-margin-mobile max-w-2xl mx-auto page-enter">

    <section class="bg-surface-container-lowest border border-surface-container-high rounded-xl px-stack-md py-2 mb-gutter">
      <h2 class="text-label-md uppercase tracking-wider text-secondary pt-4 pb-1">Timer</h2>
      ${numRow('Focus length (min)', 'focusMin', s.focusMin, 1, 180)}
      ${numRow('Break length (min)', 'breakMin', s.breakMin, 1, 60)}
      ${numRow('Sessions per round', 'sessionsPerRound', s.sessionsPerRound, 1, 12)}
      ${numRow('Daily goal (min)', 'dailyGoalMin', s.dailyGoalMin, 15, 720)}
      <div class="h-2"></div>
    </section>

    <section class="bg-surface-container-lowest border border-surface-container-high rounded-xl px-stack-md py-2 mb-gutter">
      <h2 class="text-label-md uppercase tracking-wider text-secondary pt-4 pb-1">Alerts</h2>
      ${toggleRow('Sound', 'sound', s.sound)}
      ${toggleRow('Vibration', 'vibration', s.vibration)}
      <div class="h-2"></div>
    </section>

    <section class="bg-surface-container-lowest border border-error-container rounded-xl px-stack-md py-2">
      <h2 class="text-label-md uppercase tracking-wider text-error pt-4 pb-1">Danger Zone</h2>
      <button data-action="reset" class="w-full flex items-center gap-3 py-4 text-error">
        ${icon('delete_forever')}
        <span class="text-body-md">Reset all data</span>
      </button>
    </section>
  </main>`;
}

export function mount(root) {
  root.querySelectorAll('[data-num]').forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.getAttribute('data-num');
      const min = Number(input.min), max = Number(input.max);
      const v = Math.min(max, Math.max(min, Number(input.value) || min));
      input.value = v;
      setSettings({ [key]: v });
      refreshIdleTimer();
    });
  });
  root.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-toggle');
      setSettings({ [key]: !getSettings()[key] });
      rerender();
    });
  });
  root.querySelector('[data-action="reset"]').addEventListener('click', () => {
    confirmSheet({
      title: 'Reset all data?',
      message: 'Books, tasks, sessions, achievements, and settings will be permanently erased from this device.',
      confirmLabel: 'Erase everything',
      onConfirm: () => {
        resetAllData();
        localStorage.removeItem('fs.timer');
        location.hash = '#/onboarding';
        location.reload();
      },
    });
  });
}
