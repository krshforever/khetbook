package com.khetbook.app;

import android.Manifest;
import android.telephony.SmsManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

@CapacitorPlugin(
    name = "KhetbookNative",
    permissions = {
        @Permission(
            strings = { Manifest.permission.SEND_SMS },
            alias = "sms"
        )
    }
)
public class KhetbookNativePlugin extends Plugin {

    @PluginMethod
    public void sendSMS(PluginCall call) {
        String phone = call.getString("phone");
        String message = call.getString("message");

        if (phone == null || phone.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }
        if (message == null || message.isEmpty()) {
            call.reject("Message content is required");
            return;
        }

        // Clean up the phone number (remove non-digits, handle Indian prefix)
        String cleanPhone = phone.replaceAll("\\D", "");
        if (cleanPhone.length() == 10) {
            cleanPhone = "91" + cleanPhone;
        }

        if (getPermissionState("sms") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsCallback");
            return;
        }

        sendSmsInternal(cleanPhone, message, call);
    }

    @PermissionCallback
    private void smsCallback(PluginCall call) {
        if (getPermissionState("sms") == com.getcapacitor.PermissionState.GRANTED) {
            String phone = call.getString("phone");
            String message = call.getString("message");
            String cleanPhone = phone.replaceAll("\\D", "");
            if (cleanPhone.length() == 10) {
                cleanPhone = "91" + cleanPhone;
            }
            sendSmsInternal(cleanPhone, message, call);
        } else {
            call.reject("SMS permission was denied by the user");
        }
    }

    private void sendSmsInternal(String phone, String message, PluginCall call) {
        try {
            SmsManager smsManager;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                smsManager = getContext().getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }

            if (smsManager == null) {
                call.reject("SmsManager is not available on this device");
                return;
            }

            // Split into parts to handle Unicode character length limits (70 chars per SMS for Hindi)
            ArrayList<String> parts = smsManager.divideMessage(message);
            smsManager.sendMultipartTextMessage(phone, null, parts, null, null);

            JSObject ret = new JSObject();
            ret.put("status", "sent");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Exception sending SMS: " + e.getMessage(), e);
        }
    }
}
