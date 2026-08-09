package com.nothingalternative.app

import android.app.Application
import android.content.res.Configuration

import com.facebook.soloader.SoLoader
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.ReactContext
import android.content.IntentFilter

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              add(UsageStatsPackage())
              add(ForegroundServicePackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
      super.onCreate()
      SoLoader.init(this, OpenSourceMergedSoMapping)
      DefaultNewArchitectureEntryPoint.releaseLevel = try {
          ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
      } catch (e: IllegalArgumentException) {
          ReleaseLevel.STABLE
      }
      loadReactNative(this)
      ApplicationLifecycleDispatcher.onApplicationCreate(this)

      // Store ReactContext
      reactHost.addReactInstanceEventListener(object : ReactInstanceEventListener {
          override fun onReactContextInitialized(context: ReactContext) {
              android.util.Log.d("NA_ForegroundService", "ReactContext set via reactHost")
              ReactContextHolder.reactContext = context

              // Register broadcast receiver once ReactContext is ready
              val filter = android.content.IntentFilter("com.nothingalternative.app.BLOCKED_APP")
              androidx.localbroadcastmanager.content.LocalBroadcastManager
                  .getInstance(applicationContext)
                  .registerReceiver(BlockingBroadcastReceiver(), filter)
              android.util.Log.d("NA_ForegroundService", "BroadcastReceiver registered")
          }
      })
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
