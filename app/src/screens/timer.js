// Pomodoro timer tab — ported from stitch pomodoro_timer/code.html
import { getSettings, setSettings } from '../store.js';
import {
  getTimer, startTimer, pauseTimer, resetTimer, skipPhase,
  remainingMs, phaseProgress, onTimerChange, fmtClock, refreshIdleTimer,
} from '../engine.js';
import { appHeader, bottomNav, icon, progressRing, setRingProgress, showSheet, field, inputCls, primaryBtn } from '../ui.js';

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
  return `${icon('play_arrow', '', true)} ${label}`;
}

export function render() {
  const t = getTimer();
  const s = getSettings();
  return `
  ${appHeader()}
  <main class="min-h-screen flex flex-col items-center justify-center px-margin-mobile pt-20 pb-24 fade-in">
    <div data-ring-wrap class="mb-stack-lg">
      ${progressRing({ progress: phaseProgress(t), centerHtml: centerHtml(t) })}
    </div>

    <div class="flex items-center gap-gutter">
      <button data-action="reset" class="w-14 h-14 rounded-full border border-outline text-on-surface flex items-center justify-center active:scale-95 transition-transform">
        ${icon('refresh')}
      </button>
      <button data-action="toggle" class="px-8 py-4 bg-primary-container text-on-primary rounded-full text-label-md flex items-center gap-2 active:scale-95 transition-transform shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        ${mainBtnHtml(t)}
      </button>
      <button data-action="options" class="w-14 h-14 rounded-full border border-outline text-on-surface flex items-center justify-center active:scale-95 transition-transform">
        ${icon('more_horiz')}
      </button>
    </div>

    <div class="mt-stack-lg flex gap-4 w-full max-w-sm">
      <div class="flex-1 bg-surface-container-low p-4 rounded-xl flex flex-col items-center justify-center">
        <span class="text-label-sm text-secondary">Sessions</span>
        <span data-round class="text-headline-md text-on-surface">${t.round}/${s.sessionsPerRound}</span>
      </div>
      <div class="flex-1 bg-surface-container-low p-4 rounded-xl flex flex-col items-center justify-center">
        <span class="text-label-sm text-secondary">Break</span>
        <span class="text-headline-md text-on-surface">${s.breakMin}m</span>
      </div>
      <button data-action="skip" class="flex-1 bg-surface-container-low p-4 rounded-xl flex flex-col items-center justify-center active:scale-95 transition-transform">
        <span class="text-label-sm text-secondary">Skip</span>
        ${icon('skip_next', 'text-on-surface mt-1')}
      </button>
    </div>
  </main>
  ${bottomNav('#/timer')}`;
}

function openOptions() {
  const s = getSettings();
  const { el, close } = showSheet(`
    <h2 class="text-headline-md text-on-surface mb-4">Timer Options</h2>
    <form data-form>
      ${field('Focus length (minutes)', `<input name="focusMin" type="number" min="1" max="180" value="${s.focusMin}" class="${inputCls}" />`)}
      ${field('Break length (minutes)', `<input name="breakMin" type="number" min="1" max="60" value="${s.breakMin}" class="${inputCls}" />`)}
      ${field('Sessions per round', `<input name="sessionsPerRound" type="number" min="1" max="12" value="${s.sessionsPerRound}" class="${inputCls}" />`)}
      ${primaryBtn('Save', 'type="submit"')}
    </form>`);
  el.querySelector('[data-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    setSettings({
      focusMin: Math.max(1, Number(f.get('focusMin')) || 25),
      breakMin: Math.max(1, Number(f.get('breakMin')) || 5),
      sessionsPerRound: Math.max(1, Number(f.get('sessionsPerRound')) || 4),
    });
    refreshIdleTimer();
    close();
    document.dispatchEvent(new CustomEvent('rerender-screen'));
  });
}

export function mount(root) {
  const ringWrap = root.querySelector('[data-ring-wrap]');
  const clock = root.querySelector('[data-clock]');
  const phaseEl = root.querySelector('[data-phase]');
  const toggleBtn = root.querySelector('[data-action="toggle"]');
  const roundEl = root.querySelector('[data-round]');

  const sync = () => {
    const t = getTimer();
    const s = getSettings();
    clock.textContent = fmtClock(remainingMs(t));
    phaseEl.textContent = t.phase === 'focus' ? 'Focus Session' : 'Break';
    toggleBtn.innerHTML = mainBtnHtml(t);
    roundEl.textContent = `${t.round}/${s.sessionsPerRound}`;
    setRingProgress(ringWrap, phaseProgress(t));
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
