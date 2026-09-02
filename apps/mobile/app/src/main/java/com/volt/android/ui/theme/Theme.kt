package com.volt.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = VoltCyan,
    onPrimary = Color(0xFF00363D),
    primaryContainer = Color(0xFF004F58),
    onPrimaryContainer = Color(0xFF97F0FF),
    secondary = VoltEmerald,
    onSecondary = Color(0xFF003822),
    secondaryContainer = Color(0xFF005234),
    onSecondaryContainer = Color(0xFF6FF7B3),
    tertiary = VoltPurple,
    background = VoltDarkBg,
    onBackground = VoltTextPrimary,
    surface = VoltCardBg,
    onSurface = VoltTextPrimary,
    surfaceVariant = VoltCardElevated,
    onSurfaceVariant = VoltTextSecondary,
    outline = VoltCardBorder,
    error = VoltRose,
    onError = Color.White
)

@Composable
fun VoltTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
