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

    @Override
    protected void handleOnNewIntent(android.content.Intent intent) {
        super.handleOnNewIntent(intent);
        Uri uri = extractSharedUri(intent);
        String action = intent.getAction();
        if (uri == null || !(Intent.ACTION_VIEW.equals(action) || Intent.ACTION_SEND.equals(action))) return;
        try {
            JSObject data = readUriToJson(uri);
            notifyListeners("fileOpen", data, true);
        } catch (Exception ex) {
            JSObject error = new JSObject();
            error.put("pending", true);
            error.put("error", "Could not open the selected file: " + ex.getMessage());
            notifyListeners("fileOpen", error, true);
        } finally {
            clearConsumedIntent(intent);
        }
    }

    @PluginMethod
    public void getPendingFile(PluginCall call) {
        final Intent intent = getActivity().getIntent();
        if (intent == null) {
            call.resolve(new JSObject());
            return;
        }
        Uri uri = extractSharedUri(intent);
        String action = intent.getAction();
        if (uri == null || !(Intent.ACTION_VIEW.equals(action) || Intent.ACTION_SEND.equals(action))) {
            JSObject none = new JSObject();
            none.put("pending", false);
            call.resolve(none);
            return;
        }
        try {
            call.resolve(readUriToJson(uri));
        } catch (Exception ex) {
            JSObject error = new JSObject();
            error.put("pending", true);
            error.put("error", "Could not open the selected file: " + ex.getMessage());
            call.resolve(error);
        } finally {
            clearConsumedIntent(intent);
        }
    }

    private Uri extractSharedUri(Intent intent) {
        if (intent == null) return null;
        Uri uri = intent.getData();
        if (uri == null && intent.getExtras() != null) {
            Object extra = intent.getExtras().get(Intent.EXTRA_STREAM);
            if (extra instanceof Uri) uri = (Uri) extra;
        }
        if (uri == null && intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
            uri = intent.getClipData().getItemAt(0).getUri();
        }
        return uri;
    }

    private void clearConsumedIntent(Intent intent) {
        if (intent == null) return;
        intent.setData(null);
        intent.removeExtra(Intent.EXTRA_STREAM);
        intent.setClipData(null);
        intent.setAction(Intent.ACTION_MAIN);
    }

    private String detectMimeType(String fileName, String resolverMime) {
        String mime = resolverMime == null ? "" : resolverMime.toLowerCase(java.util.Locale.ROOT);
        String lower = fileName == null ? "" : fileName.toLowerCase(java.util.Locale.ROOT);
        if (lower.endsWith(".csv")) return "text/csv";
        if (lower.endsWith(".json")) return "application/json";
        if (mime.isEmpty() || "application/octet-stream".equals(mime) || "text/plain".equals(mime) || "*/*".equals(mime)) {
            return mime.isEmpty() ? "application/octet-stream" : mime;
        }
        return mime;
    }

    private JSObject readUriToJson(Uri uri) throws Exception {
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
        response.put("mimeType", detectMimeType(fileName, mime));
        response.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
        return response;
    }

    private void readUri(PluginCall call, Uri uri) {
        try {
            call.resolve(readUriToJson(uri));
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

        y += 10;
        String indicatorsTitle = report.optString("indicatorsTitle", "Financial indicators");
        y = drawText(canvas, indicatorsTitle, sectionPaint, margin, y, contentWidth, true) + 16;

        JSONArray indicators = report.optJSONArray("indicators");
        int indicatorCount = indicators == null ? 0 : indicators.length();
        int metricGap = 14;
        int metricW = (contentWidth - metricGap) / 2;
        int metricH = 92;
        int rows = Math.max(1, (indicatorCount + 1) / 2);
        for (int i = 0; i < indicatorCount; i++) {
            JSONObject item = indicators.getJSONObject(i);
            int col = i % 2;
            int row = i / 2;
            int x = margin + col * (metricW + metricGap);
            int cardY = y + row * (metricH + metricGap);
            drawMetricCard(canvas, item.optString("label",""), item.optString("value","—"), x, cardY, metricW, metricH, bodyPaint, amountPaint);
        }
        y += rows * (metricH + metricGap) + 10;

        JSONArray categories = report.optJSONArray("categoryDistribution");
        JSONArray trend = report.optJSONArray("trend");
        if ((categories != null && categories.length() > 0) || (trend != null && trend.length() > 0)) {
            if (y + 470 > pageHeight - margin) {
                document.finishPage(page);
                pageNumber++;
                page = document.startPage(new PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create());
                canvas = page.getCanvas();
                y = margin;
            }
            y = drawText(canvas, report.optString("chartsTitle", "Report charts"), sectionPaint, margin, y, contentWidth, true) + 18;
            if (categories != null && categories.length() > 0) {
                drawCategoryChart(canvas, categories, margin, y, contentWidth, 205);
                y += 225;
            }
            if (trend != null && trend.length() > 0) {
                drawTrendChart(canvas, trend, margin, y, contentWidth, 235);
                y += 255;
            }
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


    private void drawMetricCard(Canvas canvas, String label, String value, int x, int y, int width, int height, TextPaint labelPaint, TextPaint valuePaint) {
        Paint card = new Paint(Paint.ANTI_ALIAS_FLAG);
        card.setColor(Color.rgb(247, 250, 249));
        card.setStyle(Paint.Style.FILL);
        canvas.drawRoundRect(x, y, x + width, y + height, 18, 18, card);
        Paint border = new Paint(Paint.ANTI_ALIAS_FLAG);
        border.setStyle(Paint.Style.STROKE);
        border.setStrokeWidth(2);
        border.setColor(Color.rgb(190, 205, 201));
        canvas.drawRoundRect(x, y, x + width, y + height, 18, 18, border);
        drawText(canvas, label, labelPaint, x + 18, y + 14, width - 36, false);
        drawText(canvas, value, valuePaint, x + 18, y + 46, width - 36, false);
    }

    private void drawCategoryChart(Canvas canvas, JSONArray categories, int x, int y, int width, int height) throws Exception {
        int chartSize = Math.min(180, height - 12);
        float cx = x + chartSize / 2f + 8;
        float cy = y + height / 2f;
        float left = x + chartSize + 34;
        float top = y + 8;
        Paint pie = new Paint(Paint.ANTI_ALIAS_FLAG);
        float start = -90f;
        int[] colors = new int[]{
                Color.rgb(47,125,106),
                Color.rgb(90,159,139),
                Color.rgb(126,183,167),
                Color.rgb(165,207,194),
                Color.rgb(208,229,222),
                Color.rgb(120,145,163)
        };
        float total = 0f;
        for (int i = 0; i < categories.length(); i++) total += (float) categories.getJSONObject(i).optDouble("value", 0);
        if (total <= 0) return;
        for (int i = 0; i < categories.length(); i++) {
            JSONObject item = categories.getJSONObject(i);
            float value = (float) item.optDouble("value", 0);
            float sweep = value / total * 360f;
            pie.setColor(colors[i % colors.length]);
            canvas.drawArc(x + 8, y + 8, x + 8 + chartSize, y + 8 + chartSize, start, sweep, true, pie);
            start += sweep;
        }
        Paint hole = new Paint(Paint.ANTI_ALIAS_FLAG);
        hole.setColor(Color.WHITE);
        canvas.drawCircle(cx, cy, chartSize * 0.30f, hole);

        TextPaint legend = textPaint(19, Typeface.create("sans-serif", Typeface.NORMAL), Color.rgb(55,55,55));
        int max = Math.min(categories.length(), 7);
        for (int i = 0; i < max; i++) {
            JSONObject item = categories.getJSONObject(i);
            int yy = (int) top + i * 27;
            Paint dot = new Paint(Paint.ANTI_ALIAS_FLAG);
            dot.setColor(colors[i % colors.length]);
            canvas.drawCircle(left + 6, yy + 9, 6, dot);
            String text = item.optString("label","") + "  " + String.format(java.util.Locale.US, "%.1f%%", item.optDouble("percent",0));
            drawText(canvas, text, legend, (int) left + 20, yy, width - chartSize - 54, true);
        }
    }

    private void drawTrendChart(Canvas canvas, JSONArray trend, int x, int y, int width, int height) throws Exception {
        int plotLeft = x + 42;
        int plotTop = y + 16;
        int plotRight = x + width - 18;
        int plotBottom = y + height - 30;
        Paint axis = new Paint(Paint.ANTI_ALIAS_FLAG);
        axis.setColor(Color.rgb(175,185,181));
        axis.setStrokeWidth(2);
        canvas.drawLine(plotLeft, plotBottom, plotRight, plotBottom, axis);
        canvas.drawLine(plotLeft, plotTop, plotLeft, plotBottom, axis);

        double max = 1;
        double min = 0;
        for (int i = 0; i < trend.length(); i++) {
            JSONObject item = trend.getJSONObject(i);
            max = Math.max(max, item.optDouble("income",0));
            max = Math.max(max, item.optDouble("expense",0));
            max = Math.max(max, Math.abs(item.optDouble("balance",0)));
            min = Math.min(min, item.optDouble("balance",0));
        }
        double span = Math.max(1, max - min);

        Paint income = new Paint(Paint.ANTI_ALIAS_FLAG);
        income.setColor(Color.rgb(47,125,106));
        income.setStyle(Paint.Style.STROKE);
        income.setStrokeWidth(4);
        Paint expense = new Paint(Paint.ANTI_ALIAS_FLAG);
        expense.setColor(Color.rgb(184,91,91));
        expense.setStyle(Paint.Style.STROKE);
        expense.setStrokeWidth(4);
        Paint balance = new Paint(Paint.ANTI_ALIAS_FLAG);
        balance.setColor(Color.rgb(88,111,174));
        balance.setStyle(Paint.Style.STROKE);
        balance.setStrokeWidth(4);

        android.graphics.Path incomePath = new android.graphics.Path();
        android.graphics.Path expensePath = new android.graphics.Path();
        android.graphics.Path balancePath = new android.graphics.Path();

        for (int i = 0; i < trend.length(); i++) {
            JSONObject item = trend.getJSONObject(i);
            float px = trend.length() <= 1 ? (plotLeft + plotRight) / 2f :
                    plotLeft + (i / (float)(trend.length()-1)) * (plotRight - plotLeft);
            float iy = (float)(plotBottom - ((item.optDouble("income",0)-min)/span) * (plotBottom-plotTop));
            float ey = (float)(plotBottom - ((item.optDouble("expense",0)-min)/span) * (plotBottom-plotTop));
            float by = (float)(plotBottom - ((item.optDouble("balance",0)-min)/span) * (plotBottom-plotTop));
            if (i == 0) {
                incomePath.moveTo(px, iy);
                expensePath.moveTo(px, ey);
                balancePath.moveTo(px, by);
            } else {
                incomePath.lineTo(px, iy);
                expensePath.lineTo(px, ey);
                balancePath.lineTo(px, by);
            }
        }

        canvas.drawPath(incomePath, income);
        canvas.drawPath(expensePath, expense);
        canvas.drawPath(balancePath, balance);
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
