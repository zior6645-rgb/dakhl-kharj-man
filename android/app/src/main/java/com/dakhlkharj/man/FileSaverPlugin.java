package com.dakhlkharj.man;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import android.util.Base64;

@CapacitorPlugin(name = "FileSaver")
public class FileSaverPlugin extends Plugin {
    private static final String SAVE_CALLBACK = "handleSaveFile";
    private static final String SAVE_PDF_CALLBACK = "handleSavePdf";

    @PluginMethod
    public void pickFile(PluginCall call) {
        final Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                "text/csv",
                "text/comma-separated-values",
                "application/vnd.ms-excel",
                "application/json"
        });
        startActivityForResult(call, intent, "handlePickFile");
    }

    @ActivityCallback
    private void handlePickFile(PluginCall call, ActivityResult result) {
        if (result == null || result.getData() == null || result.getData().getData() == null) {
            call.reject("File selection was canceled.");
            return;
        }
        readUri(call, result.getData().getData());
    }

    @PluginMethod
    public void getPendingFile(PluginCall call) {
        final Intent intent = getActivity().getIntent();
        if (intent == null) {
            call.resolve(new JSObject());
            return;
        }
        Uri uri = intent.getData();
        if (uri == null && intent.getExtras() != null) {
            Object extra = intent.getExtras().get(Intent.EXTRA_STREAM);
            if (extra instanceof Uri) uri = (Uri) extra;
        }
        String action = intent.getAction();
        if (uri == null || !(Intent.ACTION_VIEW.equals(action) || Intent.ACTION_SEND.equals(action))) {
            JSObject none = new JSObject();
            none.put("pending", false);
            call.resolve(none);
            return;
        }
        readUri(call, uri);
        intent.setData(null);
        intent.removeExtra(Intent.EXTRA_STREAM);
        intent.setAction(Intent.ACTION_MAIN);
    }

    private void readUri(PluginCall call, Uri uri) {
        try {
            android.content.ContentResolver resolver = getContext().getContentResolver();
            byte[] bytes;
            try (java.io.InputStream input = resolver.openInputStream(uri);
                 java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream()) {
                if (input == null) throw new IllegalStateException("Could not open the selected file.");
                byte[] chunk = new byte[8192];
                int n;
                while ((n = input.read(chunk)) >= 0) buffer.write(chunk, 0, n);
                bytes = buffer.toByteArray();
            }

            String fileName = "imported-file";
            android.database.Cursor cursor = resolver.query(
                    uri,
                    new String[]{android.provider.OpenableColumns.DISPLAY_NAME},
                    null,
                    null,
                    null
            );
            if (cursor != null) {
                try {
                    if (cursor.moveToFirst()) {
                        int index = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                        if (index >= 0 && cursor.getString(index) != null) fileName = cursor.getString(index);
                    }
                } finally {
                    cursor.close();
                }
            }

            JSObject response = new JSObject();
            response.put("pending", true);
            response.put("filename", fileName);
            String mime = resolver.getType(uri);
            response.put("mimeType", mime == null ? "application/octet-stream" : mime);
            response.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
            call.resolve(response);
        } catch (Exception ex) {
            call.reject("Could not read the selected file.", ex);
        }
    }

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

    @PluginMethod
    public void savePdf(PluginCall call) {
        final String fileName = call.getString("filename", "cashio-report.pdf");
        final JSObject report = call.getObject("report");
        if (report == null) {
            call.reject("PDF report data is required.");
            return;
        }

        final Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/pdf");
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        startActivityForResult(call, intent, SAVE_PDF_CALLBACK);
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
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
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

    @ActivityCallback
    private void handleSavePdf(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("PDF save was canceled.");
            return;
        }

        final Uri uri = result.getData().getData();
        if (uri == null) {
            call.reject("Android did not return a PDF save location.");
            return;
        }

        final JSObject report = call.getObject("report");
        if (report == null) {
            call.reject("PDF report data is missing.");
            return;
        }

        try {
            PdfDocument document = createPdf(report);
            try (OutputStream output = getContext().getContentResolver().openOutputStream(uri)) {
                if (output == null) {
                    throw new IllegalStateException("Could not open the selected PDF location.");
                }
                document.writeTo(output);
                output.flush();
            } finally {
                document.close();
            }

            JSObject response = new JSObject();
            response.put("uri", uri.toString());
            response.put("saved", true);
            call.resolve(response);
        } catch (Exception ex) {
            call.reject("Could not create the PDF report.", ex);
        }
    }

    private PdfDocument createPdf(JSObject report) throws Exception {
        final int pageWidth = 1240;
        final int pageHeight = 1754;
        final int margin = 64;
        final int contentWidth = pageWidth - (margin * 2);

        final PdfDocument document = new PdfDocument();
        PdfDocument.Page page = null;
        Canvas canvas = null;
        int pageNumber = 1;
        int y = margin;

        Typeface regular = Typeface.create("sans-serif", Typeface.NORMAL);
        Typeface medium = Typeface.create("sans-serif-medium", Typeface.NORMAL);

        TextPaint titlePaint = textPaint(42, medium, Color.rgb(20, 50, 46));
        TextPaint sectionPaint = textPaint(28, medium, Color.rgb(24, 78, 72));
        TextPaint bodyPaint = textPaint(24, regular, Color.rgb(35, 35, 35));
        TextPaint smallPaint = textPaint(20, regular, Color.rgb(85, 85, 85));
        TextPaint amountPaint = textPaint(27, medium, Color.rgb(20, 70, 62));

        page = document.startPage(new PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create());
        canvas = page.getCanvas();

        String title = report.optString("title", "Cashio - Financial Report");
        y = drawText(canvas, title, titlePaint, margin, y, contentWidth, true) + 18;

        String subtitle = report.optString("subtitle", "");
        if (!subtitle.isEmpty()) {
            y = drawText(canvas, subtitle, smallPaint, margin, y, contentWidth, true) + 16;
        }

        String exportedAt = report.optString("exportedAt", "");
        if (!exportedAt.isEmpty()) {
            y = drawText(canvas, exportedAt, smallPaint, margin, y, contentWidth, false) + 24;
        }

        drawRule(canvas, margin, y, pageWidth - margin);
        y += 26;

        JSONArray summaries = report.optJSONArray("summaries");
        if (summaries != null && summaries.length() > 0) {
            y = drawText(canvas, report.optString("summaryTitle", "Financial Summary"), sectionPaint, margin, y, contentWidth, true) + 14;
            for (int i = 0; i < summaries.length(); i++) {
                JSONObject item = summaries.getJSONObject(i);
                String line = item.optString("currencyLabel", item.optString("currency", "")) +
                        " | " + item.optString("incomeLabel", "Income") + ": " + item.optString("income", "0") +
                        " | " + item.optString("expenseLabel", "Expense") + ": " + item.optString("expense", "0") +
                        " | " + item.optString("balanceLabel", "Balance") + ": " + item.optString("balance", "0");
                int h = measureText(line, bodyPaint, contentWidth, false);
                if (y + h + 12 > pageHeight - margin) {
                    document.finishPage(page);
                    pageNumber++;
                    page = document.startPage(new PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create());
                    canvas = page.getCanvas();
                    y = margin;
                }
                y = drawText(canvas, line, bodyPaint, margin, y, contentWidth, false) + 12;
            }
            y += 10;
            drawRule(canvas, margin, y, pageWidth - margin);
            y += 28;
        }

        JSONArray transactions = report.optJSONArray("transactions");
        int total = transactions == null ? 0 : transactions.length();
        if (total == 0) {
            y = drawText(canvas, report.optString("emptyText", "No transactions recorded."), bodyPaint, margin, y, contentWidth, true);
        }

        for (int i = 0; i < total; i++) {
            JSONObject tx = transactions.getJSONObject(i);

            String date = tx.optString("date", "");
            String time = tx.optString("time", "");
            String type = tx.optString("type", "");
            String titleText = tx.optString("title", "");
            String category = tx.optString("category", "");
            String amount = tx.optString("amount", "");
            String description = tx.optString("description", "");

            int titleH = measureText(titleText, sectionPaint, contentWidth - 210, true);
            int detailsH = measureText(
                    tx.optString("dateLabel", "Date") + ": " + date + "  " +
                    tx.optString("timeLabel", "Time") + ": " + time + "  " +
                    tx.optString("typeLabel", "Type") + ": " + type,
                    smallPaint, contentWidth - 210, true
            );
            int categoryH = measureText(
                    tx.optString("categoryLabel", "Category") + ": " + category,
                    smallPaint, contentWidth, true
            );
            int amountH = measureText(amount, amountPaint, 260, false);
            int descH = description.trim().isEmpty() ? 0 :
                    measureText(tx.optString("descriptionLabel", "Description") + ": " + description, smallPaint, contentWidth, true);

            int cardHeight = 28 + Math.max(titleH, amountH) + 10 + detailsH + 8 + categoryH + (descH == 0 ? 0 : descH + 8) + 22;

            if (y + cardHeight > pageHeight - margin) {
                document.finishPage(page);
                pageNumber++;
                page = document.startPage(new PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create());
                canvas = page.getCanvas();
                y = margin;
            }

            Paint card = new Paint(Paint.ANTI_ALIAS_FLAG);
            card.setStyle(Paint.Style.FILL);
            card.setColor(Color.rgb(247, 250, 249));
            canvas.drawRoundRect(margin, y, pageWidth - margin, y + cardHeight, 18, 18, card);

            Paint border = new Paint(Paint.ANTI_ALIAS_FLAG);
            border.setStyle(Paint.Style.STROKE);
            border.setStrokeWidth(2);
            border.setColor(Color.rgb(190, 205, 201));
            canvas.drawRoundRect(margin, y, pageWidth - margin, y + cardHeight, 18, 18, border);

            int textY = y + 14;
            int rightBlockX = margin + 24;
            int rightBlockWidth = contentWidth - 310;
            int amountX = pageWidth - margin - 24 - 250;

            textY = drawText(canvas, titleText, sectionPaint, rightBlockX, textY, rightBlockWidth, true);
            drawText(canvas, amount, amountPaint, amountX, y + 18, 250, false);

            String details = tx.optString("dateLabel", "Date") + ": " + date + "  " +
                    tx.optString("timeLabel", "Time") + ": " + time + "  " +
                    tx.optString("typeLabel", "Type") + ": " + type;
            textY += 8;
            textY = drawText(canvas, details, smallPaint, rightBlockX, textY, rightBlockWidth, true);
            textY += 6;
            textY = drawText(canvas, tx.optString("categoryLabel", "Category") + ": " + category, smallPaint, rightBlockX, textY, contentWidth - 48, true);

            if (!description.trim().isEmpty()) {
                textY += 6;
                drawText(canvas, tx.optString("descriptionLabel", "Description") + ": " + description, smallPaint, rightBlockX, textY, contentWidth - 48, true);
            }

            y += cardHeight + 16;
        }

        document.finishPage(page);
        return document;
    }

    private TextPaint textPaint(float size, Typeface typeface, int color) {
        TextPaint paint = new TextPaint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        paint.setTextSize(size);
        paint.setTypeface(typeface);
        paint.setColor(color);
        return paint;
    }

    private int measureText(String text, TextPaint paint, int width, boolean rtl) {
        StaticLayout layout = buildLayout(text, paint, width, rtl);
        return Math.max(layout.getHeight(), 1);
    }

    private int drawText(Canvas canvas, String text, TextPaint paint, int x, int y, int width, boolean rtl) {
        StaticLayout layout = buildLayout(text, paint, width, rtl);
        canvas.save();
        canvas.translate(x, y);
        layout.draw(canvas);
        canvas.restore();
        return y + Math.max(layout.getHeight(), 1);
    }

    private StaticLayout buildLayout(String text, TextPaint paint, int width, boolean rtl) {
        CharSequence safe = text == null ? "" : text;
        return StaticLayout.Builder.obtain(safe, 0, safe.length(), paint, Math.max(width, 1))
                .setAlignment(Layout.Alignment.ALIGN_NORMAL)
                .setTextDirection(rtl ? android.text.TextDirectionHeuristics.RTL : android.text.TextDirectionHeuristics.LTR)
                .setIncludePad(false)
                .build();
    }

    private void drawRule(Canvas canvas, int left, int y, int right) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(Color.rgb(190, 205, 201));
        p.setStrokeWidth(2);
        canvas.drawLine(left, y, right, y, p);
    }
}
