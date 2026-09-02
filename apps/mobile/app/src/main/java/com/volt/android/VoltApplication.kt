package com.volt.android

import android.app.Application
import com.volt.android.data.remote.AuthSessionManager

class VoltApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AuthSessionManager.init(this)
    }
}
