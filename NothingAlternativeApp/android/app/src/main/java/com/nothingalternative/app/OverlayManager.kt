package com.nothingalternative.app

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
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

    fun show(context: Context, blockedLabel: String) {
        if (overlayView != null) return

        val appLabel = if (blockedLabel.contains(".")) {
            blockedLabel.split(".").dropLast(1).lastOrNull() ?: blockedLabel
        } else blockedLabel

        val wm = context.applicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val layout = LinearLayout(context.applicationContext).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0A0A0A"))
            setPadding(80, 80, 80, 80)
        }

        val iconTile = LinearLayout(context.applicationContext).apply {
            gravity = Gravity.CENTER
            val size = 180
            layoutParams = LinearLayout.LayoutParams(size, size).also {
                it.bottomMargin = 48
                it.gravity = Gravity.CENTER_HORIZONTAL
            }
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = 44f
                setColor(Color.parseColor("#16161a"))
                setStroke(2, Color.parseColor("#2a2a2e"))
            }
        }

        val iconText = TextView(context.applicationContext).apply {
            text = "∅"
            textSize = 36f
            setTextColor(Color.parseColor("#3a3aff"))
            gravity = Gravity.CENTER
        }
        iconTile.addView(iconText)

        val title = TextView(context.applicationContext).apply {
            text = "App blocked"
            textSize = 22f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setTypeface(typeface, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = 24 }
        }

        val pill = TextView(context.applicationContext).apply {
            text = appLabel
            textSize = 13f
            setTextColor(Color.parseColor("#8888aa"))
            gravity = Gravity.CENTER
            setPadding(42, 14, 42, 14)
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = 999f
                setColor(Color.parseColor("#1c1c22"))
                setStroke(2, Color.parseColor("#2a2a2e"))
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = 32; it.gravity = Gravity.CENTER_HORIZONTAL }
        }

        val body = TextView(context.applicationContext).apply {
            text = "A focus session is active.\nCome back when you're done."
            textSize = 15f
            setTextColor(Color.parseColor("#8888aa"))
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.bottomMargin = 56 }
        }

        val button = TextView(context.applicationContext).apply {
            text = "← Go back"
            textSize = 15f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setTypeface(typeface, Typeface.BOLD)
            setPadding(72, 32, 72, 32)
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = 26f
                setColor(Color.parseColor("#3a3aff"))
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.gravity = Gravity.CENTER_HORIZONTAL }
            setOnClickListener {
                dismiss(context)
                val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_HOME)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.applicationContext.startActivity(homeIntent)
            }
        }

        layout.addView(iconTile)
        layout.addView(title)
        layout.addView(pill)
        layout.addView(body)
        layout.addView(button)

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
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
        dismissedAt = System.currentTimeMillis()
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
}