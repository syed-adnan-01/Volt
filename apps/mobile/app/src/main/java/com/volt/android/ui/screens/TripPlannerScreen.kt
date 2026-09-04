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
import androidx.compose.material.icons.filled.BatteryChargingFull
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
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
import com.volt.android.data.LocationSearchService
import com.volt.android.data.PolylineDecoder
import com.volt.android.data.models.RouteStrategy
import com.volt.android.data.models.StopType
import com.volt.android.ui.components.LocationInputField
import com.volt.android.ui.components.MarkerType
import com.volt.android.ui.components.RerouteBanner
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
    onCalculateTrip: (String, String, Double, Double, Double, Double, Double, Double) -> Unit,
    onSelectStrategy: (String) -> Unit = {},
    onAcceptReroute: (String) -> Unit = {},
    onDismissReroute: () -> Unit = {},
    onTriggerSimulatedReroute: () -> Unit = {},
    onStartNavigation: () -> Unit = {},
    onStopNavigation: () -> Unit = {},
    onLaunchGoogleMaps: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var originInput by remember { mutableStateOf(uiState.tripPlan.origin) }
    var destinationInput by remember { mutableStateOf(uiState.tripPlan.destination) }
    var distanceInput by remember { mutableStateOf(uiState.tripPlan.distanceKm.toString()) }
    var currentOriginLat by remember { mutableStateOf(37.7749) }
    var currentOriginLng by remember { mutableStateOf(-122.4194) }
    var currentDestLat by remember { mutableStateOf(39.0968) }
    var currentDestLng by remember { mutableStateOf(-120.0324) }

    // Battery percentage state — default from selected vehicle's SoC
    var batteryPercent by remember { mutableFloatStateOf(uiState.selectedVehicle.currentSoC.toFloat()) }

    // Track whether origin/destination have valid coordinates for preview markers
    var hasOriginCoords by remember { mutableStateOf(false) }
    var hasDestCoords by remember { mutableStateOf(false) }

    val presets = listOf(
        RoutePreset("Bengaluru", "Mangaluru", 350.0, 12.9716, 77.5946, 12.9141, 74.8560),
        RoutePreset("Delhi", "Jaipur", 280.0, 28.6139, 77.2090, 26.9124, 75.7873),
        RoutePreset("Bengaluru", "Chennai", 340.0, 12.9716, 77.5946, 13.0827, 80.2707),
        RoutePreset("Delhi", "Agra", 230.0, 28.6139, 77.2090, 27.1767, 78.0081),
        RoutePreset("Mumbai", "Pune", 152.0, 19.0760, 72.8777, 18.5204, 73.8567),
        RoutePreset("Bengaluru", "Mysuru", 143.5, 12.9716, 77.5946, 12.2958, 76.6394),
        RoutePreset("Hyderabad", "Vijayawada", 275.0, 17.3850, 78.4867, 16.5062, 80.6480),
        RoutePreset("San Francisco", "Lake Tahoe", 315.0, 37.7749, -122.4194, 39.0968, -120.0324),
        RoutePreset("Los Angeles", "Las Vegas", 435.0, 34.0522, -118.2437, 36.1699, -115.1398)
    )

    val scrollState = rememberScrollState()

    // ──────────────────────────────────────────────
    // Prepare map data & continuous route line
    // ──────────────────────────────────────────────
    val geometry = uiState.tripPlan.geometry
    val originStop = uiState.tripPlan.stops.firstOrNull { it.type == StopType.ORIGIN }
    val destStop = uiState.tripPlan.stops.lastOrNull { it.type == StopType.DESTINATION }

    val effectiveOriginLat = originStop?.latitude ?: currentOriginLat
    val effectiveOriginLng = originStop?.longitude ?: currentOriginLng
    val effectiveDestLat = destStop?.latitude ?: currentDestLat
    val effectiveDestLng = destStop?.longitude ?: currentDestLng

    val originCoord = LatLng(effectiveOriginLat, effectiveOriginLng)
    val destCoord = LatLng(effectiveDestLat, effectiveDestLng)

    // Extract all planned charging stops with valid coordinates
    val chargerStopCoords = remember(uiState.tripPlan.stops) {
        uiState.tripPlan.stops
            .filter { it.type == StopType.CHARGER_STOP && it.latitude != null && it.longitude != null }
            .map { LatLng(it.latitude!!, it.longitude!!) }
    }

    // Decode backend geometry and ensure the path connects through ALL charging stops
    val routePoints = remember(geometry, uiState.tripPlan.stops, effectiveOriginLat, effectiveOriginLng, effectiveDestLat, effectiveDestLng) {
        val decoded = PolylineDecoder.decode(geometry)
        PolylineDecoder.ensurePathVisitsAllStops(
            baseRoute = decoded,
            origin = originCoord,
            chargingStops = chargerStopCoords,
            destination = destCoord
        )
    }

    val hasRoute = routePoints.size >= 2 || uiState.tripPlan.stops.isNotEmpty() || (uiState.tripPlan.distanceKm > 0 && uiState.tripPlan.origin.isNotBlank())

    // Route markers (after route is calculated)
    val mapMarkers = if (hasRoute) {
        remember(uiState.tripPlan.stops, uiState.stations, effectiveOriginLat, effectiveOriginLng, effectiveDestLat, effectiveDestLng, routePoints) {
            val markers = mutableListOf<RouteMarker>()
            // Origin marker
            markers.add(
                RouteMarker(
                    position = LatLng(effectiveOriginLat, effectiveOriginLng),
                    title = uiState.tripPlan.origin.ifBlank { "Origin" },
                    snippet = "Start • ${batteryPercent.toInt()}% SoC",
                    type = MarkerType.ORIGIN
                )
            )
            // Live EV charging stations network
            uiState.stations.forEach { station ->
                if (station.latitude != null && station.longitude != null) {
                    markers.add(
                        RouteMarker(
                            position = LatLng(station.latitude, station.longitude),
                            title = "⚡ ${station.name}",
                            snippet = "${station.powerKw}kW DC • ${station.availablePlugs}/${station.totalPlugs} Available",
                            type = MarkerType.CHARGER
                        )
                    )
                }
            }
            // Charging stop markers along route
            uiState.tripPlan.stops
                .filter { it.type == StopType.CHARGER_STOP }
                .forEach { stop ->
                    // Use the stop's own lat/lng if available, otherwise interpolate along route
                    val position = if (stop.latitude != null && stop.longitude != null) {
                        LatLng(stop.latitude, stop.longitude)
                    } else {
                        val fraction = if (uiState.tripPlan.distanceKm > 0) {
                            (stop.distanceFromOriginKm / uiState.tripPlan.distanceKm).coerceIn(0.0, 1.0)
                        } else 0.5
                        val pointIndex = (fraction * (routePoints.size - 1)).toInt().coerceIn(0, routePoints.lastIndex)
                        routePoints.getOrElse(pointIndex) { LatLng(effectiveOriginLat, effectiveOriginLng) }
                    }
                    markers.add(
                        RouteMarker(
                            position = position,
                            title = "🛑 CHARGING STOP: ${stop.name}",
                            snippet = "⚡ Charge ${stop.arrivalSoC.toInt()}% ➔ ${stop.departureSoC.toInt()}% (+${stop.chargeDurationMinutes}m)",
                            type = MarkerType.WAYPOINT
                        )
                    )
                }
            // Destination marker
            markers.add(
                RouteMarker(
                    position = LatLng(effectiveDestLat, effectiveDestLng),
                    title = uiState.tripPlan.destination.ifBlank { "Destination" },
                    snippet = "Arrive • ${uiState.tripPlan.arrivalSoC.toInt()}% SoC",
                    type = MarkerType.DESTINATION
                )
            )
            markers
        }
    } else {
        emptyList()
    }

    // Preview markers (before route is calculated — show origin/destination pins + live EV stations)
    val previewMarkers = remember(hasOriginCoords, hasDestCoords, currentOriginLat, currentOriginLng, currentDestLat, currentDestLng, originInput, destinationInput, uiState.stations) {
        val markers = mutableListOf<RouteMarker>()
        // Live EV stations network
        uiState.stations.forEach { station ->
            if (station.latitude != null && station.longitude != null) {
                markers.add(
                    RouteMarker(
                        position = LatLng(station.latitude, station.longitude),
                        title = "⚡ ${station.name}",
                        snippet = "${station.powerKw}kW DC • ${station.availablePlugs}/${station.totalPlugs} Available",
                        type = MarkerType.CHARGER
                    )
                )
            }
        }
        if (hasOriginCoords && originInput.isNotBlank()) {
            markers.add(
                RouteMarker(
                    position = LatLng(currentOriginLat, currentOriginLng),
                    title = originInput,
                    snippet = "Starting Point",
                    type = MarkerType.ORIGIN
                )
            )
        }
        if (hasDestCoords && destinationInput.isNotBlank()) {
            markers.add(
                RouteMarker(
                    position = LatLng(currentDestLat, currentDestLng),
                    title = destinationInput,
                    snippet = "Destination",
                    type = MarkerType.DESTINATION
                )
            )
        }
        markers
    }

    if (uiState.isNavigating) {
        // ──────────────────────────────────────────────
        // FULL-SCREEN IMMERSIVE EV NAVIGATION MODE
        // ──────────────────────────────────────────────
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(VoltDarkBg)
        ) {
            // 1. Full-screen map
            VoltMapView(
                routePoints = routePoints,
                markers = mapMarkers,
                previewMarkers = previewMarkers,
                userLocation = uiState.userLocation,
                mapHeight = 0.dp,
                modifier = Modifier.fillMaxSize()
            )

            // 2. Floating Top Maneuver & Navigation HUD Header
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp, start = 14.dp, end = 14.dp)
                    .align(Alignment.TopCenter),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = VoltDarkBg.copy(alpha = 0.94f)),
                border = BorderStroke(1.5.dp, VoltEmerald)
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(VoltEmerald)
                            .padding(10.dp)
                    ) {
                        Icon(
                            Icons.Default.Navigation,
                            contentDescription = "Maneuver",
                            tint = Color.Black,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "LIVE EV TURN-BY-TURN",
                                color = VoltEmerald,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(VoltEmerald)
                                    .size(6.dp)
                            )
                        }
                        val nextChargerStop = uiState.tripPlan.stops.firstOrNull { it.type == StopType.CHARGER_STOP }
                        Text(
                            text = if (nextChargerStop != null) {
                                "In 2.4 km ➔ Turn towards ${nextChargerStop.name}"
                            } else {
                                "Head East towards ${uiState.tripPlan.destination.ifBlank { "Destination" }}"
                            },
                            color = VoltTextPrimary,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Speed: 74 km/h • Staying on optimized EV route",
                            color = VoltTextSecondary,
                            fontSize = 11.sp
                        )
                    }
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(VoltCardElevated)
                            .clickable { onStopNavigation() }
                            .padding(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Exit Navigation",
                            tint = VoltTextPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            // 3. Floating Bottom Telemetry & Navigation Controls Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp, start = 14.dp, end = 14.dp)
                    .align(Alignment.BottomCenter),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = VoltDarkBg.copy(alpha = 0.94f)),
                border = BorderStroke(1.dp, VoltCardBorder)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.BatteryChargingFull,
                                contentDescription = "Battery",
                                tint = VoltEmerald,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Battery: ${batteryPercent.toInt()}% SoC",
                                color = VoltEmerald,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text(
                            text = "Est. Range: 168 km",
                            color = VoltCyan,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    val nextChargerStop = uiState.tripPlan.stops.firstOrNull { it.type == StopType.CHARGER_STOP }
                    Text(
                        text = if (nextChargerStop != null) {
                            "Next Stop: ${nextChargerStop.name} (${nextChargerStop.distanceFromOriginKm.toInt()} km) • Charge +${nextChargerStop.chargeDurationMinutes}m to 80%"
                        } else {
                            "Direct EV Route • ${uiState.tripPlan.distanceKm.toInt()} km • ${uiState.tripPlan.durationMinutes} mins • Arrival SoC: ${uiState.tripPlan.arrivalSoC.toInt()}%"
                        },
                        color = VoltTextPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = onStopNavigation,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444).copy(alpha = 0.2f)),
                            border = BorderStroke(1.dp, Color(0xFFEF4444)),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 10.dp)
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Exit Nav",
                                tint = Color(0xFFEF4444),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Exit Nav",
                                color = Color(0xFFEF4444),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Button(
                            onClick = onLaunchGoogleMaps,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = VoltEmerald),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 10.dp)
                        ) {
                            Icon(
                                Icons.Default.Map,
                                contentDescription = "Maps",
                                tint = Color.Black,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Google Maps",
                                color = Color.Black,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    } else {
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

        Spacer(modifier = Modifier.height(12.dp))

        // ──────────────────────────────────────────────
        // ALWAYS-VISIBLE GOOGLE MAP
        // ──────────────────────────────────────────────
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Map,
                    contentDescription = "Map",
                    tint = VoltCyan,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (hasRoute) "Route Visualization" else "Map Preview",
                    color = VoltTextPrimary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // Navigation controls (show after route is calculated or when navigating)
            if (hasRoute || uiState.isNavigating) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    // In-App Turn-by-Turn Navigation toggle
                    Button(
                        onClick = {
                            if (uiState.isNavigating) onStopNavigation() else onStartNavigation()
                        },
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (uiState.isNavigating) VoltEmerald else VoltCyan.copy(alpha = 0.2f)
                        ),
                        border = BorderStroke(1.dp, if (uiState.isNavigating) VoltEmerald else VoltCyan),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Icon(
                            imageVector = if (uiState.isNavigating) Icons.Default.Navigation else Icons.Default.PlayArrow,
                            contentDescription = "In-App Nav",
                            tint = if (uiState.isNavigating) Color.Black else VoltCyan,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (uiState.isNavigating) "In-App Nav Active" else "In-App Nav",
                            color = if (uiState.isNavigating) Color.Black else VoltCyan,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // External Google Maps app launcher
                    Button(
                        onClick = onLaunchGoogleMaps,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VoltDarkBg),
                        border = BorderStroke(1.dp, VoltEmerald),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Icon(
                            Icons.Default.Map,
                            contentDescription = "Google Maps App",
                            tint = VoltEmerald,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Google Maps",
                            color = VoltEmerald,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1
                        )
                    }
                }
            }
        }
        Spacer(modifier = Modifier.height(8.dp))

        // In-App Navigation Turn Header (HUD) when navigating
        if (uiState.isNavigating) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = VoltEmerald.copy(alpha = 0.15f)),
                border = BorderStroke(1.5.dp, VoltEmerald)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(VoltEmerald)
                            .padding(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Navigation,
                            contentDescription = "Maneuver",
                            tint = Color.Black,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "IN-APP TURN-BY-TURN GUIDANCE",
                            color = VoltEmerald,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                        val nextChargerStop = uiState.tripPlan.stops.firstOrNull { it.type == StopType.CHARGER_STOP }
                        Text(
                            text = if (nextChargerStop != null) {
                                "In 2.4 km ➔ Turn towards ${nextChargerStop.name}"
                            } else {
                                "Head East towards ${uiState.tripPlan.destination.ifBlank { "Destination" }}"
                            },
                            color = VoltTextPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Live Speed: 74 km/h • Staying on EV route",
                            color = VoltTextSecondary,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }

        // Google Maps — in-app interactive map with route & live markers
        VoltMapView(
            routePoints = routePoints,
            markers = mapMarkers,
            previewMarkers = previewMarkers,
            userLocation = uiState.userLocation,
            mapHeight = if (uiState.isNavigating) 360.dp else 300.dp
        )

        // Live EV Navigation Telemetry & Stop Guidance Banner
        if (hasRoute || uiState.isNavigating) {
            Spacer(modifier = Modifier.height(8.dp))
            val nextChargerStop = uiState.tripPlan.stops.firstOrNull { it.type == StopType.CHARGER_STOP }
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = VoltCardBg),
                border = BorderStroke(1.dp, if (uiState.isNavigating) VoltEmerald else VoltCardBorder)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.BatteryChargingFull,
                                contentDescription = "Battery",
                                tint = VoltEmerald,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Battery: ${batteryPercent.toInt()}% SoC",
                                color = VoltEmerald,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text(
                            text = if (uiState.isNavigating) "🟢 LIVE IN-APP NAV" else "⚡ OPTIMIZED ROUTE",
                            color = if (uiState.isNavigating) VoltEmerald else VoltCyan,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = if (nextChargerStop != null) {
                            "Next Stop: ${nextChargerStop.name} (${nextChargerStop.distanceFromOriginKm.toInt()} km) • Charge +${nextChargerStop.chargeDurationMinutes} mins to reach 80%"
                        } else {
                            "Direct EV Route • ${uiState.tripPlan.distanceKm.toInt()} km • Est. ${uiState.tripPlan.durationMinutes} mins • Arrival Battery: ${uiState.tripPlan.arrivalSoC.toInt()}%"
                        },
                        color = VoltTextPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // In-App Nav button
                        Button(
                            onClick = {
                                if (uiState.isNavigating) onStopNavigation() else onStartNavigation()
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (uiState.isNavigating) VoltAmber.copy(alpha = 0.2f) else VoltEmerald
                            ),
                            border = BorderStroke(1.dp, if (uiState.isNavigating) VoltAmber else VoltEmerald),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 4.dp)
                        ) {
                            Text(
                                text = if (uiState.isNavigating) "Stop In-App Nav" else "▶ Start In-App Nav",
                                color = if (uiState.isNavigating) VoltAmber else Color.Black,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        // External Google Maps App button
                        Button(
                            onClick = onLaunchGoogleMaps,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = VoltDarkBg),
                            border = BorderStroke(1.dp, VoltCyan),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 4.dp)
                        ) {
                            Text(
                                text = "Open Google Maps",
                                color = VoltCyan,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

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
                        hasOriginCoords = true
                        hasDestCoords = true
                        onCalculateTrip(
                            preset.origin,
                            preset.destination,
                            preset.distanceKm,
                            preset.originLat,
                            preset.originLng,
                            preset.destLat,
                            preset.destLng,
                            batteryPercent.toDouble()
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

        // ──────────────────────────────────────────────
        // INPUT FORM with Battery Percentage
        // ──────────────────────────────────────────────
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = VoltCardBg),
            border = BorderStroke(1.dp, VoltCardBorder)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {

                // ── Battery Percentage Input ──
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.BatteryChargingFull,
                        contentDescription = "Battery",
                        tint = when {
                            batteryPercent >= 60f -> VoltEmerald
                            batteryPercent >= 30f -> VoltAmber
                            else -> Color(0xFFEF4444)
                        },
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Current Battery",
                        color = VoltTextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.weight(1f))
                    // Battery percentage badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                when {
                                    batteryPercent >= 60f -> VoltEmerald.copy(alpha = 0.15f)
                                    batteryPercent >= 30f -> VoltAmber.copy(alpha = 0.15f)
                                    else -> Color(0xFFEF4444).copy(alpha = 0.15f)
                                }
                            )
                            .padding(horizontal = 12.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "${batteryPercent.toInt()}%",
                            color = when {
                                batteryPercent >= 60f -> VoltEmerald
                                batteryPercent >= 30f -> VoltAmber
                                else -> Color(0xFFEF4444)
                            },
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Set your EV's current charge level before planning the route",
                    color = VoltTextSecondary,
                    fontSize = 11.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Slider(
                    value = batteryPercent,
                    onValueChange = { batteryPercent = it },
                    valueRange = 1f..100f,
                    steps = 0,
                    colors = SliderDefaults.colors(
                        thumbColor = when {
                            batteryPercent >= 60f -> VoltEmerald
                            batteryPercent >= 30f -> VoltAmber
                            else -> Color(0xFFEF4444)
                        },
                        activeTrackColor = when {
                            batteryPercent >= 60f -> VoltEmerald
                            batteryPercent >= 30f -> VoltAmber
                            else -> Color(0xFFEF4444)
                        },
                        inactiveTrackColor = VoltCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
                // Quick battery presets
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    listOf(20, 40, 60, 80, 100).forEach { preset ->
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(
                                    if (batteryPercent.toInt() == preset) VoltCyan.copy(alpha = 0.2f)
                                    else VoltCardElevated
                                )
                                .clickable { batteryPercent = preset.toFloat() }
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "$preset%",
                                color = if (batteryPercent.toInt() == preset) VoltCyan else VoltTextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Starting Location with Recommendations & GPS Current Location
                LocationInputField(
                    label = "Starting Location",
                    value = originInput,
                    onValueChange = { originInput = it },
                    onLocationSelected = { suggestion ->
                        currentOriginLat = suggestion.latitude
                        currentOriginLng = suggestion.longitude
                        hasOriginCoords = true
                        if (destinationInput.isNotBlank() && hasDestCoords) {
                            val autoDist = LocationSearchService.calculateDistanceKm(
                                currentOriginLat, currentOriginLng,
                                currentDestLat, currentDestLng
                            )
                            distanceInput = autoDist.toString()
                        }
                    },
                    leadingIcon = Icons.Default.Place,
                    iconTint = VoltCyan,
                    isStartingLocation = true,
                    onCurrentLocationAcquired = { lat, lng, name ->
                        currentOriginLat = lat
                        currentOriginLng = lng
                        hasOriginCoords = true
                        if (destinationInput.isNotBlank() && hasDestCoords) {
                            val autoDist = LocationSearchService.calculateDistanceKm(
                                currentOriginLat, currentOriginLng,
                                currentDestLat, currentDestLng
                            )
                            distanceInput = autoDist.toString()
                        }
                    }
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Destination Location with Recommendations & Auto-Distance Estimation
                LocationInputField(
                    label = "Destination",
                    value = destinationInput,
                    onValueChange = { destinationInput = it },
                    onLocationSelected = { suggestion ->
                        currentDestLat = suggestion.latitude
                        currentDestLng = suggestion.longitude
                        hasDestCoords = true
                        if (originInput.isNotBlank() && hasOriginCoords) {
                            val autoDist = LocationSearchService.calculateDistanceKm(
                                currentOriginLat, currentOriginLng,
                                currentDestLat, currentDestLng
                            )
                            distanceInput = autoDist.toString()
                        }
                    },
                    leadingIcon = Icons.Default.LocationOn,
                    iconTint = VoltEmerald,
                    isStartingLocation = false
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
                        var oLat = currentOriginLat
                        var oLng = currentOriginLng
                        var dLat = currentDestLat
                        var dLng = currentDestLng

                        // Match typed origin location with local suggestion if coordinates not set
                        val originMatch = LocationSearchService.findLocalSuggestion(originInput)
                        if (originMatch != null) {
                            oLat = originMatch.latitude
                            oLng = originMatch.longitude
                            currentOriginLat = oLat
                            currentOriginLng = oLng
                            hasOriginCoords = true
                        }

                        // Match typed destination location with local suggestion if coordinates not set
                        val destMatch = LocationSearchService.findLocalSuggestion(destinationInput)
                        if (destMatch != null) {
                            dLat = destMatch.latitude
                            dLng = destMatch.longitude
                            currentDestLat = dLat
                            currentDestLng = dLng
                            hasDestCoords = true
                        }

                        val calculatedDist = if (hasOriginCoords && hasDestCoords) {
                            LocationSearchService.calculateDistanceKm(oLat, oLng, dLat, dLng)
                        } else {
                            distanceInput.toDoubleOrNull() ?: 200.0
                        }
                        distanceInput = calculatedDist.toString()

                        onCalculateTrip(
                            originInput,
                            destinationInput,
                            calculatedDist,
                            oLat,
                            oLng,
                            dLat,
                            dLng,
                            batteryPercent.toDouble()
                        )
                    },
                    enabled = !uiState.isLoading,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = VoltCyan)
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(
                            color = Color.White,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Optimizing Route...",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    } else {
                        Icon(
                            Icons.Default.Navigation,
                            contentDescription = "Optimize",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Run Reachability & Optimization Engine",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

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
                                color = Color.White,
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
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = if (isSelected) VoltBlueLight else VoltCardBg),
        border = BorderStroke(
            if (isSelected) 1.5.dp else 1.dp,
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
                    .clip(RoundedCornerShape(10.dp))
                    .background(VoltCardElevated)
                    .padding(10.dp)
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
