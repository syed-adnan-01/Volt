package com.volt.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.volt.android.ui.screens.VoltMainApp
import com.volt.android.ui.theme.VoltDarkBg
import com.volt.android.ui.theme.VoltTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            VoltTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = VoltDarkBg
                ) {
                    VoltMainApp()
                }
            }
        }
    }
}
