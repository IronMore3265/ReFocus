// Pomodoro state machine. State derives from a persisted end-timestamp,
// so it survives app switches, reloads, and the webview being backgrounded.
import { getSettings, logSession } from './store.js';
import { scheduleEndNotification, cancelEndNotification, completionFeedback } from './notify.js';

const KEY = 'fs.timer';

const listeners = new Set();
export function onTimerChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit(event) {
  listeners.forEach((cb) => cb(event));
}

function defaults() {
  const s = getSettings();
  return {
    phase: 'focus',          // 'focus' | 'break'
    status: 'idle',          // 'idle' | 'running' | 'paused'
    endAt: null,             // ms timestamp while running
    remainingMs: s.focusMin * 60000,
    startedAt: null,         // when the current focus phase first started
    round: 0,                // completed focus sessions in the current round
    lastSessionId: null,
  };
}

export function getTimer() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults(), ...JSON.parse(raw) } : defaults();
  } catch {
    return defaults();
  }
}

function setTimer(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
  emit({ type: 'change', state });
  return state;
}

function phaseDurationMs(phase) {
  const s = getSettings();
  return (phase === 'focus' ? s.focusMin : s.breakMin) * 60000;
}

export function remainingMs(state = getTimer()) {
  if (state.status === 'running') return Math.max(0, state.endAt - Date.now());
  return state.remainingMs;
}

export function phaseProgress(state = getTimer()) {
  const total = phaseDurationMs(state.phase);
  return total === 0 ? 0 : 1 - remainingMs(state) / total;
}

export function startTimer() {
  const t = getTimer();
  if (t.status === 'running') return t;
  const endAt = Date.now() + remainingMs(t);
  const startedAt = t.startedAt || Date.now();
  scheduleEndNotification(t.phase, endAt);
  return setTimer({ ...t, status: 'running', endAt, startedAt });
}

export function pauseTimer() {
  const t = getTimer();
  if (t.status !== 'running') return t;
  cancelEndNotification();
  return setTimer({ ...t, status: 'paused', remainingMs: remainingMs(t), endAt: null });
}

export function resetTimer() {
  const t = getTimer();
  cancelEndNotification();
  return setTimer({
    ...t, status: 'idle', endAt: null, startedAt: null,
    remainingMs: phaseDurationMs(t.phase),
  });
}

// Skip the current phase without logging it.
export function skipPhase() {
  const t = getTimer();
  cancelEndNotification();
  const nextPhase = t.phase === 'focus' ? 'break' : 'focus';
  return setTimer({
    ...t, phase: nextPhase, status: 'idle', endAt: null, startedAt: null,
    remainingMs: phaseDurationMs(nextPhase),
    round: t.phase === 'break' && t.round >= getSettings().sessionsPerRound ? 0 : t.round,
  });
}

// Called by the app's 1s heartbeat; detects phase completion.
export function tickTimer() {
  const t = getTimer();
  if (t.status !== 'running') return;
  if (Date.now() < t.endAt) {
    emit({ type: 'tick', state: t });
    return;
  }

  // Phase finished
  completionFeedback();
  if (t.phase === 'focus') {
    const s = getSettings();
    const session = logSession({
      startedAt: t.startedAt || t.endAt - s.focusMin * 60000,
      endedAt: t.endAt,
      minutes: s.focusMin,
    });
    const round = t.round + 1;
    const next = setTimer({
      ...t, phase: 'break', status: 'idle', endAt: null, startedAt: null,
      remainingMs: phaseDurationMs('break'),
      round, lastSessionId: session.id,
    });
    emit({ type: 'focus-complete', state: next, sessionId: session.id });
  } else {
    const s = getSettings();
    const next = setTimer({
      ...t, phase: 'focus', status: 'idle', endAt: null, startedAt: null,
      remainingMs: phaseDurationMs('focus'),
      round: t.round >= s.sessionsPerRound ? 0 : t.round,
    });
    emit({ type: 'break-complete', state: next });
  }
}

// After settings change, refresh an idle timer's duration display.
export function refreshIdleTimer() {
  const t = getTimer();
  if (t.status === 'idle') {
    setTimer({ ...t, remainingMs: phaseDurationMs(t.phase) });
  }
}

export function fmtClock(ms) {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
