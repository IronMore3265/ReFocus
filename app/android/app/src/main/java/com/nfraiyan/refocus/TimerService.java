package com.nfraiyan.refocus;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Foreground service behind the timer's notification.
 *
 * The JS engine (src/engine.js) stays the source of truth for timer state; this
 * mirrors it so the countdown, the end-of-phase alarm, and the controls keep
 * working with the WebView frozen or the activity destroyed. When a notification
 * button mutates the state we bump `rev`, and JS adopts our copy on resume.
 *
 * The countdown itself costs nothing per second: setUsesChronometer +
 * setChronometerCountDown hands the ticking to the system.
 */
public class TimerService extends Service {

  public static final String PREFS = "refocus.timer";

  public static final String ACTION_SYNC = "com.nfraiyan.refocus.SYNC";
  public static final String ACTION_CONTROL = "com.nfraiyan.refocus.CONTROL";
  public static final String ACTION_COMPLETE = "com.nfraiyan.refocus.COMPLETE";
  public static final String ACTION_STOP_ALERT = "com.nfraiyan.refocus.STOP_ALERT";
  public static final String EXTRA_CONTROL = "control";

  private static final String CHANNEL_RUNNING = "timer_running";
  private static final String CHANNEL_ALERT = "timer_alert";
  private static final int NOTIF_RUNNING = 1001;
  private static final int NOTIF_ALERT = 1002;

  // The chime loops until Done is pressed, but stands itself down after this if
  // nobody is around to press it.
  private static final long ALERT_TIMEOUT_MS = 15 * 1000L;

  private MediaPlayer alarmPlayer;
  private Vibrator vibrator;
  private final Handler handler = new Handler(Looper.getMainLooper());
  private final Runnable alertTimeout = this::stopAlert;
  private boolean alerting = false;

  @Override
  public void onCreate() {
    super.onCreate();
    vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
    createChannels();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    String action = intent == null ? null : intent.getAction();
    if (action == null) return START_STICKY;

    // Notification buttons and the alarm reach us through getForegroundService(),
    // and anything started that way must go foreground before it may stop — even
    // if the very next thing it does is stop. Post the current state first, then
    // let the handler below stand it down.
    if (!ACTION_SYNC.equals(action)) {
      startForegroundCompat(alerting ? NOTIF_ALERT : NOTIF_RUNNING,
        alerting ? alertNotification(TimerState.load(this)) : runningNotification(TimerState.load(this)));
    }

    switch (action) {
      case ACTION_SYNC:
        TimerState.fromIntent(intent).save(this);
        render();
        break;
      case ACTION_CONTROL:
        applyControl(intent.getStringExtra(EXTRA_CONTROL));
        break;
      case ACTION_COMPLETE:
        onPhaseComplete();
        break;
      case ACTION_STOP_ALERT:
        stopAlert();
        break;
      default:
        break;
    }
    return START_STICKY;
  }

  // ---------- state transitions driven from the notification ----------

  private void applyControl(String control) {
    if (control == null) return;
    TimerState s = TimerState.load(this);
    long now = System.currentTimeMillis();

    switch (control) {
      case "pause":
        if (!"running".equals(s.status)) return;
        s.remainingMs = Math.max(0, s.endAt - now);
        s.endAt = 0;
        s.status = "paused";
        break;
      case "resume":
        if (!"paused".equals(s.status)) return;
        s.endAt = now + s.remainingMs;
        s.status = "running";
        break;
      case "restart":
        // From a notification, "restart" means run this phase again from the
        // top — not drop to idle, which would be a dead end out here.
        s.remainingMs = s.phaseDurationMs();
        s.endAt = now + s.remainingMs;
        s.status = "running";
        break;
      case "stop":
        s.remainingMs = s.phaseDurationMs();
        s.endAt = 0;
        s.status = "idle";
        break;
      default:
        return;
    }

    s.rev++;
    s.save(this);
    stopAlert();
    render();
    TimerServicePlugin.notifyAction(control, s);
  }

  private void onPhaseComplete() {
    TimerState s = TimerState.load(this);
    // The JS engine detects completion itself by comparing endAt to the clock,
    // so we deliberately leave the state alone here — it logs the session and
    // advances the phase whenever it next runs. We only own the alarm.
    startAlert(s);
    TimerServicePlugin.notifyComplete(s);
  }

  // ---------- notification ----------

  private void render() {
    TimerState s = TimerState.load(this);
    if ("idle".equals(s.status)) {
      cancelAlarm();
      if (!alerting) {
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
      }
      return;
    }
    startForegroundCompat(NOTIF_RUNNING, runningNotification(s));
    if ("running".equals(s.status)) scheduleAlarm(s.endAt); else cancelAlarm();
  }

  private Notification runningNotification(TimerState s) {
    boolean running = "running".equals(s.status);
    String phase = "focus".equals(s.phase) ? "Focus" : "Break";
    int perRound = Math.max(1, s.sessionsPerRound);
    String body = running
      ? phase + " · round " + Math.min(s.round + 1, perRound) + " of " + perRound
      : "Paused · " + formatClock(s.remainingMs) + " left";

    NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_RUNNING)
      .setSmallIcon(R.drawable.ic_stat_timer)
      .setContentTitle(running ? phase + " in progress" : phase + " paused")
      .setContentText(body)
      .setContentIntent(openAppIntent())
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_ALARM);

    if (running) {
      // Let the system tick the remaining time down in the shade for us — no
      // per-second work on our side at all.
      b.setUsesChronometer(true)
        .setChronometerCountDown(true)
        .setWhen(s.endAt)
        .setShowWhen(true)
        .addAction(0, "Pause", controlIntent("pause"));
    } else {
      b.addAction(0, "Resume", controlIntent("resume"));
    }
    // Three is all Android will render.
    b.addAction(0, "Restart", controlIntent("restart"));
    b.addAction(0, "Stop", controlIntent("stop"));
    return b.build();
  }

  private Notification alertNotification(TimerState s) {
    boolean focus = "focus".equals(s.phase);
    return new NotificationCompat.Builder(this, CHANNEL_ALERT)
      .setSmallIcon(R.drawable.ic_stat_timer)
      .setContentTitle(focus ? "Focus session complete" : "Break is over")
      .setContentText(focus ? "Well done. Time for a break." : "Ready for the next focus session?")
      .setContentIntent(openAppIntent())
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setFullScreenIntent(openAppIntent(), true)
      .addAction(0, "Done", servicePendingIntent(ACTION_STOP_ALERT, "dismiss"))
      .build();
  }

  // ---------- the end-of-phase alarm ----------

  private void startAlert(TimerState s) {
    alerting = true;
    // Swap the foreground notification over to the alert: the service has to stay
    // in the foreground for the loop to keep playing.
    startForegroundCompat(NOTIF_ALERT, alertNotification(s));
    getNotificationManager().cancel(NOTIF_RUNNING);

    if (s.soundEnabled) playAlarm();
    if (s.vibrationEnabled) vibrate();
    handler.removeCallbacks(alertTimeout);
    handler.postDelayed(alertTimeout, ALERT_TIMEOUT_MS);
  }

  private void playAlarm() {
    stopPlayer();
    // The app's own chime (res/raw/chime.wav — the same triad the browser build
    // synthesizes in notify.js), bundled rather than picked, so it always plays
    // and always sounds like ReFocus. Opened as a raw file descriptor: the
    // android.resource:// URI route fails silently on some devices.
    try {
      alarmPlayer = new MediaPlayer();
      alarmPlayer.setAudioAttributes(new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build());
      AssetFileDescriptor afd = getResources().openRawResourceFd(R.raw.chime);
      try {
        alarmPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
      } finally {
        afd.close();
      }
      alarmPlayer.setLooping(true);
      alarmPlayer.prepare();
      alarmPlayer.start();
    } catch (Exception e) {
      Log.e("TimerService", "alarm chime failed to play", e);
      stopPlayer();
    }
  }

  private void vibrate() {
    if (vibrator == null || !vibrator.hasVibrator()) return;
    long[] pattern = { 0, 400, 200, 400, 1000 };
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0),
        new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
    } else {
      vibrator.vibrate(pattern, 0);
    }
  }

  private void stopAlert() {
    handler.removeCallbacks(alertTimeout);
    stopPlayer();
    if (vibrator != null) vibrator.cancel();
    if (!alerting) return;
    alerting = false;
    getNotificationManager().cancel(NOTIF_ALERT);
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
    // A phase that ran to completion leaves nothing to show; a control that
    // arrived mid-alarm (pause/restart) re-renders itself right after this.
    stopSelf();
  }

  private void stopPlayer() {
    if (alarmPlayer == null) return;
    try {
      alarmPlayer.stop();
    } catch (IllegalStateException ignored) {
      // never started
    }
    alarmPlayer.release();
    alarmPlayer = null;
  }

  // ---------- alarms ----------

  private void scheduleAlarm(long endAt) {
    AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
    if (am == null) return;
    PendingIntent pi = servicePendingIntent(ACTION_COMPLETE, "complete");
    boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms();
    if (exact) {
      am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, pi);
    } else {
      // Exact alarms revoked in settings — a late alarm still beats none.
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, pi);
    }
  }

  private void cancelAlarm() {
    AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
    if (am != null) am.cancel(servicePendingIntent(ACTION_COMPLETE, "complete"));
  }

  // ---------- plumbing ----------

  private PendingIntent servicePendingIntent(String action, String tag) {
    Intent i = new Intent(this, TimerService.class).setAction(action);
    int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
    // A user tapping a notification action, and an exact alarm firing, are both
    // allowed to start a foreground service from the background.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      return PendingIntent.getForegroundService(this, tag.hashCode(), i, flags);
    }
    return PendingIntent.getService(this, tag.hashCode(), i, flags);
  }

  private PendingIntent controlIntent(String control) {
    Intent i = new Intent(this, TimerService.class)
      .setAction(ACTION_CONTROL)
      .putExtra(EXTRA_CONTROL, control);
    int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      return PendingIntent.getForegroundService(this, control.hashCode(), i, flags);
    }
    return PendingIntent.getService(this, control.hashCode(), i, flags);
  }

  private PendingIntent openAppIntent() {
    Intent i = new Intent(this, MainActivity.class)
      .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    return PendingIntent.getActivity(this, 0, i,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }

  private void startForegroundCompat(int id, Notification n) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      ServiceCompat.startForeground(this, id, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
    } else {
      startForeground(id, n);
    }
  }

  private NotificationManager getNotificationManager() {
    return (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
  }

  private void createChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
    NotificationManager nm = getNotificationManager();

    NotificationChannel running = new NotificationChannel(
      CHANNEL_RUNNING, "Running timer", NotificationManager.IMPORTANCE_LOW);
    running.setDescription("The live countdown while a session is running");
    running.setShowBadge(false);
    running.setSound(null, null);
    nm.createNotificationChannel(running);

    NotificationChannel alert = new NotificationChannel(
      CHANNEL_ALERT, "Timer alerts", NotificationManager.IMPORTANCE_HIGH);
    alert.setDescription("Fires when a focus session or break ends");
    // The service loops the chime and vibrates itself; a channel sound would only
    // play once, and over the top of ours.
    alert.setSound(null, null);
    alert.enableVibration(false);
    alert.enableLights(true);
    alert.setLightColor(0xffc0392c);
    nm.createNotificationChannel(alert);
  }

  private static String formatClock(long ms) {
    long totalSec = Math.round(ms / 1000.0);
    return String.format(java.util.Locale.US, "%02d:%02d", totalSec / 60, totalSec % 60);
  }

  @Override
  public void onDestroy() {
    handler.removeCallbacks(alertTimeout);
    stopPlayer();
    if (vibrator != null) vibrator.cancel();
    super.onDestroy();
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }
}
