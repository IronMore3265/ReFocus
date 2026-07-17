package com.nfraiyan.refocus;

import android.content.ComponentName;
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
 * Google publishes no intent for Lens, so every route below is undocumented and
 * version-dependent — the Google app can rename or unexport any of them in an
 * update. Hence a cascade rather than a single route: try each in turn and take
 * the first that resolves. They are ordered cheapest-to-most-specific, deep links
 * first, because a deep link survives an activity rename and an explicit
 * ComponentName does not.
 *
 * The legacy standalone Lens app is last and rarely present — Google pulled it
 * from the Play Store in October 2022 and folded Lens into the Google app — but
 * it costs one null check on phones old enough to still carry it.
 *
 * All routes need the <queries> block in AndroidManifest.xml — without it package
 * visibility hides both packages and every route resolves to null.
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

    // Lens not being reachable is an ordinary outcome, not a failure — resolve
    // false and let the sheet say so, rather than rejecting into a catch that
    // can't tell "no Lens" apart from "the bridge broke".
    boolean opened =
        start(ctx, pm, deepLink("google://lens"))
            || start(ctx, pm, deepLink("googleapp://lens"))
            || start(ctx, pm, component(GOOGLE_APP, "com.google.android.apps.lens.MainActivity"))
            || start(ctx, pm, component(GOOGLE_APP, "com.google.android.apps.search.lens.LensActivity"))
            || start(ctx, pm, launchOf(pm, LENS_APP));

    JSObject result = new JSObject();
    result.put("opened", opened);
    call.resolve(result);
  }

  private Intent deepLink(String uri) {
    return new Intent(Intent.ACTION_VIEW, Uri.parse(uri))
        .setPackage(GOOGLE_APP)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  }

  private Intent component(String pkg, String cls) {
    return new Intent(Intent.ACTION_MAIN)
        .setComponent(new ComponentName(pkg, cls))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  }

  private Intent launchOf(PackageManager pm, String pkg) {
    Intent intent = pm.getLaunchIntentForPackage(pkg);
    return intent == null ? null : intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  }

  private boolean start(Context ctx, PackageManager pm, Intent intent) {
    if (intent == null || intent.resolveActivity(pm) == null) return false;
    try {
      ctx.startActivity(intent);
      return true;
    } catch (Exception e) {
      // resolveActivity only proves the activity exists, not that we may start it:
      // a non-exported component throws SecurityException here. That, and losing a
      // race with an uninstall, should fall through to the next route, not crash.
      return false;
    }
  }
}
