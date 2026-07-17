package com.nfraiyan.refocus;

import android.content.Intent;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opens the Google app, one tap short of Lens, so a quote can be read off the
 * page instead of typed out. Lens sits behind the camera icon in its search bar.
 *
 * Landing next to Lens rather than in it is not a shortcut — it is the only door
 * Google leaves open. Established against the Google app (17.28.32) on a device,
 * not from documentation, because there is none:
 *
 *   - Lens really lives in LensExportedActivity. The Google app reaches it via an
 *     <activity-alias>, com.google.android.apps.search.lens.LensActivity, which
 *     is exported=false — inside the Google app only, forever out of our reach.
 *   - The exported aliases (LensExportedActivity, and MainActivity pointing at
 *     it) are the third-party door, and it is bolted. Started for result, from
 *     this app's uid, Lens logs "Lens eligibility error" and finishes before it
 *     draws a frame. Some allowlist we are not on. Started any other way it is
 *     worse: a plain startActivity earns "Caller package cannot be empty", and a
 *     bare component intent lands the user on their launcher.
 *   - So a Lens intent cannot be made to work here, only to fail more quietly.
 *     That is the trap this replaced: started for result, Lens bounces instantly,
 *     the callback fires, and the sheet offers to paste text the user never got
 *     the chance to scan. Better to open a door that opens.
 *
 * The Google app's launcher intent has no such gate. It is an ordinary launch of
 * an ordinary exported activity, which is exactly why it is dependable.
 *
 * The <queries> block in AndroidManifest.xml is load-bearing — without it package
 * visibility hides the Google app and getLaunchIntentForPackage() returns null.
 *
 * Registered by hand in MainActivity — a plugin class inside the app is not in
 * capacitor.plugins.json and the bridge will never find it on its own.
 */
@CapacitorPlugin(name = "Lens")
public class LensPlugin extends Plugin {

  private static final String GOOGLE_APP = "com.google.android.googlequicksearchbox";

  @PluginMethod
  public void open(PluginCall call) {
    PackageManager pm = getContext().getPackageManager();
    Intent intent = pm.getLaunchIntentForPackage(GOOGLE_APP);

    // The Google app not being installed is an ordinary outcome, not a failure —
    // resolve false and let the sheet say so, rather than rejecting into a catch
    // that can't tell "no Google app" apart from "the bridge broke".
    boolean opened = false;
    if (intent != null) {
      try {
        getContext().startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        opened = true;
      } catch (Exception e) {
        // Losing a race with an uninstall, or an activity unexported by an update.
        opened = false;
      }
    }

    JSObject result = new JSObject();
    result.put("opened", opened);
    call.resolve(result);
  }
}
