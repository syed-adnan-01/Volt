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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BatteryChargingFull
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.HealthAndSafety
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Thermostat
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.volt.android.ui.theme.VoltAmber
import com.volt.android.ui.theme.VoltCardBg
import com.volt.android.ui.theme.VoltCardBorder
import com.volt.android.ui.theme.VoltCardElevated
import com.volt.android.ui.theme.VoltCyan
import com.volt.android.ui.theme.VoltDarkBg
import com.volt.android.ui.theme.VoltEmerald
import com.volt.android.ui.theme.VoltPurple
import com.volt.android.ui.theme.VoltTextMuted
import com.volt.android.ui.theme.VoltTextPrimary
import com.volt.android.ui.theme.VoltTextSecondary
import com.volt.android.ui.viewmodel.VoltUiState

@Composable
fun HealthScreen(
    uiState: VoltUiState,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()
    val health = uiState.telemetry.batteryHealthPercent
    val originalCapacity = uiState.selectedVehicle.batteryCapacityKWh
    val remainingCapacity = (originalCapacity * (health / 100.0) * 10.0).toInt() / 10.0

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(VoltDarkBg)
            .verticalScroll(scrollState)
            .padding(16.dp)
    ) {
        // Header
        Text(
            text = "BATTERY HEALTH & DIAGNOSTICS",
            color = VoltCyan,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )
        Text(
            text = "State of Health (SoH)",
            color = VoltTextPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Black
        )
        Text(
            text = "Predictive degradation analysis & cell balancing telemetry.",
            color = VoltTextSecondary,
            fontSize = 13.sp
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Main Health Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = VoltCardBg),
            border = BorderStroke(1.dp, VoltEmerald)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Overall Pack Health", color = VoltTextSecondary, fontSize = 13.sp)
                        Text("$health%", color = VoltEmerald, fontSize = 36.sp, fontWeight = FontWeight.Black)
                    }
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(VoltEmerald.copy(alpha = 0.15f))
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = "Optimal", tint = VoltEmerald, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("OPTIMAL", color = VoltEmerald, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                LinearProgressIndicator(
                    progress = { (health / 100f).toFloat() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = VoltEmerald,
                    trackColor = VoltCardElevated,
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Current usable capacity: $remainingCapacity kWh of $originalCapacity kWh original factory spec.",
                    color = VoltTextSecondary,
                    fontSize = 12.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Diagnostic Breakdown
        Text("Detailed Diagnostics", color = VoltTextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(10.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = VoltCardBg),
            border = BorderStroke(1.dp, VoltCardBorder)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                HealthMetricRow("Cell Balance Variance", "0.008 V", "Excellent (<0.02V)", VoltCyan)
                HealthMetricRow("Thermal Stress Score", "Low (1.2%)", "Optimal cooling", VoltEmerald)
                HealthMetricRow("Fast Charge Degradation", "-0.8%", "18 lifetime DC sessions", VoltAmber)
                HealthMetricRow("Estimated Cycle Count", "142 cycles", "Lifespan: ~1,500 cycles", VoltPurple)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // AI Preservation Recommendations
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = VoltCardBg),
            border = BorderStroke(1.dp, VoltCardBorder)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Lightbulb, contentDescription = "Tips", tint = VoltAmber, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("AI Battery Longevity Tips", color = VoltTextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(10.dp))

                TipItem("Daily 80% Charge Limit", "Charging to 80% instead of 100% for daily commuting reduces anode stress by 3x.")
                TipItem("Precondition before Supercharging", "Warming up cells to 30°C before 250kW charging prevents lithium plating.")
                TipItem("Avoid Deep Discharges below 10%", "Recharge before hitting extreme low buffer levels to protect cathode chemistry.")
            }
        }

        Spacer(modifier = Modifier.height(60.dp))
    }
}

@Composable
fun HealthMetricRow(title: String, value: String, status: String, statusColor: Color) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(title, color = VoltTextSecondary, fontSize = 12.sp)
            Text(value, color = VoltTextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }
        Text(status, color = statusColor, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun TipItem(title: String, description: String) {
    Column(modifier = Modifier.padding(vertical = 4.dp)) {
        Text("• $title", color = VoltCyan, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text(description, color = VoltTextSecondary, fontSize = 11.sp, modifier = Modifier.padding(start = 10.dp))
    }
}
