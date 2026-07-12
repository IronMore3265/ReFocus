// Bridge to the native TimerService plugin (android/.../TimerServicePlugin.java).
// It renders the notification countdown, owns the end-of-phase alarm, and plays
// the completion sound — all of which have to keep working with the WebView
// frozen, which is why none of it can live in JS.
//
// Every export no-ops (or returns a sane default) in the browser, so the web
// build and `npm run dev` behave exactly as before.
import { Capacitor, registerPlugin } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const TimerServiceNative = isNative ? registerPlugin('TimerService') : null;

export const nativeTimer = isNative;

// Mirror the engine's state into the service. Durations and the alert prefs ride
// along because the service has no way to read localStorage.
export async function syncNativeTimer(state, settings) {
  if (!TimerServiceNative) return;
  try {
    await TimerServiceNative.sync({
      phase: state.phase,
      status: state.status,
      endAt: state.endAt || 0,
      remainingMs: state.remainingMs || 0,
      round: state.round || 0,
      sessionsPerRound: settings.sessionsPerRound,
      focusMs: settings.focusMin * 60000,
      breakMs: settings.breakMin * 60000,
      soundEnabled: !!settings.sound,
      vibrationEnabled: !!settings.vibration,
    });
  } catch { /* the timer still runs in-app without its notification */ }
}

// The service's copy of the state, including the `rev` it bumps whenever a
// notification button changed something behind our back.
export async function getNativeTimer() {
  if (!TimerServiceNative) return null;
  try {
    return await TimerServiceNative.getState();
  } catch {
    return null;
  }
}

// Tear the notification down outright (data wipe / restore, where the engine
// state is about to vanish from under it).
export async function stopNativeTimer() {
  if (!TimerServiceNative) return;
  try {
    await TimerServiceNative.sync({ phase: 'focus', status: 'idle', endAt: 0, remainingMs: 0, round: 0 });
  } catch { /* nothing running */ }
}

export async function stopNativeAlert() {
  if (!TimerServiceNative) return;
  try {
    await TimerServiceNative.stopAlert();
  } catch { /* nothing ringing */ }
}

export function onNativeTimerEvent(event, cb) {
  if (!TimerServiceNative) return;
  TimerServiceNative.addListener(event, cb);
}

// ---------- completion sound (device ringtones) ----------

export async function getNativeSound() {
  if (!TimerServiceNative) return null;
  try {
    return await TimerServiceNative.getSound(); // { name, isDefault }
  } catch {
    return null;
  }
}

export async function pickNativeSound() {
  if (!TimerServiceNative) return null;
  return TimerServiceNative.pickSound(); // opens the system ringtone picker
}

export async function clearNativeSound() {
  if (!TimerServiceNative) return null;
  return TimerServiceNative.clearSound();
}

export async function previewNativeSound() {
  if (!TimerServiceNative) return;
  try {
    await TimerServiceNative.previewSound();
  } catch { /* unplayable — the settings screen says so */ }
}
