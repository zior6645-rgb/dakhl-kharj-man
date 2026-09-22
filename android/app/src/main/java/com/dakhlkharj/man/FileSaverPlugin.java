package com.dakhlkharj.man;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import java.io.OutputStream;

@CapacitorPlugin(name = "FileSaver")
public class FileSaverPlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        final String fileName = call.getString("filename");
        final String mimeType = call.getString("mimeType", "application/octet-stream");
        final String data = call.getString("data");

        if (fileName == null || fileName.trim().isEmpty()) {
            call.reject("File name is required.");
            return;
        }
        if (data == null) {
            call.reject("File data is required.");
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("Public Downloads export requires Android 10 or newer.");
            return;
        }

        final String safeName = fileName.replaceAll("[\\/:*?\"<>|\r\n]", "_").trim();
        final ContentResolver resolver = getContext().getContentResolver();
        final ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, safeName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Cashio");
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri uri = null;
        try {
            uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) {
                call.reject("Android could not create the download file.");
                return;
            }

            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            try (OutputStream output = resolver.openOutputStream(uri)) {
                if (output == null) {
                    throw new IllegalStateException("Could not open the download stream.");
                }
                output.write(bytes);
                output.flush();
            }

            ContentValues ready = new ContentValues();
            ready.put(MediaStore.MediaColumns.IS_PENDING, 0);
            resolver.update(uri, ready, null, null);

            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            result.put("path", "Downloads/Cashio/" + safeName);
            call.resolve(result);
        } catch (Exception ex) {
            if (uri != null) {
                try {
                    resolver.delete(uri, null, null);
                } catch (Exception ignored) {
                }
            }
            call.reject("Could not save the file to Downloads.", ex);
        }
    }
}
