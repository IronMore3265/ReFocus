package com.nfraiyan.refocus;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Downloads a release APK from GitHub and hands it to Android's package
 * installer.
 *
 * The install only lands on top of the running app because every ReFocus release
 * is signed with the same key; an APK signed with a different one is rejected as
 * INSTALL_FAILED_UPDATE_INCOMPATIBLE rather than replacing it.
 *
 * Registered by hand in MainActivity — a plugin class inside the app is not in
 * capacitor.plugins.json and the bridge will never find it on its own.
 */
@CapacitorPlugin(name = "Updater")
public class UpdaterPlugin extends Plugin {

  private final ExecutorService io = Executors.newSingleThreadExecutor();

  /** Where the downloaded APK lands. Under cacheDir, which file_paths.xml already exposes. */
  private File apkFile(String version) {
    File dir = new File(getContext().getCacheDir(), "updates");
    // noinspection ResultOfMethodCallIgnored
    dir.mkdirs();
    return new File(dir, "ReFocus-v" + version + ".apk");
  }

  @PluginMethod
  public void download(PluginCall call) {
    String url = call.getString("url");
    String version = call.getString("version", "latest");
    if (url == null || url.isEmpty()) {
      call.reject("No download URL was given.");
      return;
    }

    io.execute(() -> {
      HttpURLConnection conn = null;
      try {
        File out = apkFile(version);
        // A half-written APK from an interrupted run would install as corrupt —
        // always start the file from scratch.
        if (out.exists() && !out.delete()) {
          call.reject("Couldn't clear the previous download.");
          return;
        }

        conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setInstanceFollowRedirects(true);
        conn.setConnectTimeout(30_000);
        conn.setReadTimeout(30_000);
        conn.connect();

        int code = conn.getResponseCode();
        if (code < 200 || code >= 300) {
          call.reject("Download failed (HTTP " + code + ").");
          return;
        }

        long total = conn.getContentLengthLong();
        byte[] buf = new byte[64 * 1024];
        long read = 0;
        int lastPercent = -1;

        try (InputStream in = conn.getInputStream(); FileOutputStream fos = new FileOutputStream(out)) {
          int n;
          while ((n = in.read(buf)) != -1) {
            fos.write(buf, 0, n);
            read += n;
            if (total > 0) {
              int percent = (int) (read * 100 / total);
              // One event per whole percent; the WebView doesn't need 64 KB of them.
              if (percent != lastPercent) {
                lastPercent = percent;
                JSObject progress = new JSObject();
                progress.put("percent", percent);
                notifyListeners("progress", progress);
              }
            }
          }
        }

        JSObject result = new JSObject();
        result.put("path", out.getAbsolutePath());
        call.resolve(result);
      } catch (Exception e) {
        call.reject("Download failed: " + e.getMessage(), e);
      } finally {
        if (conn != null) conn.disconnect();
      }
    });
  }

  /**
   * Fires the system install prompt. Android will not show it unless the user has
   * allowed this app to install unknown apps, so send them to that setting first
   * if they haven't — otherwise the tap would appear to do nothing.
   */
  @PluginMethod
  public void install(PluginCall call) {
    String version = call.getString("version", "latest");
    File apk = apkFile(version);
    if (!apk.exists()) {
      call.reject("The update hasn't been downloaded yet.");
      return;
    }

    Context ctx = getContext();
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
        && !ctx.getPackageManager().canRequestPackageInstalls()) {
      Intent permission = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
          .setData(Uri.parse("package:" + ctx.getPackageName()))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      ctx.startActivity(permission);

      JSObject result = new JSObject();
      result.put("permissionRequired", true);
      call.resolve(result);
      return;
    }

    Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", apk);
    Intent intent = new Intent(Intent.ACTION_VIEW)
        .setDataAndType(uri, "application/vnd.android.package-archive")
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
    ctx.startActivity(intent);

    JSObject result = new JSObject();
    result.put("permissionRequired", false);
    call.resolve(result);
  }
}
