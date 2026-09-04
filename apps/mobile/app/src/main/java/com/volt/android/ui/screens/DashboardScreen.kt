package com.volt.android.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.BatteryChargingFull
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.ElectricMeter
import androidx.compose.material.icons.filled.EvStation
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Thermostat
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
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
import com.volt.android.ui.theme.VoltBlueLight
import com.volt.android.ui.theme.VoltCardBg
import com.volt.android.ui.theme.VoltCardBorder
import com.volt.android.ui.theme.VoltCardElevated
import com.volt.android.ui.theme.VoltCyan
import com.volt.android.ui.theme.VoltDarkBg
import com.volt.android.ui.theme.VoltEmerald
import com.volt.android.ui.theme.VoltGradientEnd
import com.volt.android.ui.theme.VoltGradientStart
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
    val userName = uiState.currentUser?.name ?: "Alex"
    val initials = userName.split(" ").mapNotNull { it.firstOrNull()?.uppercase() }.take(2).joinToString("")

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(VoltDarkBg)
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // ──────────────────────────────────────────────
        // 1. Top Bar: Avatar + Greeting + Notification Bell
        // ──────────────────────────────────────────────
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onOpenProfile() }
            ) {
                // Profile Avatar with subtle border
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(VoltBlueLight)
                        .border(1.5.dp, VoltCyan.copy(alpha = 0.5f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = initials.ifBlank { "A" },
                        color = VoltCyan,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = "Hello, $userName!",
                        color = VoltTextPrimary,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Ready to charge your EV?",
                        color = VoltTextSecondary,
                        fontSize = 12.sp
                    )
                }
            }

            // Notification Bell Chip
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(VoltCardBg)
                    .border(1.dp, VoltCardBorder, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Notifications,
                    contentDescription = "Notifications",
                    tint = VoltTextSecondary,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // ──────────────────────────────────────────────
        // 2. Search Pill
        // ──────────────────────────────────────────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .background(VoltCardElevated)
                .border(1.dp, VoltCardBorder, RoundedCornerShape(24.dp))
                .clickable { onNavigateToTripPlanner() }
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                tint = VoltTextMuted,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = "Search destination or charging station...",
                color = VoltTextMuted,
                fontSize = 13.sp
            )
        }

        Spacer(modifier = Modifier.height(18.dp))

        // ──────────────────────────────────────────────
        // 3. Vehicle Selector Carousel
        // ──────────────────────────────────────────────
        LazyRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(uiState.allVehicles) { vehicle ->
                val isSelected = vehicle.id == uiState.selectedVehicle.id
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(if (isSelected) VoltCyan else VoltCardBg)
                        .border(
                            1.dp,
                            if (isSelected) VoltCyan else VoltCardBorder,
                            RoundedCornerShape(20.dp)
                        )
                        .clickable { onSelectVehicle(vehicle) }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.DirectionsCar,
                            contentDescription = vehicle.model,
                            tint = if (isSelected) Color.White else VoltTextSecondary,
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "${vehicle.make} ${vehicle.model}",
                            color = if (isSelected) Color.White else VoltTextPrimary,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // ──────────────────────────────────────────────
        // 4. Hero Vehicle Card (Tesla Model 3, 62% • 312 km)
        // ──────────────────────────────────────────────
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(
                    elevation = 2.dp,
                    shape = RoundedCornerShape(24.dp),
                    spotColor = Color(0x0F000000)
                ),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = VoltCardBg),
            border = BorderStroke(1.dp, VoltCardBorder)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Central Radial Battery Gauge
                BatteryGauge(
                    socPercent = uiState.telemetry.socPercent,
                    estimatedRangeKm = uiState.telemetry.estimatedRangeKm,
                    currentEnergyKwh = uiState.telemetry.currentEnergyKWh,
                    isCharging = uiState.telemetry.isCharging
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Vehicle Name & Specs
                Text(
                    text = "${uiState.selectedVehicle.make} ${uiState.selectedVehicle.model}",
                    color = VoltTextSecondary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium
                )

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "${uiState.telemetry.socPercent.toInt()}%",
                        color = VoltTextPrimary,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "• ${uiState.telemetry.estimatedRangeKm.toInt()} km",
                        color = VoltTextSecondary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(22.dp))

        // ──────────────────────────────────────────────
        // 5. "This month" Section (Energy Charged, You Saved, Charging Sessions)
        // ──────────────────────────────────────────────
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = "This month",
                color = VoltTextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(14.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = VoltCardBg),
                border = BorderStroke(1.dp, VoltCardBorder)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Item 1: Energy Charged
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(VoltCardElevated),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.EvStation,
                                contentDescription = "Energy Charged",
                                tint = VoltCyan,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Column {
                            Text(
                                text = "Energy Charged",
                                color = VoltTextSecondary,
                                fontSize = 12.sp
                            )
                            Text(
                                text = "${(uiState.selectedVehicle.batteryCapacityKWh * 1.8).toInt()} kWh",
                                color = VoltTextPrimary,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    // Item 2: Your Saved
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(VoltCardElevated),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.AttachMoney,
                                contentDescription = "Your Saved",
                                tint = VoltEmerald,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Column {
                            Text(
                                text = "Your Saved",
                                color = VoltTextSecondary,
                                fontSize = 12.sp
                            )
                            Text(
                                text = "$24.60",
                                color = VoltTextPrimary,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    // Item 3: Charging Sessions
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(VoltCardElevated),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Bolt,
                                contentDescription = "Charging Sessions",
                                tint = VoltAmber,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Column {
                            Text(
                                text = "Charging Sessions",
                                color = VoltTextSecondary,
                                fontSize = 12.sp
                            )
                            Text(
                                text = "18 Completed",
                                color = VoltTextPrimary,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(22.dp))

        // ──────────────────────────────────────────────
        // 6. Recent Sessions Section
        // ──────────────────────────────────────────────
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Recent Sessions",
                    color = VoltTextPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "View all",
                    color = VoltCyan,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.clickable { onNavigateToTripPlanner() }
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            val primaryStation = uiState.stations.firstOrNull()
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = VoltCardBg),
                border = BorderStroke(1.dp, VoltCardBorder)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(VoltBlueLight),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Place,
                                contentDescription = "Station",
                                tint = VoltCyan,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = primaryStation?.name ?: "GreenVolt Station",
                                color = VoltTextPrimary,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "May 20, 2026 • 09:30 AM",
                                color = VoltTextSecondary,
                                fontSize = 11.sp
                            )
                        }
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "$12.45",
                            color = VoltTextPrimary,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "24.6 kWh",
                            color = VoltTextSecondary,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // ──────────────────────────────────────────────
        // 7. Telemetry Grid (2x2)
        // ──────────────────────────────────────────────
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

        // ──────────────────────────────────────────────
        // 8. AI Battery Optimizations
        // ──────────────────────────────────────────────
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = VoltCardBg),
            border = BorderStroke(1.dp, VoltCardBorder)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
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
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = if (uiState.telemetry.isPreconditioning) VoltBlueLight else Color.Transparent
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
                            fontWeight = FontWeight.SemiBold,
                            color = if (uiState.telemetry.isPreconditioning) VoltCyan else VoltTextSecondary
                        )
                    }

                    OutlinedButton(
                        onClick = onToggleRangeMode,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = if (uiState.telemetry.isRangeMode) Color(0xFFECFDF5) else Color.Transparent
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
                            fontWeight = FontWeight.SemiBold,
                            color = if (uiState.telemetry.isRangeMode) VoltEmerald else VoltTextSecondary
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ──────────────────────────────────────────────
        // 9. Mini Route Map Preview (if available)
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

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .border(1.dp, VoltCardBorder, RoundedCornerShape(16.dp))
                    .clickable { onNavigateToTripPlanner() }
            ) {
                VoltMapView(
                    routePoints = previewRoutePoints,
                    markers = previewMarkers,
                    mapHeight = 160.dp,
                    isInteractive = false
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // ──────────────────────────────────────────────
        // 10. Gradient CTA Button
        // ──────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(RoundedCornerShape(26.dp))
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(VoltGradientStart, VoltGradientEnd)
                    )
                )
                .clickable { onNavigateToTripPlanner() },
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Plan AI-Optimized Journey ➔",
                color = Color.White,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(30.dp))
    }
}
