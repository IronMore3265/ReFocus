// Pomodoro state machine. State derives from a persisted end-timestamp,
// so it survives app switches, reloads, and the webview being backgrounded.
import { getSettings, logSession } from './store.js';
import { completionFeedback } from './notify.js';
import { syncNativeTimer, getNativeTimer, onNativeTimerEvent, stopNativeAlert } from './native/timer-service.js';

const KEY = 'fs.timer';
// The last `rev` we took from the service. It only moves when a notification
// button changed the timer, which is our cue to adopt the service's copy.
const REV_KEY = 'fs.timerRev';

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
  // Single choke point for every mutation — so the notification can never drift
  // from the engine. The service carries `rev` forward untouched on a sync, so
  // pushing state we just adopted from it can't loop back at us.
  syncNativeTimer(state, getSettings());
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

// Touching any control is the user telling us they have heard the alarm — that,
// and only that, is what stops it ringing. (Merely arriving on a screen is not:
// the completion screen opens by itself the instant the chime starts, so
// acknowledging on render would silence it before it made a sound.)
export function startTimer() {
  const t = getTimer();
  stopNativeAlert();
  if (t.status === 'running') return t;
  const endAt = Date.now() + remainingMs(t);
  const startedAt = t.startedAt || Date.now();
  return setTimer({ ...t, status: 'running', endAt, startedAt });
}

export function pauseTimer() {
  const t = getTimer();
  stopNativeAlert();
  if (t.status !== 'running') return t;
  return setTimer({ ...t, status: 'paused', remainingMs: remainingMs(t), endAt: null });
}

export function resetTimer() {
  const t = getTimer();
  stopNativeAlert();
  return setTimer({
    ...t, status: 'idle', endAt: null, startedAt: null,
    remainingMs: phaseDurationMs(t.phase),
  });
}

// Skip the current phase without logging it.
export function skipPhase() {
  const t = getTimer();
  stopNativeAlert();
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

// ---------- the notification's controls ----------

// Take over the service's copy of the state after a notification button changed
// it. `rev` only moves on a button press, so an unchanged rev means we already
// agree and there is nothing to adopt.
function adoptNativeState(n) {
  if (!n || Number(n.rev) === Number(localStorage.getItem(REV_KEY) || 0)) return;
  localStorage.setItem(REV_KEY, String(n.rev));
  const t = getTimer();
  const endAt = n.endAt || null;
  setTimer({
    ...t,
    phase: n.phase,
    status: n.status,
    endAt,
    remainingMs: n.remainingMs,
    round: n.round,
    // Restart from the notification begins a fresh phase, so the session we log
    // later has to date from this run, not the one the user restarted out of.
    startedAt: n.status === 'idle' ? null
      : (t.startedAt || (endAt ? endAt - phaseDurationMs(n.phase) : null)),
  });
}

// Reconcile on resume: the app may have been frozen while the notification was
// driving the timer.
export async function syncFromNative() {
  adoptNativeState(await getNativeTimer());
}

onNativeTimerEvent('action', adoptNativeState);
// The service's alarm is what actually detects the phase ending on device; hand
// it straight to the tick so the session gets logged and the screen advances.
onNativeTimerEvent('complete', () => tickTimer());

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
