package com.nothingalternative.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.modules.core.DeviceEventManagerModule

class BlockingBroadcastReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pkg = intent.getStringExtra("package") ?: "blocked"
        Log.d("NA_ForegroundService", "Broadcast received for: $pkg")

        val reactContext = ReactContextHolder.reactContext
        Log.d("NA_ForegroundService", "reactContext is null: ${reactContext == null}")

        reactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("ShowBlockingOverlay", pkg)
    }
}