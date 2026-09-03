package com.volt.android.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AcUnit
import androidx.compose.material.icons.filled.BatteryChargingFull
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.ElectricMeter
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Thermostat
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.maps.model.LatLng
import com.volt.android.data.PolylineDecoder
import com.volt.android.data.models.VehicleProfile
import com.volt.android.ui.components.BatteryGauge
import com.volt.android.ui.components.MarkerType
import com.volt.android.ui.components.MetricCard
import com.volt.android.ui.components.RouteMarker
import com.volt.android.ui.components.VoltMapView
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
fun DashboardScreen(
    uiState: VoltUiState,
    onSelectVehicle: (VehicleProfile) -> Unit,
    onTogglePreconditioning: () -> Unit,
    onToggleRangeMode: () -> Unit,
    onNavigateToTripPlanner: () -> Unit,
    onOpenProfile: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()
    val userName = uiState.currentUser?.name ?: "Pilot"
    val initials = userName.split(" ").mapNotNull { it.firstOrNull()?.uppercase() }.take(2).joinToString("")

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(VoltDarkBg)
            .verticalScroll(scrollState)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // App Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { onOpenProfile() }
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .background(VoltEmerald, CircleShape)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "VOLT EV PLATFORM",
                        color = VoltCyan,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }
                Text(
                    text = "${uiState.selectedVehicle.make} ${uiState.selectedVehicle.model}",
                    color = VoltTextPrimary,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onOpenProfile() }
                        .padding(vertical = 2.dp)
                ) {
                    Text(
                        text = uiState.selectedVehicle.trim,
                        color = VoltTextSecondary,
                        fontSize = 12.sp
                    )
                    Text(
                        text = " • $userName ⚙️",
                        color = VoltCyan,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Health Chip
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(VoltCardElevated)
                        .border(1.dp, VoltCardBorder, RoundedCornerShape(20.dp))
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.BatteryChargingFull,
                            contentDescription = "Health",
                            tint = VoltEmerald,
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${uiState.telemetry.batteryHealthPercent}%",
                            color = VoltEmerald,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Profile Avatar Button
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(VoltCardElevated)
                        .border(1.5.dp, VoltCyan, CircleShape)
                        .clickable { onOpenProfile() },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = initials.ifBlank { "V" },
                        color = VoltCyan,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Vehicle Selector Carousel
        LazyRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(uiState.allVehicles) { vehicle ->
                val isSelected = vehicle.id == uiState.selectedVehicle.id
                Card(
                    modifier = Modifier
                        .clickable { onSelectVehicle(vehicle) },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isSelected) VoltCardElevated else VoltCardBg
                    ),
                    border = BorderStroke(
                        1.dp,
                        if (isSelected) VoltCyan else VoltCardBorder
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.DirectionsCar,
                            contentDescription = vehicle.model,
                            tint = if (isSelected) VoltCyan else VoltTextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "${vehicle.make} ${vehicle.model}",
                            color = if (isSelected) VoltTextPrimary else VoltTextSecondary,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Central Radial Battery Gauge
        BatteryGauge(
            socPercent = uiState.telemetry.socPercent,
            estimatedRangeKm = uiState.telemetry.estimatedRangeKm,
            currentEnergyKwh = uiState.telemetry.currentEnergyKWh,
            isCharging = uiState.telemetry.isCharging
        )

        Spacer(modifier = Modifier.height(20.dp))

        // Telemetry Grid (2x2)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            MetricCard(
                title = "Battery Temp",
                value = "${uiState.telemetry.temperatureCelsius}",
                unit = "°C",
                icon = Icons.Default.Thermostat,
                iconColor = VoltCyan,
                modifier = Modifier.weight(1f)
            )
            MetricCard(
                title = "Drain Rate",
                value = "${uiState.telemetry.drainRateWhKm.toInt()}",
                unit = "Wh/km",
                icon = Icons.Default.Timeline,
                iconColor = VoltEmerald,
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            MetricCard(
                title = "Pack Voltage",
                value = "${uiState.telemetry.voltage}",
                unit = "V",
                icon = Icons.Default.ElectricMeter,
                iconColor = VoltPurple,
                modifier = Modifier.weight(1f)
            )
            MetricCard(
                title = "Power Flow",
                value = "${uiState.telemetry.currentPowerKw}",
                unit = "kW",
                icon = Icons.Default.FlashOn,
                iconColor = VoltAmber,
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Quick Energy Action Controls
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = VoltCardBg),
            border = BorderStroke(1.dp, VoltCardBorder)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = "AI Battery Optimizations",
                    color = VoltTextPrimary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onTogglePreconditioning,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = if (uiState.telemetry.isPreconditioning) VoltCyan.copy(alpha = 0.2f) else Color.Transparent
                        ),
                        border = BorderStroke(1.dp, if (uiState.telemetry.isPreconditioning) VoltCyan else VoltCardBorder)
                    ) {
                        Icon(
                            imageVector = Icons.Default.AcUnit,
                            contentDescription = "Precondition",
                            tint = if (uiState.telemetry.isPreconditioning) VoltCyan else VoltTextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (uiState.telemetry.isPreconditioning) "Preconditioning" else "Precondition",
                            fontSize = 11.sp,
                            color = if (uiState.telemetry.isPreconditioning) VoltCyan else VoltTextSecondary
                        )
                    }

                    OutlinedButton(
                        onClick = onToggleRangeMode,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = if (uiState.telemetry.isRangeMode) VoltEmerald.copy(alpha = 0.2f) else Color.Transparent
                        ),
                        border = BorderStroke(1.dp, if (uiState.telemetry.isRangeMode) VoltEmerald else VoltCardBorder)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Speed,
                            contentDescription = "Range Mode",
                            tint = if (uiState.telemetry.isRangeMode) VoltEmerald else VoltTextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (uiState.telemetry.isRangeMode) "Max Range ON" else "Range Mode",
                            fontSize = 11.sp,
                            color = if (uiState.telemetry.isRangeMode) VoltEmerald else VoltTextSecondary
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ──────────────────────────────────────────────
        // Mini Route Map Preview (shows last planned route)
        // ──────────────────────────────────────────────
        val lastRouteGeometry = uiState.tripPlan.geometry
        if (!lastRouteGeometry.isNullOrBlank()) {
            val previewRoutePoints = remember(lastRouteGeometry) {
                PolylineDecoder.decode(lastRouteGeometry)
            }
            val previewMarkers = remember(uiState.tripPlan) {
                listOf(
                    RouteMarker(
                        position = previewRoutePoints.firstOrNull() ?: LatLng(0.0, 0.0),
                        title = uiState.tripPlan.origin,
                        type = MarkerType.ORIGIN
                    ),
                    RouteMarker(
                        position = previewRoutePoints.lastOrNull() ?: LatLng(0.0, 0.0),
                        title = uiState.tripPlan.destination,
                        type = MarkerType.DESTINATION
                    )
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNavigateToTripPlanner() },
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Map,
                    contentDescription = "Map",
                    tint = VoltCyan,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Last Planned Route",
                    color = VoltTextPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = "${uiState.tripPlan.origin} → ${uiState.tripPlan.destination}",
                    color = VoltTextSecondary,
                    fontSize = 11.sp
                )
            }
            Spacer(modifier = Modifier.height(6.dp))

            Box(modifier = Modifier.clickable { onNavigateToTripPlanner() }) {
                VoltMapView(
                    routePoints = previewRoutePoints,
                    markers = previewMarkers,
                    mapHeight = 160.dp,
                    isInteractive = false
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Navigation CTA
        Button(
            onClick = onNavigateToTripPlanner,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = VoltCyan)
        ) {
            Text(
                text = "Plan AI-Optimized Journey ➔",
                color = Color.Black,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(vertical = 4.dp)
            )
        }

        Spacer(modifier = Modifier.height(60.dp))
    }
}

private fun Modifier.border(width: androidx.compose.ui.unit.Dp, color: Color, shape: androidx.compose.ui.graphics.Shape): Modifier =
    this.then(Modifier.background(color = Color.Transparent, shape = shape))
