// Completion feedback. On device this is all handled natively by TimerService —
// it holds an exact alarm, so it fires on time even with the app closed, and it
// loops the chosen ringtone until dismissed. What is left here is the browser
// fallback (a synthesized chime) plus the notification permission prompt.
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getSettings } from './store.js';

const isNative = Capacitor.isNativePlatform();

export async function initNotifications() {
  try {
    if (isNative) {
      // TimerService creates its own channels; this is only about the Android 13+
      // POST_NOTIFICATIONS grant, without which none of them can show.
      await LocalNotifications.requestPermissions();
    } else if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch {
    // permission denied is fine — the in-app flow still works
  }
}

// Default completion chime (three ascending sine notes)
export function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [880, 1108.7, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.55);
    });
  } catch { /* audio unavailable */ }
}

// Fires from tickTimer when a phase ends. On device the service has already rung
// (and is still ringing) by the time we get here — doubling up would be a mess.
export function completionFeedback() {
  if (isNative) return;
  const settings = getSettings();
  if (settings.vibration && navigator.vibrate) {
    navigator.vibrate([300, 120, 300, 120, 500]);
  }
  if (settings.sound) playChime();
}
