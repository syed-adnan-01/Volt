package com.volt.android.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = VoltCyan,
    onPrimary = Color.White,
    primaryContainer = VoltBlueLight,
    onPrimaryContainer = Color(0xFF1E40AF),
    secondary = VoltEmerald,
    onSecondary = Color.White,
    secondaryContainer = VoltEmeraldLight,
    onSecondaryContainer = Color(0xFF065F46),
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
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        content = content
    )
}

