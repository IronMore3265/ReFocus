package com.nfraiyan.refocus;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridge between the JS timer engine and {@link TimerService}.
 *
 * JS pushes its state at us on every change (`sync`); the service renders the
 * notification and owns the end-of-phase alarm. Presses on the notification's
 * buttons come back the other way — live via `action` events when the WebView is
 * alive, and otherwise through `getState`, which JS calls on resume.
 */
@CapacitorPlugin(name = "TimerService")
public class TimerServicePlugin extends Plugin {

  private static TimerServicePlugin instance;
  private MediaPlayer previewPlayer;

  @Override
  public void load() {
    instance = this;
  }

  @Override
  protected void handleOnDestroy() {
    stopPreview();
    if (instance == this) instance = null;
    super.handleOnDestroy();
  }

  // ---------- called from the service ----------

  static void notifyAction(String action, TimerState state) {
    if (instance == null) return;
    JSObject data = state.toJS();
    data.put("action", action);
    instance.notifyListeners("action", data);
  }

  static void notifyComplete(TimerState state) {
    if (instance == null) return;
    instance.notifyListeners("complete", state.toJS());
  }

  // ---------- timer ----------

  @PluginMethod
  public void sync(PluginCall call) {
    Context ctx = getContext();
    // rev belongs to the service — JS never sets it, it only reports the last one
    // it applied. Carry the stored value forward untouched.
    long rev = TimerState.load(ctx).rev;
    Intent intent = TimerState.toIntent(ctx, call, rev);
    String status = call.getString("status", "idle");

    // An idle timer has no notification to show, and starting it *as* a foreground
    // service would oblige us to post one within 5s or be killed.
    if ("idle".equals(status)) {
      ctx.startService(intent);
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      ctx.startForegroundService(intent);
    } else {
      ctx.startService(intent);
    }
    call.resolve();
  }

  @PluginMethod
  public void getState(PluginCall call) {
    call.resolve(TimerState.load(getContext()).toJS());
  }

  @PluginMethod
  public void stopAlert(PluginCall call) {
    Context ctx = getContext();
    ctx.startService(new Intent(ctx, TimerService.class).setAction(TimerService.ACTION_STOP_ALERT));
    call.resolve();
  }

  // ---------- completion sound ----------

  @PluginMethod
  public void getSound(PluginCall call) {
    call.resolve(currentSound());
  }

  @PluginMethod
  public void pickSound(PluginCall call) {
    Intent intent = new Intent(RingtoneManager.ACTION_RINGTONE_PICKER)
      .putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE,
        RingtoneManager.TYPE_ALARM | RingtoneManager.TYPE_NOTIFICATION | RingtoneManager.TYPE_RINGTONE)
      .putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Completion sound")
      .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
      .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
      .putExtra(RingtoneManager.EXTRA_RINGTONE_DEFAULT_URI,
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM));

    String existing = prefs().getString("soundUri", null);
    if (existing != null) {
      intent.putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, Uri.parse(existing));
    }
    startActivityForResult(call, intent, "soundPicked");
  }

  @ActivityCallback
  private void soundPicked(PluginCall call, ActivityResult result) {
    if (call == null) return;
    Intent data = result.getData();
    if (data == null) {
      // Cancelled — report what is still configured rather than failing.
      call.resolve(currentSound());
      return;
    }
    Uri uri = data.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI);
    if (uri == null) {
      // "Silent" — nothing to persist; fall back to the default alarm.
      clearStoredSound();
      call.resolve(currentSound());
      return;
    }
    prefs().edit()
      .putString("soundUri", uri.toString())
      .putString("soundName", titleOf(uri))
      .apply();
    call.resolve(currentSound());
  }

  @PluginMethod
  public void clearSound(PluginCall call) {
    clearStoredSound();
    call.resolve(currentSound());
  }

  @PluginMethod
  public void previewSound(PluginCall call) {
    stopPreview();
    Uri uri = soundUri();
    try {
      previewPlayer = new MediaPlayer();
      previewPlayer.setAudioAttributes(new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build());
      previewPlayer.setDataSource(getContext(), uri);
      previewPlayer.setOnCompletionListener(mp -> stopPreview());
      previewPlayer.prepare();
      previewPlayer.start();
      call.resolve();
    } catch (Exception e) {
      stopPreview();
      call.reject("Could not play that sound.");
    }
  }

  @PluginMethod
  public void stopPreviewSound(PluginCall call) {
    stopPreview();
    call.resolve();
  }

  // ---------- helpers ----------

  private void stopPreview() {
    if (previewPlayer == null) return;
    try {
      previewPlayer.stop();
    } catch (IllegalStateException ignored) {
      // never started
    }
    previewPlayer.release();
    previewPlayer = null;
  }

  private void clearStoredSound() {
    prefs().edit().remove("soundUri").remove("soundName").apply();
  }

  private Uri soundUri() {
    String saved = prefs().getString("soundUri", null);
    if (saved != null) return Uri.parse(saved);
    Uri alarm = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
    return alarm != null ? alarm : RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
  }

  /** { name, isDefault } — the URI itself is of no use to JS. */
  private JSObject currentSound() {
    String saved = prefs().getString("soundUri", null);
    JSObject o = new JSObject();
    o.put("isDefault", saved == null);
    o.put("name", saved == null
      ? "Default alarm sound"
      : prefs().getString("soundName", "Custom sound"));
    return o;
  }

  private String titleOf(Uri uri) {
    try {
      String title = RingtoneManager.getRingtone(getContext(), uri).getTitle(getContext());
      if (title != null && !title.isEmpty()) return title;
    } catch (Exception ignored) {
      // unreadable title — the URI still plays
    }
    return "Custom sound";
  }

  private SharedPreferences prefs() {
    return getContext().getSharedPreferences(TimerService.PREFS, Context.MODE_PRIVATE);
  }
}
