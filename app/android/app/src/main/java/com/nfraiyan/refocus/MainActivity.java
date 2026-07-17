package com.nfraiyan.refocus;

import android.os.Bundle;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Capacitor auto-loads only the plugins in the generated capacitor.plugins.json,
    // which lists npm packages — a plugin class living in the app has to be declared
    // here, before super.onCreate() builds the bridge. Without this every call from
    // src/native/timer-service.js rejects into its catch, and the timer silently has
    // no notification, no controls and no end-of-phase alarm.
    registerPlugin(TimerServicePlugin.class);
    registerPlugin(UpdaterPlugin.class);
    registerPlugin(SystemBarsPlugin.class);
    registerPlugin(LensPlugin.class);

    super.onCreate(savedInstanceState); // BridgeActivity builds the bridge + WebView here

    // Android 12+ stretch overscroll translates the whole scrolling layer, which drags
    // our position:fixed headers up under the status bar. CSS overscroll-behavior only
    // stops scroll chaining, not the stretch — this View-level flag is the actual fix.
    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
    }
  }
}
