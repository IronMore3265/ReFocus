package com.nfraiyan.refocus;

import android.os.Bundle;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState); // BridgeActivity builds the bridge + WebView here

    // Android 12+ stretch overscroll translates the whole scrolling layer, which drags
    // our position:fixed headers up under the status bar. CSS overscroll-behavior only
    // stops scroll chaining, not the stretch — this View-level flag is the actual fix.
    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
    }
  }
}
