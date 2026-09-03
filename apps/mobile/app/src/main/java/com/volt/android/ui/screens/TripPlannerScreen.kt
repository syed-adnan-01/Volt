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
import androidx.compose.material.icons.automirrored.filled.AltRoute
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.maps.model.LatLng
import com.volt.android.data.PolylineDecoder
import com.volt.android.data.models.RouteStrategy
import com.volt.android.data.models.StopType
import com.volt.android.ui.components.MarkerType
import com.volt.android.ui.components.RerouteBanner
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
import com.volt.android.ui.theme.VoltTextPrimary
import com.volt.android.ui.theme.VoltTextSecondary
import com.volt.android.ui.viewmodel.VoltUiState

data class RoutePreset(
    val origin: String,
    val destination: String,
    val distanceKm: Double,
    val originLat: Double,
    val originLng: Double,
    val destLat: Double,
    val destLng: Double
)

@Composable
fun TripPlannerScreen(
    uiState: VoltUiState,
    onCalculateTrip: (String, String, Double, Double, Double, Double, Double) -> Unit,
    onSelectStrategy: (String) -> Unit = {},
    onAcceptReroute: (String) -> Unit = {},
    onDismissReroute: () -> Unit = {},
    onTriggerSimulatedReroute: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var originInput by remember { mutableStateOf(uiState.tripPlan.origin) }
    var destinationInput by remember { mutableStateOf(uiState.tripPlan.destination) }
    var distanceInput by remember { mutableStateOf(uiState.tripPlan.distanceKm.toString()) }
    var currentOriginLat by remember { mutableStateOf(37.7749) }
    var currentOriginLng by remember { mutableStateOf(-122.4194) }
    var currentDestLat by remember { mutableStateOf(39.0968) }
    var currentDestLng by remember { mutableStateOf(-120.0324) }

    val presets = listOf(
        RoutePreset("San Francisco", "Lake Tahoe", 315.0, 37.7749, -122.4194, 39.0968, -120.0324),
        RoutePreset("Los Angeles", "Las Vegas", 435.0, 34.0522, -118.2437, 36.1699, -115.1398),
        RoutePreset("Oakland", "Palo Alto", 65.0, 37.8044, -122.2711, 37.4419, -122.1430),
        RoutePreset("San Jose", "Sacramento", 195.0, 37.3382, -121.8863, 38.5816, -121.4944)
    )

    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(VoltDarkBg)
            .verticalScroll(scrollState)
            .padding(16.dp)
    ) {
        // Reroute Alert Banner (if active)
        if (uiState.rerouteAlert != null) {
            RerouteBanner(
                alert = uiState.rerouteAlert,
                onAccept = { onAcceptReroute(uiState.rerouteAlert.tripId) },
                onDismiss = onDismissReroute
            )
            Spacer(modifier = Modifier.height(14.dp))
        }

        // Screen Header
        Text(
            text = "AI JOURNEY OPTIMIZER",
            color = VoltCyan,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )
        Text(
            text = "Predictive EV Routing",
            color = VoltTextPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Black
        )
        Text(
            text = "Live multi-stop route optimization with ML charger predictions.",
            color = VoltTextSecondary,
            fontSize = 13.sp
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Quick Presets
        Text(
            text = "Popular EV Corridors",
            color = VoltTextSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(6.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(presets) { preset ->
                Card(
                    modifier = Modifier.clickable {
                        originInput = preset.origin
                        destinationInput = preset.destination
                        distanceInput = preset.distanceKm.toString()
                        currentOriginLat = preset.originLat
                        currentOriginLng = preset.originLng
                        currentDestLat = preset.destLat
                        currentDestLng = preset.destLng
                        onCalculateTrip(
                            preset.origin,
                            preset.destination,
                            preset.distanceKm,
                            preset.originLat,
                            preset.originLng,
                            preset.destLat,
                            preset.destLng
                        )
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = VoltCardBg),
                    border = BorderStroke(1.dp, VoltCardBorder)
                ) {
                    Text(
                        text = "${preset.origin} ➔ ${preset.destination}",
                        color = VoltCyan,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Input Form
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = VoltCardBg),
            border = BorderStroke(1.dp, VoltCardBorder)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                OutlinedTextField(
                    value = originInput,
                    onValueChange = { originInput = it },
                    label = { Text("Starting Location", color = VoltTextSecondary) },
                    leadingIcon = {
                        Icon(Icons.Default.Place, contentDescription = "Origin", tint = VoltCyan)
                    },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = VoltTextPrimary,
                        unfocusedTextColor = VoltTextPrimary,
                        focusedBorderColor = VoltCyan,
                        unfocusedBorderColor = VoltCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = destinationInput,
                    onValueChange = { destinationInput = it },
                    label = { Text("Destination", color = VoltTextSecondary) },
                    leadingIcon = {
                        Icon(Icons.Default.LocationOn, contentDescription = "Destination", tint = VoltEmerald)
                    },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = VoltTextPrimary,
                        unfocusedTextColor = VoltTextPrimary,
                        focusedBorderColor = VoltEmerald,
                        unfocusedBorderColor = VoltCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = distanceInput,
                    onValueChange = { distanceInput = it },
                    label = { Text("Estimated Distance (km)", color = VoltTextSecondary) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = VoltTextPrimary,
                        unfocusedTextColor = VoltTextPrimary,
                        focusedBorderColor = VoltCyan,
                        unfocusedBorderColor = VoltCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = {
                        val dist = distanceInput.toDoubleOrNull() ?: 200.0
                        onCalculateTrip(
                            originInput,
                            destinationInput,
                            dist,
                            currentOriginLat,
                            currentOriginLng,
                            currentDestLat,
                            currentDestLng
                        )
                    },
                    enabled = !uiState.isLoading,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = VoltCyan)
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(
                            color = Color.Black,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Optimizing Route...",
                            color = Color.Black,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    } else {
                        Icon(
                            Icons.Default.Navigation,
                            contentDescription = "Optimize",
                            tint = Color.Black,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Run Reachability & Optimization Engine",
                            color = Color.Black,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // ──────────────────────────────────────────────
        // Interactive Route Map (Google Maps)
        // ──────────────────────────────────────────────
        val geometry = uiState.tripPlan.geometry
        if (!geometry.isNullOrBlank()) {
            val routePoints = remember(geometry) {
                PolylineDecoder.decode(geometry)
            }

            // Build markers from trip plan stops
            val mapMarkers = remember(uiState.tripPlan.stops, currentOriginLat, currentOriginLng, currentDestLat, currentDestLng) {
                val markers = mutableListOf<RouteMarker>()
                // Origin marker
                markers.add(
                    RouteMarker(
                        position = LatLng(currentOriginLat, currentOriginLng),
                        title = uiState.tripPlan.origin.ifBlank { "Origin" },
                        snippet = "Start • ${uiState.tripPlan.stops.firstOrNull()?.arrivalSoC?.toInt() ?: 80}% SoC",
                        type = MarkerType.ORIGIN
                    )
                )
                // Charging stop markers (use interpolated positions along route)
                uiState.tripPlan.stops
                    .filter { it.type == StopType.CHARGER_STOP }
                    .forEach { stop ->
                        val fraction = if (uiState.tripPlan.distanceKm > 0) {
                            (stop.distanceFromOriginKm / uiState.tripPlan.distanceKm).coerceIn(0.0, 1.0)
                        } else 0.5
                        val pointIndex = (fraction * (routePoints.size - 1)).toInt().coerceIn(0, routePoints.lastIndex)
                        markers.add(
                            RouteMarker(
                                position = routePoints.getOrElse(pointIndex) { LatLng(currentOriginLat, currentOriginLng) },
                                title = stop.name,
                                snippet = "⚡ ${stop.arrivalSoC.toInt()}% → ${stop.departureSoC.toInt()}% (+${stop.chargeDurationMinutes}m)",
                                type = MarkerType.CHARGER
                            )
                        )
                    }
                // Destination marker
                markers.add(
                    RouteMarker(
                        position = LatLng(currentDestLat, currentDestLng),
                        title = uiState.tripPlan.destination.ifBlank { "Destination" },
                        snippet = "Arrive • ${uiState.tripPlan.arrivalSoC.toInt()}% SoC",
                        type = MarkerType.DESTINATION
                    )
                )
                markers
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Map,
                    contentDescription = "Map",
                    tint = VoltCyan,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Route Visualization",
                    color = VoltTextPrimary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(8.dp))

            VoltMapView(
                routePoints = routePoints,
                markers = mapMarkers,
                mapHeight = 280.dp
            )

            Spacer(modifier = Modifier.height(20.dp))
        }

        // ──────────────────────────────────────────────
        // Multi-Strategy Ranked Comparison (Phase 4)
        // ──────────────────────────────────────────────
        if (uiState.routeStrategies.isNotEmpty()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Ranked Route Strategies",
                    color = VoltTextPrimary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )

                Button(
                    onClick = onTriggerSimulatedReroute,
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = VoltCardElevated),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Icon(Icons.AutoMirrored.Filled.AltRoute, contentDescription = "Test Reroute", tint = VoltAmber, modifier = Modifier.size(12.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Simulate Reroute", color = VoltAmber, fontSize = 11.sp)
                }
            }
            Spacer(modifier = Modifier.height(10.dp))

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                uiState.routeStrategies.forEach { strategy ->
                    val isSelected = strategy.id == uiState.selectedStrategyId
                    RouteStrategyCard(
                        strategy = strategy,
                        isSelected = isSelected,
                        onClick = { onSelectStrategy(strategy.id) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Active Selected Route Summary
        val plan = uiState.tripPlan
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = VoltCardBg),
            border = BorderStroke(1.dp, if (plan.isFeasible) VoltEmerald else VoltAmber)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Selected Route Details",
                        color = VoltTextPrimary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(if (plan.isFeasible) VoltEmerald.copy(alpha = 0.2f) else VoltAmber.copy(alpha = 0.2f))
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = if (plan.isFeasible) Icons.Default.CheckCircle else Icons.Default.Warning,
                                contentDescription = "Status",
                                tint = if (plan.isFeasible) VoltEmerald else VoltAmber,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (plan.totalChargingTimeMinutes == 0) "Direct Reachable" else "Charging Required",
                                color = if (plan.isFeasible) VoltEmerald else VoltAmber,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("Arrival Battery", color = VoltTextSecondary, fontSize = 12.sp)
                        Text("${plan.arrivalSoC.toInt()}% SoC", color = VoltCyan, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }
                    Column {
                        Text("Total Energy", color = VoltTextSecondary, fontSize = 12.sp)
                        Text("${plan.energyRequiredKWh} kWh", color = VoltTextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }
                    Column {
                        Text("Drive Time", color = VoltTextSecondary, fontSize = 12.sp)
                        Text("${plan.durationMinutes / 60}h ${plan.durationMinutes % 60}m", color = VoltTextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }
                }

                if (plan.totalChargingTimeMinutes > 0) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "⚡ Charging Duration: +${plan.totalChargingTimeMinutes} min",
                        color = VoltAmber,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Timeline stops
                Text(
                    text = "Waypoints & Charging Strategy",
                    color = VoltTextSecondary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(8.dp))

                plan.stops.forEachIndexed { index, stop ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .background(
                                    when (stop.type) {
                                        StopType.ORIGIN -> VoltCyan
                                        StopType.CHARGER_STOP -> VoltAmber
                                        StopType.DESTINATION -> VoltEmerald
                                    },
                                    CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "${index + 1}",
                                color = Color.Black,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = stop.name,
                                color = VoltTextPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium
                            )
                            if (stop.type == StopType.CHARGER_STOP) {
                                Text(
                                    text = "Arrive @ ${stop.arrivalSoC.toInt()}% ➔ Charge to ${stop.departureSoC.toInt()}% (+${stop.chargeDurationMinutes} min, +${stop.energyAddedKWh} kWh)",
                                    color = VoltAmber,
                                    fontSize = 11.sp
                                )
                            } else {
                                Text(
                                    text = "${stop.distanceFromOriginKm.toInt()} km • ${stop.arrivalSoC.toInt()}% SoC",
                                    color = VoltTextSecondary,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // AI Recommendations
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(VoltCardElevated, RoundedCornerShape(10.dp))
                        .padding(10.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Info, contentDescription = "AI Tip", tint = VoltCyan, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("AI Route Intelligence", color = VoltCyan, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    plan.recommendations.forEach { tip ->
                        Text("• $tip", color = VoltTextSecondary, fontSize = 11.sp)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(60.dp))
    }
}

@Composable
fun RouteStrategyCard(
    strategy: RouteStrategy,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = if (isSelected) VoltCardElevated else VoltCardBg),
        border = BorderStroke(
            1.5.dp,
            if (isSelected) VoltCyan else VoltCardBorder
        )
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = strategy.title,
                        color = if (isSelected) VoltCyan else VoltTextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(
                            when (strategy.id) {
                                "RECOMMENDED" -> VoltCyan.copy(alpha = 0.2f)
                                "FASTEST" -> VoltAmber.copy(alpha = 0.2f)
                                else -> VoltPurple.copy(alpha = 0.2f)
                            }
                        )
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = strategy.tag,
                        color = when (strategy.id) {
                            "RECOMMENDED" -> VoltCyan
                            "FASTEST" -> VoltAmber
                            else -> VoltPurple
                        },
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Metrics Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Total: ${strategy.totalTimeMinutes / 60}h ${strategy.totalTimeMinutes % 60}m",
                    color = VoltTextPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Drive: ${strategy.driveTimeMinutes}m • Charge: ${strategy.chargeTimeMinutes}m",
                    color = VoltTextSecondary,
                    fontSize = 12.sp
                )
                Text(
                    text = "Arrive: ${strategy.arrivalSoC.toInt()}% SoC",
                    color = if (strategy.arrivalSoC >= 15.0) VoltEmerald else VoltAmber,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Why This Route Explanation
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(VoltDarkBg)
                    .padding(8.dp)
            ) {
                Row(verticalAlignment = Alignment.Top) {
                    Text(
                        text = "Why: ",
                        color = VoltCyan,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = strategy.whyExplanation,
                        color = VoltTextSecondary,
                        fontSize = 11.sp,
                        lineHeight = 14.sp
                    )
                }
            }
        }
    }
}
