package com.volt.android.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.ElectricMeter
import androidx.compose.material.icons.filled.EvStation
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.RateReview
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import com.volt.android.data.models.ChargingStation
import com.volt.android.ui.components.FeedbackDialog
import com.volt.android.ui.theme.VoltAmber
import com.volt.android.ui.theme.VoltBlueBorder
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
import com.volt.android.ui.theme.VoltTrackBg
import com.volt.android.ui.viewmodel.VoltUiState
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChargingScreen(
    uiState: VoltUiState,
    onToggleFastOnly: () -> Unit,
    onToggleAvailableOnly: () -> Unit,
    onSimulateFastCharge: (ChargingStation) -> Unit,
    onSubmitFeedback: (stationId: String, rating: Int, plugs: Int?, wait: Int?, functional: Boolean, comment: String?) -> Unit = { _, _, _, _, _, _ -> },
    onRefreshNearby: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var selectedFeedbackStation by remember { mutableStateOf<ChargingStation?>(null) }
    var showActiveChargingView by remember { mutableStateOf(false) }
    var showMapOverlay by remember { mutableStateOf(false) }
    var selectedMapStation by remember { mutableStateOf<ChargingStation?>(null) }

    if (selectedFeedbackStation != null) {
        FeedbackDialog(
            station = selectedFeedbackStation!!,
            onDismiss = { selectedFeedbackStation = null },
            onSubmit = { rating, plugs, wait, functional, comment ->
                onSubmitFeedback(
                    selectedFeedbackStation!!.id,
                    rating,
                    plugs,
                    wait,
                    functional,
                    comment
                )
            }
        )
    }

    // ── Full-screen Map Overlay ───────────────────────────────────────────────
    if (showMapOverlay) {
        StationsMapOverlay(
            stations = uiState.stations,
            userLocation = uiState.userLocation,
            selectedStation = selectedMapStation,
            onStationSelected = { selectedMapStation = it },
            onNavigateToStation = { station ->
                val lat = station.latitude ?: return@StationsMapOverlay
                val lng = station.longitude ?: return@StationsMapOverlay
                val uri = Uri.parse("google.navigation:q=$lat,$lng&mode=d")
                val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                    setPackage("com.google.android.apps.maps")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                try {
                    context.startActivity(intent)
                } catch (_: Exception) {
                    val fallback = Intent(Intent.ACTION_VIEW,
                        Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving"))
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(fallback)
                }
            },
            onDismiss = {
                showMapOverlay = false
                selectedMapStation = null
            }
        )
        return
    }

    if (uiState.telemetry.isCharging || showActiveChargingView) {
        ActiveChargingSessionView(
            uiState = uiState,
            onStopCharging = {
                showActiveChargingView = false
                if (uiState.telemetry.isCharging && uiState.stations.isNotEmpty()) {
                    onSimulateFastCharge(uiState.stations.first())
                }
            },
            onBackToStations = { showActiveChargingView = false },
            modifier = modifier
        )
    } else {
        StationDiscoveryView(
            uiState = uiState,
            onToggleFastOnly = onToggleFastOnly,
            onToggleAvailableOnly = onToggleAvailableOnly,
            onSimulateFastCharge = { station ->
                showActiveChargingView = true
                onSimulateFastCharge(station)
            },
            onFeedbackClick = { station -> selectedFeedbackStation = station },
            onPreviewChargingSession = { showActiveChargingView = true },
            onRefreshNearby = onRefreshNearby,
            onViewAllOnMap = { showMapOverlay = true },
            onViewStationOnMap = { station ->
                selectedMapStation = station
                showMapOverlay = true
            },
            modifier = modifier
        )
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Full-Screen Google Map Overlay with Station Markers
// ─────────────────────────────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StationsMapOverlay(
    stations: List<ChargingStation>,
    userLocation: com.google.android.gms.maps.model.LatLng?,
    selectedStation: ChargingStation?,
    onStationSelected: (ChargingStation?) -> Unit,
    onNavigateToStation: (ChargingStation) -> Unit,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // Camera starts at user's location, or the first station, or Bengaluru default
    val initialLatLng = userLocation
        ?: stations.firstOrNull()?.let {
            if (it.latitude != null && it.longitude != null)
                LatLng(it.latitude, it.longitude) else null
        }
        ?: LatLng(12.9716, 77.5946)

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(initialLatLng, 12f)
    }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    Box(modifier = Modifier.fillMaxSize()) {
        // ── Google Map ────────────────────────────────────────────────────────
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(isMyLocationEnabled = true),
            uiSettings = MapUiSettings(
                myLocationButtonEnabled = true,
                zoomControlsEnabled = true,
                mapToolbarEnabled = false
            )
        ) {
            stations.forEach { station ->
                if (station.latitude != null && station.longitude != null) {
                    val markerColor = when {
                        station.powerKw >= 100 -> BitmapDescriptorFactory.HUE_GREEN
                        station.powerKw >= 50  -> BitmapDescriptorFactory.HUE_YELLOW
                        else                   -> BitmapDescriptorFactory.HUE_RED
                    }
                    Marker(
                        state = MarkerState(position = LatLng(station.latitude, station.longitude)),
                        title = station.name,
                        snippet = "${station.availablePlugs}/${station.totalPlugs} plugs • ${station.powerKw} kW",
                        icon = BitmapDescriptorFactory.defaultMarker(markerColor),
                        onClick = {
                            onStationSelected(station)
                            false
                        }
                    )
                }
            }
        }

        // ── Close button ──────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .padding(16.dp)
                .size(42.dp)
                .clip(CircleShape)
                .background(VoltCardBg)
                .border(1.dp, VoltCardBorder, CircleShape)
                .clickable { onDismiss() },
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = "Close Map",
                tint = VoltTextPrimary,
                modifier = Modifier.size(20.dp)
            )
        }

        // ── Station count pill ────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 16.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(VoltCardBg.copy(alpha = 0.95f))
                .border(1.dp, VoltCardBorder, RoundedCornerShape(20.dp))
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.EvStation,
                    contentDescription = null,
                    tint = VoltCyan,
                    modifier = Modifier.size(15.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "${stations.count { it.latitude != null }} stations nearby",
                    color = VoltTextPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        // ── Legend ────────────────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 16.dp, bottom = if (selectedStation != null) 300.dp else 24.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(VoltCardBg.copy(alpha = 0.95f))
                .border(1.dp, VoltCardBorder, RoundedCornerShape(12.dp))
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            LegendItem(color = Color(0xFF34A853), label = "≥ 100 kW (DC Fast)")
            LegendItem(color = Color(0xFFFBBC04), label = "50–99 kW")
            LegendItem(color = Color(0xFFEA4335), label = "< 50 kW (AC)")
        }
    }

    // ── Station Detail Bottom Sheet ───────────────────────────────────────────
    if (selectedStation != null) {
        ModalBottomSheet(
            onDismissRequest = { onStationSelected(null) },
            sheetState = sheetState,
            containerColor = VoltCardBg,
            contentColor = VoltTextPrimary,
            dragHandle = {
                Box(
                    modifier = Modifier
                        .padding(top = 12.dp, bottom = 4.dp)
                        .width(40.dp)
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(VoltCardBorder)
                )
            }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                // Station name
                Text(
                    text = selectedStation.name,
                    color = VoltTextPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = selectedStation.address,
                    color = VoltTextSecondary,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(16.dp))

                // Stats row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MapStationStatChip(
                        label = "Power",
                        value = "${selectedStation.powerKw} kW",
                        color = VoltCyan,
                        modifier = Modifier.weight(1f)
                    )
                    MapStationStatChip(
                        label = "Plugs",
                        value = "${selectedStation.availablePlugs}/${selectedStation.totalPlugs}",
                        color = VoltEmerald,
                        modifier = Modifier.weight(1f)
                    )
                    MapStationStatChip(
                        label = "Type",
                        value = if (selectedStation.isFastCharger) "DC Fast" else "AC",
                        color = VoltAmber,
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Navigate button
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .clip(RoundedCornerShape(25.dp))
                        .background(
                            Brush.horizontalGradient(
                                listOf(VoltGradientStart, VoltGradientEnd)
                            )
                        )
                        .clickable { onNavigateToStation(selectedStation) },
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Navigation,
                            contentDescription = "Navigate",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Navigate to Station",
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun LegendItem(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(10.dp)
                .background(color, CircleShape)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(text = label, color = VoltTextSecondary, fontSize = 11.sp)
    }
}

@Composable
private fun MapStationStatChip(
    label: String,
    value: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(VoltCardElevated)
            .padding(vertical = 10.dp, horizontal = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(text = label, color = VoltTextSecondary, fontSize = 10.sp)
        Spacer(modifier = Modifier.height(3.dp))
        Text(text = value, color = color, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 2: Station Discovery View
// ─────────────────────────────────────────────────────────────────────────────
@Composable
private fun StationDiscoveryView(
    uiState: VoltUiState,
    onToggleFastOnly: () -> Unit,
    onToggleAvailableOnly: () -> Unit,
    onSimulateFastCharge: (ChargingStation) -> Unit,
    onFeedbackClick: (ChargingStation) -> Unit,
    onPreviewChargingSession: () -> Unit,
    onRefreshNearby: () -> Unit,
    onViewAllOnMap: () -> Unit,
    onViewStationOnMap: (ChargingStation) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(VoltDarkBg)
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        // ── Header ────────────────────────────────────────────────────────────
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "CHARGING NETWORK",
                    color = VoltCyan,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Text(
                    text = "Nearby Stations",
                    color = VoltTextPrimary,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // Active Session preview toggle
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(VoltBlueLight)
                    .border(1.dp, VoltBlueBorder, RoundedCornerShape(20.dp))
                    .clickable { onPreviewChargingSession() }
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Bolt,
                        contentDescription = "Live Session",
                        tint = VoltCyan,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Active Session",
                        color = VoltCyan,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // ── Filter + Action Row ───────────────────────────────────────────────
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Nearby pill
            item {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(
                            Brush.horizontalGradient(listOf(VoltGradientStart, VoltGradientEnd))
                        )
                        .clickable { onRefreshNearby() }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (uiState.isLoading) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(13.dp)
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.MyLocation,
                                contentDescription = "Refresh Nearby",
                                tint = Color.White,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            text = if (uiState.isLoading) "Locating…" else "Nearby",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // DC Fast Chip
            item {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(if (uiState.filterFastOnly) VoltBlueLight else VoltCardBg)
                        .border(
                            1.dp,
                            if (uiState.filterFastOnly) VoltCyan else VoltCardBorder,
                            RoundedCornerShape(20.dp)
                        )
                        .clickable { onToggleFastOnly() }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "DC Fast",
                        color = if (uiState.filterFastOnly) VoltCyan else VoltTextSecondary,
                        fontSize = 12.sp,
                        fontWeight = if (uiState.filterFastOnly) FontWeight.Bold else FontWeight.Medium
                    )
                }
            }

            // AC Chip
            item {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(VoltCardBg)
                        .border(1.dp, VoltCardBorder, RoundedCornerShape(20.dp))
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "AC",
                        color = VoltTextSecondary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // Available Now Chip
            item {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(if (uiState.filterAvailableOnly) Color(0xFFECFDF5) else VoltCardBg)
                        .border(
                            1.dp,
                            if (uiState.filterAvailableOnly) VoltEmerald else VoltCardBorder,
                            RoundedCornerShape(20.dp)
                        )
                        .clickable { onToggleAvailableOnly() }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(VoltEmerald, CircleShape)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Available Now",
                            color = if (uiState.filterAvailableOnly) VoltEmerald else VoltTextSecondary,
                            fontSize = 12.sp,
                            fontWeight = if (uiState.filterAvailableOnly) FontWeight.Bold else FontWeight.Medium
                        )
                    }
                }
            }

            // View All on Map chip
            item {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(VoltCardBg)
                        .border(1.dp, VoltCardBorder, RoundedCornerShape(20.dp))
                        .clickable { onViewAllOnMap() }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Map,
                            contentDescription = "View Map",
                            tint = VoltCyan,
                            modifier = Modifier.size(13.dp)
                        )
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            text = "Map View",
                            color = VoltCyan,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ── Content: Loading / Empty / Station List ───────────────────────────
        when {
            uiState.isLoading && uiState.stations.isEmpty() -> {
                // Shimmer loading state
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    repeat(3) {
                        ShimmerStationCard()
                    }
                }
            }

            !uiState.isLoading && uiState.stations.isEmpty() -> {
                // Empty state — prompt user to find nearby stations
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.padding(32.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .clip(CircleShape)
                                .background(VoltBlueLight),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.EvStation,
                                contentDescription = null,
                                tint = VoltCyan,
                                modifier = Modifier.size(36.dp)
                            )
                        }
                        Text(
                            text = "Find EV Stations Near You",
                            color = VoltTextPrimary,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "Tap below to locate real charging stations within 50 km of your current position",
                            color = VoltTextSecondary,
                            fontSize = 14.sp,
                            textAlign = TextAlign.Center,
                            lineHeight = 20.sp
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                                .clip(RoundedCornerShape(25.dp))
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(VoltGradientStart, VoltGradientEnd)
                                    )
                                )
                                .clickable { onRefreshNearby() },
                            contentAlignment = Alignment.Center
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.MyLocation,
                                    contentDescription = "Locate",
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Find Nearby Stations",
                                    color = Color.White,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }

            else -> {
                // Station list
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    item {
                        // Subtitle with station count
                        Text(
                            text = "${uiState.stations.size} stations found nearby",
                            color = VoltTextMuted,
                            fontSize = 12.sp
                        )
                    }
                    items(uiState.stations) { station ->
                        StationDiscoveryCard(
                            station = station,
                            onChargeClick = { onSimulateFastCharge(station) },
                            onFeedbackClick = { onFeedbackClick(station) },
                            onViewOnMap = { onViewStationOnMap(station) }
                        )
                    }
                    item {
                        // Refresh at bottom
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(VoltCardBg)
                                .border(1.dp, VoltCardBorder, RoundedCornerShape(16.dp))
                                .clickable { onRefreshNearby() }
                                .padding(vertical = 14.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Refresh,
                                    contentDescription = "Refresh",
                                    tint = VoltCyan,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Refresh Nearby Stations",
                                    color = VoltCyan,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(40.dp))
                    }
                }
            }
        }
    }
}

// ── Shimmer loading card ──────────────────────────────────────────────────────
@Composable
private fun ShimmerStationCard() {
    val infiniteTransition = rememberInfiniteTransition(label = "shimmer")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.7f,
        animationSpec = infiniteRepeatable(
            animation = tween(900),
            repeatMode = RepeatMode.Reverse
        ),
        label = "shimmerAlpha"
    )
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(140.dp),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = VoltCardBg),
        border = BorderStroke(1.dp, VoltCardBorder)
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.7f)
                    .height(18.dp)
                    .clip(RoundedCornerShape(9.dp))
                    .background(VoltCardElevated.copy(alpha = alpha))
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.45f)
                    .height(12.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(VoltCardElevated.copy(alpha = alpha))
            )
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Box(
                    modifier = Modifier
                        .width(70.dp)
                        .height(12.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(VoltCardElevated.copy(alpha = alpha))
                )
                Box(
                    modifier = Modifier
                        .width(70.dp)
                        .height(12.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(VoltCardElevated.copy(alpha = alpha))
                )
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(38.dp)
                    .clip(RoundedCornerShape(19.dp))
                    .background(VoltCardElevated.copy(alpha = alpha))
            )
        }
    }
}

// ── Station Card ──────────────────────────────────────────────────────────────
@Composable
fun StationDiscoveryCard(
    station: ChargingStation,
    onChargeClick: () -> Unit,
    onFeedbackClick: () -> Unit = {},
    onViewOnMap: () -> Unit = {}
) {
    var isFavorite by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = 2.dp,
                shape = RoundedCornerShape(22.dp),
                spotColor = Color(0x0E000000)
            ),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = VoltCardBg),
        border = BorderStroke(1.dp, VoltCardBorder)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            // Title & Favorite Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = station.name,
                        color = VoltTextPrimary,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(3.dp))
                    Text(
                        text = "${station.availablePlugs}/${station.totalPlugs} Available • ${if (station.isFastCharger) "DC Fast" else "AC"} ${station.powerKw} kW",
                        color = VoltTextSecondary,
                        fontSize = 12.sp
                    )
                }

                IconButton(
                    onClick = { isFavorite = !isFavorite },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = if (isFavorite) Icons.Default.Star else Icons.Default.StarBorder,
                        contentDescription = "Favorite",
                        tint = if (isFavorite) VoltAmber else VoltTextMuted,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Distance & Price & Report Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Place,
                        contentDescription = "Distance",
                        tint = VoltCyan,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (station.distanceKm > 0) "${station.distanceKm} km" else "Nearby",
                        color = VoltTextSecondary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.AttachMoney,
                        contentDescription = "Price",
                        tint = VoltEmerald,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        text = "$${station.pricePerKWh} / kWh",
                        color = VoltTextSecondary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.weight(1f))

                Text(
                    text = "Report",
                    color = VoltCyan,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.clickable { onFeedbackClick() }
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Action buttons row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // View on Map button
                Box(
                    modifier = Modifier
                        .weight(0.42f)
                        .height(46.dp)
                        .clip(RoundedCornerShape(23.dp))
                        .background(VoltCardElevated)
                        .border(1.dp, VoltCardBorder, RoundedCornerShape(23.dp))
                        .clickable { onViewOnMap() },
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Map,
                            contentDescription = "View on Map",
                            tint = VoltCyan,
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            text = "Map",
                            color = VoltCyan,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                // View Details / Start Charging gradient button
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(46.dp)
                        .clip(RoundedCornerShape(23.dp))
                        .background(
                            Brush.horizontalGradient(
                                listOf(VoltGradientStart, VoltGradientEnd)
                            )
                        )
                        .clickable { onChargeClick() },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "View Details ↗",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 3: Active Charging Session View
// ─────────────────────────────────────────────────────────────────────────────
@Composable
private fun ActiveChargingSessionView(
    uiState: VoltUiState,
    onStopCharging: () -> Unit,
    onBackToStations: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(VoltDarkBg)
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Top Bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(VoltCardBg)
                    .border(1.dp, VoltCardBorder, CircleShape)
                    .clickable { onBackToStations() },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Back",
                    tint = VoltTextSecondary,
                    modifier = Modifier.size(18.dp)
                )
            }

            Text(
                text = "${uiState.selectedVehicle.make} ${uiState.selectedVehicle.model}",
                color = VoltTextPrimary,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )

            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(VoltCardBg)
                    .border(1.dp, VoltCardBorder, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "•••",
                    color = VoltTextSecondary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Car Graphic & Radiant Energy Beam Visual
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .width(100.dp)
                    .height(120.dp)
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                VoltCyan.copy(alpha = 0.35f),
                                VoltGradientEnd.copy(alpha = 0.15f),
                                Color.Transparent
                            )
                        ),
                        RoundedCornerShape(50.dp)
                    )
            )

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = Icons.Default.DirectionsCar,
                    contentDescription = "EV Car",
                    tint = VoltCyan,
                    modifier = Modifier.size(54.dp)
                )
                Text(
                    text = "CHARGING ACTIVE",
                    color = VoltCyan,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 6 Metrics Badges
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                ChargingMetricPill(
                    icon = Icons.Default.Speed,
                    label = "Range added",
                    value = "${uiState.telemetry.estimatedRangeKm.toInt()} km",
                    modifier = Modifier.weight(1f)
                )
                ChargingMetricPill(
                    icon = Icons.Default.AttachMoney,
                    label = "Cost",
                    value = "$12.45",
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                ChargingMetricPill(
                    icon = Icons.Default.EvStation,
                    label = "Energy",
                    value = "${String.format("%.1f", uiState.telemetry.currentEnergyKWh)} kWh",
                    modifier = Modifier.weight(1f)
                )
                ChargingMetricPill(
                    icon = Icons.Default.FlashOn,
                    label = "Power",
                    value = "${uiState.telemetry.currentPowerKw.toInt()} kW",
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                ChargingMetricPill(
                    icon = Icons.Default.AccessTime,
                    label = "Time elapsed",
                    value = "00:18:15",
                    modifier = Modifier.weight(1f)
                )
                ChargingMetricPill(
                    icon = Icons.Default.ElectricMeter,
                    label = "Voltage",
                    value = "${uiState.telemetry.voltage.toInt()} V",
                    modifier = Modifier.weight(1f)
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Circular Glowing Progress Ring
        Box(
            modifier = Modifier.size(190.dp),
            contentAlignment = Alignment.Center
        ) {
            val soc = uiState.telemetry.socPercent.toFloat()
            Canvas(modifier = Modifier.size(170.dp)) {
                val strokeWidth = 14.dp.toPx()
                val radius = (size.width - strokeWidth) / 2
                val center = Offset(size.width / 2, size.height / 2)

                drawCircle(
                    color = VoltTrackBg,
                    radius = radius,
                    center = center,
                    style = Stroke(width = strokeWidth)
                )

                val sweepAngle = 360f * (soc / 100f).coerceIn(0.05f, 1f)
                drawArc(
                    brush = Brush.sweepGradient(
                        0.0f to VoltGradientStart,
                        0.5f to VoltGradientEnd,
                        1.0f to VoltGradientStart
                    ),
                    startAngle = -90f,
                    sweepAngle = sweepAngle,
                    useCenter = false,
                    topLeft = Offset(strokeWidth / 2, strokeWidth / 2),
                    size = Size(size.width - strokeWidth, size.height - strokeWidth),
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                )
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Bolt,
                    contentDescription = "Charge",
                    tint = VoltCyan,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "${uiState.telemetry.socPercent.toInt()}%",
                    color = VoltTextPrimary,
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Black
                )
            }
        }

        Spacer(modifier = Modifier.height(26.dp))

        // Stop Charging Button
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(RoundedCornerShape(26.dp))
                .background(
                    Brush.horizontalGradient(
                        listOf(VoltGradientStart, VoltGradientEnd)
                    )
                )
                .clickable { onStopCharging() },
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Stop Charging",
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(30.dp))
    }
}

@Composable
private fun ChargingMetricPill(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = VoltCardBg),
        border = BorderStroke(1.dp, VoltCardBorder)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(VoltCardElevated),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = VoltCyan,
                    modifier = Modifier.size(16.dp)
                )
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column {
                Text(
                    text = label,
                    color = VoltTextSecondary,
                    fontSize = 11.sp
                )
                Text(
                    text = value,
                    color = VoltTextPrimary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
