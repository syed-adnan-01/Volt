package com.volt.android.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.volt.android.ui.theme.VoltAmber
import com.volt.android.ui.theme.VoltBlueLight
import com.volt.android.ui.theme.VoltCyan
import com.volt.android.ui.theme.VoltEmerald
import com.volt.android.ui.theme.VoltGradientEnd
import com.volt.android.ui.theme.VoltGradientStart
import com.volt.android.ui.theme.VoltRose
import com.volt.android.ui.theme.VoltTextMuted
import com.volt.android.ui.theme.VoltTextPrimary
import com.volt.android.ui.theme.VoltTextSecondary
import com.volt.android.ui.theme.VoltTrackBg

@Composable
fun BatteryGauge(
    socPercent: Double,
    estimatedRangeKm: Double,
    currentEnergyKwh: Double,
    isCharging: Boolean,
    modifier: Modifier = Modifier
) {
    val animatedProgress by animateFloatAsState(
        targetValue = (socPercent / 100.0).toFloat().coerceIn(0f, 1f),
        animationSpec = tween(durationMillis = 800),
        label = "socProgress"
    )

    val gaugeColor = when {
        socPercent >= 50.0 -> VoltCyan
        socPercent >= 25.0 -> VoltCyan
        socPercent >= 15.0 -> VoltAmber
        else -> VoltRose
    }

    Box(
        modifier = modifier.size(240.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(220.dp)) {
            val strokeWidth = 16.dp.toPx()
            val arcSize = size.width - strokeWidth
            val topLeft = Offset(strokeWidth / 2, strokeWidth / 2)

            // Background Track Arc (240 degrees)
            drawArc(
                color = VoltTrackBg,
                startAngle = 150f,
                sweepAngle = 240f,
                useCenter = false,
                topLeft = topLeft,
                size = Size(arcSize, arcSize),
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )

            // Active Battery Progress Arc
            val sweepAngle = 240f * animatedProgress
            if (sweepAngle > 0) {
                drawArc(
                    brush = Brush.sweepGradient(
                        0.0f to VoltGradientStart,
                        0.7f to VoltGradientEnd,
                        1.0f to VoltGradientStart
                    ),
                    startAngle = 150f,
                    sweepAngle = sweepAngle,
                    useCenter = false,
                    topLeft = topLeft,
                    size = Size(arcSize, arcSize),
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                )
            }
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (isCharging) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .background(VoltBlueLight, CircleShape)
                        .padding(horizontal = 10.dp, vertical = 3.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Bolt,
                        contentDescription = "Charging",
                        tint = VoltCyan,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "CHARGING",
                        color = VoltCyan,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
            } else {
                Icon(
                    imageVector = Icons.Default.Bolt,
                    contentDescription = "EV Battery",
                    tint = VoltCyan,
                    modifier = Modifier.size(20.dp)
                )
            }

            Text(
                text = "${socPercent.toInt()}%",
                color = VoltTextPrimary,
                fontSize = 42.sp,
                fontWeight = FontWeight.Black,
                fontFamily = FontFamily.SansSerif
            )

            Text(
                text = "${estimatedRangeKm.toInt()} km range",
                color = VoltCyan,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold
            )

            Text(
                text = "$currentEnergyKwh kWh left",
                color = VoltTextSecondary,
                fontSize = 12.sp
            )
        }
    }
}

