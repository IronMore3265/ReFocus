package com.nfraiyan.refocus;

import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridge between the JS timer engine and {@link TimerService}.
 *
 * JS pushes its state at us on every change (`sync`); the service renders the
 * notification and owns the end-of-phase alarm. Presses on the notification's
 * buttons come back the other way — live via `action` events when the WebView is
 * alive, and otherwise through `getState`, which JS calls on resume.
 *
 * Registered by hand in MainActivity — a plugin class inside the app is not in
 * capacitor.plugins.json and the bridge will never find it on its own.
 */
@CapacitorPlugin(name = "TimerService")
public class TimerServicePlugin extends Plugin {

  private static TimerServicePlugin instance;

  @Override
  public void load() {
    instance = this;
  }

  @Override
  protected void handleOnDestroy() {
    if (instance == this) instance = null;
    super.handleOnDestroy();
  }

  // ---------- called from the service ----------

  static void notifyAction(String action, TimerState state) {
    if (instance == null) return;
    com.getcapacitor.JSObject data = state.toJS();
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
}
