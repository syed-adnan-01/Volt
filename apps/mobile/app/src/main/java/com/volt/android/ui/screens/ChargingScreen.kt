package com.volt.android.ui.screens

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.RateReview
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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

@Composable
fun ChargingScreen(
    uiState: VoltUiState,
    onToggleFastOnly: () -> Unit,
    onToggleAvailableOnly: () -> Unit,
    onSimulateFastCharge: (ChargingStation) -> Unit,
    onSubmitFeedback: (stationId: String, rating: Int, plugs: Int?, wait: Int?, functional: Boolean, comment: String?) -> Unit = { _, _, _, _, _, _ -> },
    modifier: Modifier = Modifier
) {
    var selectedFeedbackStation by remember { mutableStateOf<ChargingStation?>(null) }
    var showActiveChargingView by remember { mutableStateOf(false) }

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
            modifier = modifier
        )
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 2: Station Discovery View (Matching Screen 2 in Reference)
// ──────────────────────────────────────────────────────────────────────────────────
@Composable
private fun StationDiscoveryView(
    uiState: VoltUiState,
    onToggleFastOnly: () -> Unit,
    onToggleAvailableOnly: () -> Unit,
    onSimulateFastCharge: (ChargingStation) -> Unit,
    onFeedbackClick: (ChargingStation) -> Unit,
    onPreviewChargingSession: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(VoltDarkBg)
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        // Header
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
                    text = "Fast Charging Hubs",
                    color = VoltTextPrimary,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // Quick live session preview toggle
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

        // Horizontal Filter Chips (Matching Screen 2: Nearby, DC Fast, AC, Available Now)
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Nearby Pill (Selected Gradient Pill)
            item {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(
                            Brush.horizontalGradient(
                                listOf(VoltGradientStart, VoltGradientEnd)
                            )
                        )
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.NearMe,
                            contentDescription = "Nearby",
                            tint = Color.White,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            text = "Nearby",
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

            // AC Level 2 Chip
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
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Charging Station List (Screen 2 Card Layout)
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(uiState.stations) { station ->
                StationDiscoveryCard(
                    station = station,
                    onChargeClick = { onSimulateFastCharge(station) },
                    onFeedbackClick = { onFeedbackClick(station) }
                )
            }
            item {
                Spacer(modifier = Modifier.height(40.dp))
            }
        }
    }
}

@Composable
fun StationDiscoveryCard(
    station: ChargingStation,
    onChargeClick: () -> Unit,
    onFeedbackClick: () -> Unit = {}
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

            // Distance & Price Row
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
                        text = "${station.distanceKm} km",
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

                // Report button
                Text(
                    text = "Report",
                    color = VoltCyan,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.clickable { onFeedbackClick() }
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // View Details / Start Charging Gradient Button
            Box(
                modifier = Modifier
                    .fillMaxWidth()
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
                Row(verticalAlignment = Alignment.CenterVertically) {
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
// SCREEN 3: Active Charging Session View (Matching Screen 3 in Reference)
// ──────────────────────────────────────────────────────────────────────────────────
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

        // Top Car Graphic & Radiant Energy Beam Visual
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            contentAlignment = Alignment.Center
        ) {
            // Background radiant blue gradient beam
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

            // Car Icon / Graphic
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

        // 6 Metrics Badges (2 columns x 3 rows matching Screen 3)
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Row 1: Range added & Cost
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

            // Row 2: Energy & Power
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

            // Row 3: Time elapsed & Voltage
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

        // Circular Glowing Progress Ring (Matching Screen 3)
        Box(
            modifier = Modifier.size(190.dp),
            contentAlignment = Alignment.Center
        ) {
            val soc = uiState.telemetry.socPercent.toFloat()
            Canvas(modifier = Modifier.size(170.dp)) {
                val strokeWidth = 14.dp.toPx()
                val radius = (size.width - strokeWidth) / 2
                val center = Offset(size.width / 2, size.height / 2)

                // Outer Soft Glow Track
                drawCircle(
                    color = VoltTrackBg,
                    radius = radius,
                    center = center,
                    style = Stroke(width = strokeWidth)
                )

                // Active Royal Electric Blue Ring
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

        // Full Width Stop / Action Button
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
