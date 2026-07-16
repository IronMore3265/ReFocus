package com.nfraiyan.refocus;

import android.app.Activity;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Sets the status and navigation bar icons to light or dark.
 *
 * targetSdk 36 means edge-to-edge is mandatory: both bars are transparent and the
 * WebView draws underneath them, so the only thing left to control is whether the
 * clock, battery and back gesture pill are painted dark or light. AppTheme never
 * set windowLightStatusBar, so they were light in both themes and vanished against
 * the cream surface.
 *
 * This has to be driven from JS rather than a values-night resource, because the
 * app's theme is its own setting ('light'|'dark'|'system') and only agrees with the
 * system theme some of the time.
 *
 * Registered by hand in MainActivity — a plugin class inside the app is not in
 * capacitor.plugins.json and the bridge will never find it on its own.
 */
@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {

  @PluginMethod
  public void setStyle(PluginCall call) {
    final boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
    final Activity activity = getActivity();
    if (activity == null) {
      call.reject("No activity");
      return;
    }
    activity.runOnUiThread(() -> {
      Window window = activity.getWindow();
      WindowInsetsControllerCompat controller =
        WindowCompat.getInsetsController(window, window.getDecorView());
      // "Light bars" means light *background*, so the icons go dark — the flag reads
      // backwards from what you want to say.
      controller.setAppearanceLightStatusBars(!dark);
      controller.setAppearanceLightNavigationBars(!dark);
      call.resolve();
    });
  }
}
