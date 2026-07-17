package com.nfraiyan.refocus;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opens Google Lens, so a quote can be read off the page instead of typed out.
 *
 * Lens is a one-way trip: Android has no "start Lens for result" and no API that
 * hands the recognised text back to us. The user copies it inside Lens and comes
 * back — src/screens/book-detail.js offers to paste it into the note.
 *
 * There is no official intent for Lens either, hence two routes: the deep link
 * into the Google app (undocumented, so it may stop working one day), then the
 * standalone Lens app. Both need the <queries> block in AndroidManifest.xml —
 * without it package visibility hides them and both resolve to null.
 *
 * Registered by hand in MainActivity — a plugin class inside the app is not in
 * capacitor.plugins.json and the bridge will never find it on its own.
 */
@CapacitorPlugin(name = "Lens")
public class LensPlugin extends Plugin {

  private static final String GOOGLE_APP = "com.google.android.googlequicksearchbox";
  private static final String LENS_APP = "com.google.ar.lens";

  @PluginMethod
  public void open(PluginCall call) {
    Context ctx = getContext();
    PackageManager pm = ctx.getPackageManager();

    Intent deepLink = new Intent(Intent.ACTION_VIEW, Uri.parse("googleapp://lens"))
        .setPackage(GOOGLE_APP)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

    Intent standalone = pm.getLaunchIntentForPackage(LENS_APP);
    if (standalone != null) standalone.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

    // Lens not being installed is an ordinary outcome, not a failure — resolve
    // false and let the sheet say so, rather than rejecting into a catch that
    // can't tell "no Lens" apart from "the bridge broke".
    boolean opened = start(ctx, pm, deepLink) || start(ctx, pm, standalone);

    JSObject result = new JSObject();
    result.put("opened", opened);
    call.resolve(result);
  }

  private boolean start(Context ctx, PackageManager pm, Intent intent) {
    if (intent == null || intent.resolveActivity(pm) == null) return false;
    try {
      ctx.startActivity(intent);
      return true;
    } catch (Exception e) {
      // resolveActivity said yes a moment ago; losing the race (app disabled or
      // uninstalled mid-call) should fall through to the next route, not crash.
      return false;
    }
  }
}
