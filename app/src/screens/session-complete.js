// Full-screen summary shown when a focus session finishes.
import { getSessions, updateSession, currentStreak, focusMinutesOn, todayKey, getSettings } from '../store.js';
import { getTimer, startTimer } from '../engine.js';
import { stopNativeAlert } from '../native/timer-service.js';
import { icon } from '../ui.js';

export function render() {
  const t = getTimer();
  const sessions = getSessions();
  const last = sessions.find((s) => s.id === t.lastSessionId) || sessions[sessions.length - 1];
  const minutes = last ? last.minutes : getSettings().focusMin;
  const todayMin = focusMinutesOn(todayKey());
  const streak = currentStreak();
  const goal = getSettings().dailyGoalMin;
  const goalPct = Math.min(100, Math.round((todayMin / goal) * 100));

  return `
  <main class="min-h-screen flex flex-col items-center justify-center px-margin-mobile py-12 text-center stagger bg-surface">
    <div class="burst w-24 h-24 rounded-full bg-accent flex items-center justify-center mb-stack-md">
      <span class="pop-in flex" style="animation-delay:0.15s">${icon('check', 'text-on-primary text-[48px]')}</span>
    </div>
    <h1 class="text-headline-lg-mobile text-on-surface mb-2">Session Complete</h1>
    <p class="text-body-lg text-secondary mb-stack-lg">${minutes} minute${minutes === 1 ? '' : 's'} of deep focus. Well done.</p>

    <div class="w-full max-w-sm grid grid-cols-3 gap-3 mb-stack-md">
      <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-4">
        <div class="text-headline-md text-accent-soft">${Math.floor(todayMin / 60)}h ${todayMin % 60}m</div>
        <div class="text-label-sm text-secondary uppercase mt-1">Today</div>
      </div>
      <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-4">
        <div class="text-headline-md text-on-surface">${streak}</div>
        <div class="text-label-sm text-secondary uppercase mt-1">Day Streak</div>
      </div>
      <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-4">
        <div class="text-headline-md text-on-surface">${goalPct}%</div>
        <div class="text-label-sm text-secondary uppercase mt-1">Daily Goal</div>
      </div>
    </div>

    <div class="w-full max-w-sm mb-stack-lg text-left">
      <label class="block">
        <span class="text-label-md uppercase tracking-wider text-secondary block mb-2">What did you work on? (optional)</span>
        <textarea data-note rows="2" placeholder="e.g. Chapter draft, API refactor…"
          class="w-full px-4 py-3 rounded-lg border border-surface-container-highest bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-accent-soft resize-none"></textarea>
      </label>
    </div>

    <div class="flex gap-3 w-full max-w-sm">
      <button data-action="done" class="flex-1 py-4 rounded-full border border-on-surface text-on-surface text-label-md active:scale-95 transition-transform">Done</button>
      <button data-action="break" class="flex-1 py-4 rounded-full bg-accent text-on-primary text-label-md active:scale-95 transition-transform">Start Break</button>
    </div>
  </main>`;
}

export function mount(root) {
  // Reaching this screen is the acknowledgement — stop the alarm ringing.
  stopNativeAlert();

  const saveNote = () => {
    const note = root.querySelector('[data-note]').value.trim();
    const t = getTimer();
    if (note && t.lastSessionId) updateSession(t.lastSessionId, { note });
  };
  root.querySelector('[data-action="break"]').addEventListener('click', () => {
    saveNote();
    startTimer(); // phase is already 'break' after focus completion
    location.hash = '#/timer';
  });
  root.querySelector('[data-action="done"]').addEventListener('click', () => {
    saveNote();
    location.hash = '#/timer';
  });
}
