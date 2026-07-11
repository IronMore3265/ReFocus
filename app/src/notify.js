// Notification + feedback glue. Uses Capacitor LocalNotifications on device;
// degrades gracefully in the browser.
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getSettings, getCustomSound } from './store.js';

const isNative = Capacitor.isNativePlatform();
const TIMER_NOTIF_ID = 42;
const CHANNEL_ID = 'timer-alerts';

export async function initNotifications() {
  try {
    if (isNative) {
      await LocalNotifications.requestPermissions();
      // Android 8+: sound & vibration are channel properties — without a
      // high-importance channel the alert arrives silently.
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Timer alerts',
        description: 'Fires when a focus session or break ends',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#950606',
      });
    } else if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch {
    // permission denied is fine — the in-app flow still works
  }
}

// Schedule the "session finished" alert for a running phase.
export async function scheduleEndNotification(phase, endAt) {
  const title = phase === 'focus' ? 'Focus session complete' : 'Break is over';
  const body = phase === 'focus'
    ? 'Well done. Time for a break.'
    : 'Ready for the next focus session?';
  try {
    if (isNative) {
      await LocalNotifications.schedule({
        notifications: [{
          id: TIMER_NOTIF_ID,
          title,
          body,
          channelId: CHANNEL_ID,
          schedule: { at: new Date(endAt), allowWhileIdle: true },
        }],
      });
    }
  } catch {
    // notifications unavailable — timer still works in-app
  }
}

export async function cancelEndNotification() {
  try {
    if (isNative) {
      await LocalNotifications.cancel({ notifications: [{ id: TIMER_NOTIF_ID }] });
    }
  } catch { /* ignore */ }
}

// Default completion chime (three ascending sine notes)
function playChime() {
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

// Play whatever completion sound is configured (custom file or default chime).
export function playCompletionSound() {
  const custom = getCustomSound();
  if (custom?.dataUrl) {
    try {
      const audio = new Audio(custom.dataUrl);
      audio.volume = 0.9;
      audio.play().catch(playChime);
      return;
    } catch { /* fall through to chime */ }
  }
  playChime();
}

// In-app completion feedback (fires when the app is open at the moment of completion)
export function completionFeedback() {
  const settings = getSettings();
  if (settings.vibration && navigator.vibrate) {
    navigator.vibrate([300, 120, 300, 120, 500]);
  }
  if (settings.sound) playCompletionSound();
}
