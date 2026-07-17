package com.nfraiyan.refocus;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Saves a file where the user says, through the system's "Save to" picker.
 *
 * This exists because the export used to go out through the share sheet, and a
 * share sheet is the wrong door for a backup. ACTION_SEND only lists apps willing
 * to *receive* a text/csv attachment — mail, chat, Drive — so on most devices there
 * was simply no way to put the file on the phone. "Export" offered everything
 * except saving.
 *
 * ACTION_CREATE_DOCUMENT is the door that was wanted: the file picker proper, where
 * Downloads, the SD card, Drive and every other documents provider are destinations,
 * the user names the file and picks the folder, and the file lands somewhere they
 * can find it again. It needs no storage permission — the picker *is* the consent,
 * and it hands back a URI granted for that one file.
 *
 * Registered by hand in MainActivity — a plugin class inside the app is not in
 * capacitor.plugins.json and the bridge will never find it on its own.
 */
@CapacitorPlugin(name = "SaveFile")
public class SaveFilePlugin extends Plugin {

  /**
   * Opens the picker for `filename`, then writes `data` to whatever the user chose.
   * Resolves { saved: false } if they backed out — a decision, not a failure.
   */
  @PluginMethod
  public void save(PluginCall call) {
    String filename = call.getString("filename");
    String data = call.getString("data");
    if (filename == null || data == null) {
      call.reject("A filename and the file's contents are both required.");
      return;
    }

    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
        .addCategory(Intent.CATEGORY_OPENABLE)
        .setType(call.getString("mimeType", "text/csv"))
        .putExtra(Intent.EXTRA_TITLE, filename);
    startActivityForResult(call, intent, "written");
  }

  @ActivityCallback
  private void written(PluginCall call, ActivityResult result) {
    // Null when the bridge was rebuilt while the picker was up — there is nobody
    // left to resolve to.
    if (call == null) return;

    Uri uri = result.getData() != null ? result.getData().getData() : null;
    if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
      JSObject out = new JSObject();
      out.put("saved", false);
      call.resolve(out);
      return;
    }

    String data = call.getString("data");
    if (data == null) {
      call.reject("The file's contents went missing before it could be written.");
      return;
    }

    // "wt" truncates. Picking an existing file to overwrite otherwise leaves any
    // trailing bytes of the old one behind, and a backup half-followed by a longer,
    // older backup is still a corrupt file however good the first half is.
    try (OutputStream out = getContext().getContentResolver().openOutputStream(uri, "wt")) {
      if (out == null) {
        call.reject("Couldn't open that location for writing.");
        return;
      }
      out.write(data.getBytes(StandardCharsets.UTF_8));
    } catch (Exception e) {
      call.reject("Couldn't write the file: " + e.getMessage(), e);
      return;
    }

    JSObject res = new JSObject();
    res.put("saved", true);
    call.resolve(res);
  }
}
