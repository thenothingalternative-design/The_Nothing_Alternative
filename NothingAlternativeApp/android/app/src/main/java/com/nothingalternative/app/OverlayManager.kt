package com.nothingalternative.app

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

object OverlayManager {

    private const val TAG = "NA_ForegroundService"
    private var overlayView: android.view.View? = null
    private val handler = Handler(Looper.getMainLooper())
    private var dismissedAt: Long = 0
    private const val COOLDOWN_MS = 3000L

    fun isShowing() = overlayView != null

    fun isCoolingDown() = System.currentTimeMillis() - dismissedAt < COOLDOWN_MS

    fun show(context: Context, blockedLabel: String, isWebsite: Boolean = false) {
        if (overlayView != null) return

        val appLabel = if (blockedLabel.contains(".")) {
            blockedLabel.split(".").dropLast(1).lastOrNull() ?: blockedLabel
        } else blockedLabel

        val wm = context.applicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val layout = LinearLayout(context.applicationContext).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0A0A0A"))
            setPadding(64, 64, 64, 64)
        }

        val icon = TextView(context.applicationContext).apply {
            text = "🔒"
            textSize = 48f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 48)
        }

        val title = TextView(context.applicationContext).apply {
            text = if (isWebsite) "Site blocked" else "App blocked"
            textSize = 24f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 16)
        }

        val domainView = TextView(context.applicationContext).apply {
            text = appLabel
            textSize = 14f
            setTextColor(Color.parseColor("#666666"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 32)
        }

        val body = TextView(context.applicationContext).apply {
            text = if (isWebsite)
                "This site is blocked during your focus session."
            else
                "This app is blocked during your focus session."
            textSize = 15f
            setTextColor(Color.parseColor("#888888"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 64)
        }

        val button = TextView(context.applicationContext).apply {
            text = "Go back"
            textSize = 15f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(48, 24, 48, 24)
            setBackgroundColor(Color.parseColor("#1A1A1A"))
            setOnClickListener {
                dismiss(context)
                if (isWebsite) {
                    try {
                        val newTab = Intent(Intent.ACTION_VIEW).apply {
                            data = Uri.parse("about:blank")
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        context.applicationContext.startActivity(newTab)
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to open new tab: ${e.message}")
                    }
                } else {
                    val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                        addCategory(Intent.CATEGORY_HOME)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.applicationContext.startActivity(homeIntent)
                }
            }
        }

        layout.addView(icon)
        layout.addView(title)
        layout.addView(domainView)
        layout.addView(body)
        layout.addView(button)

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.OPAQUE
        )

        handler.post {
            try {
                wm.addView(layout, params)
                overlayView = layout
                Log.d(TAG, "Overlay shown for: $blockedLabel")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to show overlay: ${e.message}")
            }
        }
    }

    fun dismiss(context: Context) {
        dismissedAt = System.currentTimeMillis()  // ← set immediately, not inside handler.post
        val wm = context.applicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        handler.post {
            overlayView?.let {
                try {
                    wm.removeView(it)
                    Log.d(TAG, "Overlay dismissed")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to dismiss overlay: ${e.message}")
                }
                overlayView = null
            }
        }
    }

    fun isBrowserInForeground(context: Context): Boolean {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as android.app.usage.UsageStatsManager
        val now = System.currentTimeMillis()
        val events = usm.queryEvents(now - 3000L, now)
        val event = android.app.usage.UsageEvents.Event()
        var lastForeground = ""
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND) {
                lastForeground = event.packageName
            }
        }
        val browserPackages = setOf(
            "com.android.chrome",
            "com.microsoft.emmx",
            "com.brave.browser",
            "org.mozilla.firefox",
            "com.opera.browser",
            "com.sec.android.app.sbrowser",
            "com.duckduckgo.mobile.android",
            "com.google.android.googlequicksearchbox",
        )
        Log.d(TAG, "Last foreground app: $lastForeground")
        return browserPackages.contains(lastForeground)
    }
}   