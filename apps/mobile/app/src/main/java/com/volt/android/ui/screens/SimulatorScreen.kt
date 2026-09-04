package com.volt.android.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Science
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Thermostat
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.volt.android.ui.components.BatteryGauge
import com.volt.android.ui.theme.VoltAmber
import com.volt.android.ui.theme.VoltCardBg
import com.volt.android.ui.theme.VoltCardBorder
import com.volt.android.ui.theme.VoltCardElevated
import com.volt.android.ui.theme.VoltCyan
import com.volt.android.ui.theme.VoltDarkBg
import com.volt.android.ui.theme.VoltEmerald
import com.volt.android.ui.theme.VoltPurple
import com.volt.android.ui.theme.VoltRose
import com.volt.android.ui.theme.VoltTextMuted
import com.volt.android.ui.theme.VoltTextPrimary
import com.volt.android.ui.theme.VoltTextSecondary
import com.volt.android.ui.viewmodel.VoltUiState

@Composable
fun SimulatorScreen(
    uiState: VoltUiState,
    onSimulateDrive: (Double, Double, Double) -> Unit,
    onSimulateCharge: (Int, Double) -> Unit,
    onResetBaseline: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var speedKmH by remember { mutableFloatStateOf(85f) }
    var tempCelsius by remember { mutableFloatStateOf(22f) }

    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(VoltDarkBg)
            .verticalScroll(scrollState)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Screen Header with Sandbox Badging
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Science,
                        contentDescription = "Sandbox Lab",
                        tint = VoltPurple,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "OFFLINE WHAT-IF SANDBOX",
                        color = VoltPurple,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(VoltPurple.copy(alpha = 0.2f))
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "CLIENT PHYSICS",
                        color = VoltPurple,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Text(
                text = "Vehicle Telemetry Lab",
                color = VoltTextPrimary,
                fontSize = 24.sp,
                fontWeight = FontWeight.Black
            )
            Text(
                text = "Instant 60 FPS slider experimentation for aerodynamic drag, thermal stress, and high-rate DC charging curves.",
                color = VoltTextSecondary,
                fontSize = 13.sp
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Distinction Notice
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(VoltCardElevated)
                .padding(10.dp)
        ) {
            Row(verticalAlignment = Alignment.Top) {
                Icon(Icons.Default.Info, contentDescription = "Notice", tint = VoltCyan, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Sandbox runs client-side kinematic physics for offline exploration. For server-optimized OSRM routing with live charger availability, visit the Journey tab.",
                    color = VoltTextSecondary,
                    fontSize = 11.sp,
                    lineHeight = 14.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Mini Battery Gauge Status
        BatteryGauge(
            socPercent = uiState.telemetry.socPercent,
            estimatedRangeKm = uiState.telemetry.estimatedRangeKm,
            currentEnergyKwh = uiState.telemetry.currentEnergyKWh,
            isCharging = uiState.telemetry.isCharging
        )

        // Low Battery Warning Banner
        if (uiState.telemetry.socPercent < 15.0) {
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = VoltRose.copy(alpha = 0.2f)),
                border = BorderStroke(1.dp, VoltRose)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Warning, contentDescription = "Alert", tint = VoltRose, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "CRITICAL BUFFER: Battery below 15% reserve buffer. Immediate top-up recommended.",
                        color = VoltRose,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Environment & Physics Sliders Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = VoltCardBg),
            border = BorderStroke(1.dp, VoltCardBorder)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Environmental & Physics Sliders",
                        color = VoltTextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )

                    OutlinedButton(
                        onClick = onResetBaseline,
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, VoltCardBorder),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = "Reset", tint = VoltCyan, modifier = Modifier.size(12.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Reset Baseline", color = VoltCyan, fontSize = 11.sp)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Speed Slider
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Speed, contentDescription = "Speed", tint = VoltCyan, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Cruising Speed", color = VoltTextSecondary, fontSize = 13.sp)
                    }
                    Text("${speedKmH.toInt()} km/h", color = VoltCyan, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
                Slider(
                    value = speedKmH,
                    onValueChange = { speedKmH = it },
                    valueRange = 30f..160f,
                    colors = SliderDefaults.colors(
                        thumbColor = VoltCyan,
                        activeTrackColor = VoltCyan,
                        inactiveTrackColor = VoltCardElevated
                    )
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Temperature Slider
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Thermostat, contentDescription = "Temp", tint = VoltAmber, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Ambient Temperature", color = VoltTextSecondary, fontSize = 13.sp)
                    }
                    Text("${tempCelsius.toInt()} °C", color = VoltAmber, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
                Slider(
                    value = tempCelsius,
                    onValueChange = { tempCelsius = it },
                    valueRange = -10f..45f,
                    colors = SliderDefaults.colors(
                        thumbColor = VoltAmber,
                        activeTrackColor = VoltAmber,
                        inactiveTrackColor = VoltCardElevated
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Drive Simulation Triggers
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = VoltCardBg),
            border = BorderStroke(1.dp, VoltCardBorder)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Execute Driving Simulation",
                    color = VoltTextPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { onSimulateDrive(10.0, speedKmH.toDouble(), tempCelsius.toDouble()) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VoltCardElevated)
                    ) {
                        Text("Drive 10 km", color = VoltCyan, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = { onSimulateDrive(30.0, speedKmH.toDouble(), tempCelsius.toDouble()) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VoltCardElevated)
                    ) {
                        Text("Drive 30 km", color = VoltCyan, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = { onSimulateDrive(75.0, speedKmH.toDouble(), tempCelsius.toDouble()) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VoltCyan)
                    ) {
                        Text("Drive 75 km", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Charging Simulation Triggers
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = VoltCardBg),
            border = BorderStroke(1.dp, VoltCardBorder)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Execute Supercharging Session",
                    color = VoltTextPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { onSimulateCharge(15, 250.0) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VoltEmerald)
                    ) {
                        Icon(Icons.Default.Bolt, contentDescription = "Charge", tint = Color.White, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Charge +15m", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = { onSimulateCharge(30, 250.0) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VoltCardElevated)
                    ) {
                        Icon(Icons.Default.Bolt, contentDescription = "Charge", tint = VoltEmerald, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Charge +30m", color = VoltEmerald, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(60.dp))
    }
}
