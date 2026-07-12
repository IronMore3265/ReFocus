package com.nfraiyan.refocus;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;

/**
 * The service's mirror of the JS timer state, persisted so it survives the
 * activity being destroyed.
 *
 * `rev` is only bumped when a notification button mutates the state. JS compares
 * it against the last rev it applied and adopts our copy when they differ — that
 * is how a Pause pressed with the app closed makes it back into the engine.
 */
public class TimerState {

  public String phase = "focus";   // "focus" | "break"
  public String status = "idle";   // "idle" | "running" | "paused"
  public long endAt = 0;
  public long remainingMs = 0;
  public int round = 0;
  public int sessionsPerRound = 4;
  public long focusMs = 25 * 60 * 1000L;
  public long breakMs = 5 * 60 * 1000L;
  public boolean soundEnabled = true;
  public boolean vibrationEnabled = true;
  public long rev = 0;

  public long phaseDurationMs() {
    return "focus".equals(phase) ? focusMs : breakMs;
  }

  public static TimerState load(Context ctx) {
    SharedPreferences p = ctx.getSharedPreferences(TimerService.PREFS, Context.MODE_PRIVATE);
    TimerState s = new TimerState();
    s.phase = p.getString("phase", s.phase);
    s.status = p.getString("status", s.status);
    s.endAt = p.getLong("endAt", 0);
    s.remainingMs = p.getLong("remainingMs", 0);
    s.round = p.getInt("round", 0);
    s.sessionsPerRound = p.getInt("sessionsPerRound", 4);
    s.focusMs = p.getLong("focusMs", s.focusMs);
    s.breakMs = p.getLong("breakMs", s.breakMs);
    s.soundEnabled = p.getBoolean("soundEnabled", true);
    s.vibrationEnabled = p.getBoolean("vibrationEnabled", true);
    s.rev = p.getLong("rev", 0);
    return s;
  }

  public void save(Context ctx) {
    ctx.getSharedPreferences(TimerService.PREFS, Context.MODE_PRIVATE).edit()
      .putString("phase", phase)
      .putString("status", status)
      .putLong("endAt", endAt)
      .putLong("remainingMs", remainingMs)
      .putInt("round", round)
      .putInt("sessionsPerRound", sessionsPerRound)
      .putLong("focusMs", focusMs)
      .putLong("breakMs", breakMs)
      .putBoolean("soundEnabled", soundEnabled)
      .putBoolean("vibrationEnabled", vibrationEnabled)
      .putLong("rev", rev)
      .apply();
  }

  /** Build the intent JS sends us on every state change. */
  public static Intent toIntent(Context ctx, PluginCall call, long rev) {
    return new Intent(ctx, TimerService.class)
      .setAction(TimerService.ACTION_SYNC)
      .putExtra("phase", call.getString("phase", "focus"))
      .putExtra("status", call.getString("status", "idle"))
      .putExtra("endAt", longFrom(call, "endAt", 0))
      .putExtra("remainingMs", longFrom(call, "remainingMs", 0))
      .putExtra("round", call.getInt("round", 0))
      .putExtra("sessionsPerRound", call.getInt("sessionsPerRound", 4))
      .putExtra("focusMs", longFrom(call, "focusMs", 25 * 60 * 1000L))
      .putExtra("breakMs", longFrom(call, "breakMs", 5 * 60 * 1000L))
      .putExtra("soundEnabled", Boolean.TRUE.equals(call.getBoolean("soundEnabled", true)))
      .putExtra("vibrationEnabled", Boolean.TRUE.equals(call.getBoolean("vibrationEnabled", true)))
      .putExtra("rev", rev);
  }

  public static TimerState fromIntent(Intent i) {
    TimerState s = new TimerState();
    s.phase = i.getStringExtra("phase");
    s.status = i.getStringExtra("status");
    s.endAt = i.getLongExtra("endAt", 0);
    s.remainingMs = i.getLongExtra("remainingMs", 0);
    s.round = i.getIntExtra("round", 0);
    s.sessionsPerRound = i.getIntExtra("sessionsPerRound", 4);
    s.focusMs = i.getLongExtra("focusMs", s.focusMs);
    s.breakMs = i.getLongExtra("breakMs", s.breakMs);
    s.soundEnabled = i.getBooleanExtra("soundEnabled", true);
    s.vibrationEnabled = i.getBooleanExtra("vibrationEnabled", true);
    s.rev = i.getLongExtra("rev", 0);
    return s;
  }

  public JSObject toJS() {
    JSObject o = new JSObject();
    o.put("phase", phase);
    o.put("status", status);
    o.put("endAt", endAt);
    o.put("remainingMs", remainingMs);
    o.put("round", round);
    o.put("rev", rev);
    return o;
  }

  // PluginCall has no getLong: JS numbers arrive as Double/Integer.
  private static long longFrom(PluginCall call, String key, long fallback) {
    Double d = call.getDouble(key);
    return d == null ? fallback : d.longValue();
  }
}
