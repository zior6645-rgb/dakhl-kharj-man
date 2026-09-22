package com.dakhlkharj.man;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PluginMethod;

import java.io.OutputStream;
import android.util.Base64;

@CapacitorPlugin(name = "FileSaver")
public class FileSaverPlugin extends Plugin {
    private static final String SAVE_CALLBACK = "handleSaveFile";

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

        final Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);

        startActivityForResult(call, intent, SAVE_CALLBACK);
    }

    @ActivityCallback
    private void handleSaveFile(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("File save was canceled.");
            return;
        }

        final Uri uri = result.getData().getData();
        if (uri == null) {
            call.reject("Android did not return a save location.");
            return;
        }

        final String data = call.getString("data");
        if (data == null) {
            call.reject("File data is missing.");
            return;
        }

        try {
            byte[] bytes = Base64.getDecoder().decode(data);
            try (OutputStream output = getContext().getContentResolver().openOutputStream(uri)) {
                if (output == null) {
                    throw new IllegalStateException("Could not open the selected save location.");
                }
                output.write(bytes);
                output.flush();
            }

            JSObject response = new JSObject();
            response.put("uri", uri.toString());
            response.put("saved", true);
            call.resolve(response);
        } catch (Exception ex) {
            call.reject("Could not write the file to the selected location.", ex);
        }
    }
}
