package com.manshigroup.myapp;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
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
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "SmsCampaign")
public class SmsCampaignPlugin extends Plugin {

    @PluginMethod
    public void canSendSms(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(Intent.ACTION_SENDTO);
        intent.setData(Uri.parse("smsto:"));
        boolean available = intent.resolveActivity(context.getPackageManager()) != null;

        JSObject result = new JSObject();
        result.put("available", available);
        call.resolve(result);
    }

    @PluginMethod
    public void openSms(PluginCall call) {
        JSArray recipientsArray = call.getArray("recipients");
        String message = call.getString("message", "");
        String imageUrl = call.getString("imageUrl", "");
        String separator = call.getString("separator", ",");

        if (recipientsArray == null || recipientsArray.length() == 0) {
            call.reject("Recipient phone numbers list cannot be empty.");
            return;
        }

        List<String> recipientsList = new ArrayList<>();
        try {
            for (int i = 0; i < recipientsArray.length(); i++) {
                String phone = recipientsArray.getString(i);
                if (phone != null && !phone.trim().isEmpty()) {
                    recipientsList.add(phone.trim().replaceAll("[\\s\\-\\(\\)]", ""));
                }
            }
        } catch (Exception e) {
            call.reject("Error parsing recipient phone numbers: " + e.getMessage());
            return;
        }

        if (recipientsList.isEmpty()) {
            call.reject("No valid recipient phone numbers provided.");
            return;
        }

        // Build joined recipients string using the requested separator (, or ;)
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < recipientsList.size(); i++) {
            if (i > 0) sb.append(separator);
            sb.append(recipientsList.get(i));
        }
        String joinedRecipients = sb.toString();

        // If an image URL is attached, attempt to share via MMS in a worker thread
        if (imageUrl != null && !imageUrl.trim().isEmpty() && imageUrl.startsWith("http")) {
            new Thread(() -> {
                try {
                    File cachedFile = downloadImageToCache(imageUrl);
                    if (cachedFile != null && cachedFile.exists()) {
                        Uri contentUri = FileProvider.getUriForFile(
                            getContext(),
                            getContext().getPackageName() + ".fileprovider",
                            cachedFile
                        );

                        Intent mmsIntent = new Intent(Intent.ACTION_SEND);
                        mmsIntent.setType("image/*");
                        mmsIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                        mmsIntent.putExtra("sms_body", message);
                        mmsIntent.putExtra(Intent.EXTRA_TEXT, message);
                        mmsIntent.putExtra("address", joinedRecipients);
                        mmsIntent.putExtra("android.intent.extra.PHONE_NUMBER", joinedRecipients);
                        mmsIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        mmsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                        getActivity().runOnUiThread(() -> {
                            try {
                                getContext().startActivity(mmsIntent);
                                JSObject ret = new JSObject();
                                ret.put("success", true);
                                ret.put("mode", "mms");
                                ret.put("recipientCount", recipientsList.size());
                                ret.put("mmsAttempted", true);
                                call.resolve(ret);
                            } catch (Exception ex) {
                                // Fall back to text-only SMS if MMS intent cannot be launched
                                launchTextSms(joinedRecipients, message, recipientsList.size(), call);
                            }
                        });
                        return;
                    }
                } catch (Exception e) {
                    // Fall back to text-only SMS
                }

                getActivity().runOnUiThread(() -> {
                    launchTextSms(joinedRecipients, message, recipientsList.size(), call);
                });
            }).start();
        } else {
            launchTextSms(joinedRecipients, message, recipientsList.size(), call);
        }
    }

    private void launchTextSms(String joinedRecipients, String message, int count, PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_SENDTO);
            intent.setData(Uri.parse("smsto:" + joinedRecipients));
            intent.putExtra("sms_body", message);
            intent.putExtra(Intent.EXTRA_TEXT, message);
            intent.putExtra("address", joinedRecipients);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("mode", "sms");
            ret.put("recipientCount", count);
            ret.put("mmsAttempted", false);
            call.resolve(ret);
        } catch (ActivityNotFoundException e) {
            // Secondary fallback using ACTION_VIEW with sms: URI
            try {
                Intent fallback = new Intent(Intent.ACTION_VIEW);
                fallback.setData(Uri.parse("sms:" + joinedRecipients));
                fallback.putExtra("sms_body", message);
                fallback.putExtra(Intent.EXTRA_TEXT, message);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                getContext().startActivity(fallback);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("mode", "sms_fallback");
                ret.put("recipientCount", count);
                call.resolve(ret);
            } catch (Exception fallbackErr) {
                call.reject("No SMS or messaging application found on this device.");
            }
        } catch (Exception e) {
            call.reject("Failed to open SMS application: " + e.getMessage());
        }
    }

    private File downloadImageToCache(String imageUrl) {
        try {
            URL url = new URL(imageUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(12000);
            connection.connect();

            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                return null;
            }

            File cacheDir = getContext().getCacheDir();
            File outputFile = new File(cacheDir, "sms_campaign_attachment.jpg");

            InputStream inputStream = connection.getInputStream();
            FileOutputStream outputStream = new FileOutputStream(outputFile);

            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }

            outputStream.flush();
            outputStream.close();
            inputStream.close();

            return outputFile;
        } catch (Exception e) {
            return null;
        }
    }
}
