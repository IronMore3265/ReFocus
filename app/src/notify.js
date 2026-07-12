// Completion feedback. On device, the native TimerService handles the looping
// alarm chime and vibration — it holds an exact alarm so it fires on time even
// with the app closed. What is left here is the browser fallback plus the
// notification permission prompt.
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

// Play the ReFocus Chime (public/chime.ogg) — a single shot for the browser.
// On native, the service loops res/raw/chime.ogg itself; we don't double up.
let chimeAudio = null;
export function playChime() {
  try {
    // Stop any already-playing chime so they don't overlap
    if (chimeAudio) {
      chimeAudio.pause();
      chimeAudio.currentTime = 0;
    }
    chimeAudio = new Audio('/chime.ogg');
    chimeAudio.play();
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
