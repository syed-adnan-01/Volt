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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.RateReview
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.volt.android.data.models.ChargingStation
import com.volt.android.ui.components.FeedbackDialog
import com.volt.android.ui.theme.VoltAmber
import com.volt.android.ui.theme.VoltCardBg
import com.volt.android.ui.theme.VoltCardBorder
import com.volt.android.ui.theme.VoltCardElevated
import com.volt.android.ui.theme.VoltCyan
import com.volt.android.ui.theme.VoltDarkBg
import com.volt.android.ui.theme.VoltEmerald
import com.volt.android.ui.theme.VoltTextMuted
import com.volt.android.ui.theme.VoltTextPrimary
import com.volt.android.ui.theme.VoltTextSecondary
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

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(VoltDarkBg)
            .padding(16.dp)
    ) {
        // Header
        Text(
            text = "NEARBY CHARGING NETWORK",
            color = VoltCyan,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )
        Text(
            text = "High-Power Fast Chargers",
            color = VoltTextPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Black
        )
        Text(
            text = "Real-time stall availability & maximum charging rates.",
            color = VoltTextSecondary,
            fontSize = 13.sp
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Filter chips
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FilterChip(
                selected = uiState.filterFastOnly,
                onClick = onToggleFastOnly,
                label = { Text("⚡ DC Fast Only (150kW+)", fontSize = 12.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = VoltCyan.copy(alpha = 0.25f),
                    selectedLabelColor = VoltCyan,
                    containerColor = VoltCardBg,
                    labelColor = VoltTextSecondary
                ),
                border = BorderStroke(1.dp, if (uiState.filterFastOnly) VoltCyan else VoltCardBorder)
            )

            FilterChip(
                selected = uiState.filterAvailableOnly,
                onClick = onToggleAvailableOnly,
                label = { Text("🟢 Available Now", fontSize = 12.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = VoltEmerald.copy(alpha = 0.25f),
                    selectedLabelColor = VoltEmerald,
                    containerColor = VoltCardBg,
                    labelColor = VoltTextSecondary
                ),
                border = BorderStroke(1.dp, if (uiState.filterAvailableOnly) VoltEmerald else VoltCardBorder)
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Charging Station List
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(uiState.stations) { station ->
                StationCard(
                    station = station,
                    onChargeClick = { onSimulateFastCharge(station) },
                    onFeedbackClick = { selectedFeedbackStation = station }
                )
            }
            item {
                Spacer(modifier = Modifier.height(60.dp))
            }
        }
    }
}

@Composable
fun StationCard(
    station: ChargingStation,
    onChargeClick: () -> Unit,
    onFeedbackClick: () -> Unit = {}
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = VoltCardBg),
        border = BorderStroke(1.dp, VoltCardBorder)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = station.operator.uppercase(),
                        color = VoltCyan,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = station.name,
                        color = VoltTextPrimary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = station.address,
                        color = VoltTextSecondary,
                        fontSize = 12.sp
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (station.isFastCharger) VoltCyan.copy(alpha = 0.15f) else VoltCardElevated)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "${station.powerKw} kW",
                        color = if (station.isFastCharger) VoltCyan else VoltTextSecondary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Details row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(
                                if (station.availablePlugs > 0) VoltEmerald else VoltAmber,
                                CircleShape
                            )
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${station.availablePlugs}/${station.totalPlugs} Plugs Available",
                        color = if (station.availablePlugs > 0) VoltEmerald else VoltAmber,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Text(
                    text = "${station.distanceKm} km away",
                    color = VoltTextSecondary,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Connectors & Action Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    station.connectors.forEach { connector ->
                        Box(
                            modifier = Modifier
                                .background(VoltCardElevated, RoundedCornerShape(6.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = connector.connectorType,
                                color = VoltTextSecondary,
                                fontSize = 11.sp
                            )
                        }
                    }
                    Text(
                        text = "• $${station.pricePerKWh}/kWh",
                        color = VoltTextMuted,
                        fontSize = 11.sp,
                        modifier = Modifier.align(Alignment.CenterVertically)
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    OutlinedButton(
                        onClick = onFeedbackClick,
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, VoltCardBorder),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.RateReview,
                            contentDescription = "Report",
                            tint = VoltCyan,
                            modifier = Modifier.size(13.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Report",
                            color = VoltCyan,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Button(
                        onClick = onChargeClick,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = VoltCyan),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Bolt,
                            contentDescription = "Charge",
                            tint = Color.Black,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Charge 15m",
                            color = Color.Black,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}
