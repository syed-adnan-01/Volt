package com.volt.android.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.EvStation
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.volt.android.data.IndianEvCatalog
import com.volt.android.data.models.VehicleProfile
import com.volt.android.ui.theme.VoltAmber
import com.volt.android.ui.theme.VoltCardBg
import com.volt.android.ui.theme.VoltCardBorder
import com.volt.android.ui.theme.VoltCardElevated
import com.volt.android.ui.theme.VoltCyan
import com.volt.android.ui.theme.VoltDarkBg
import com.volt.android.ui.theme.VoltEmerald
import com.volt.android.ui.theme.VoltGradientEnd
import com.volt.android.ui.theme.VoltGradientStart
import com.volt.android.ui.theme.VoltRose
import com.volt.android.ui.theme.VoltTextMuted
import com.volt.android.ui.theme.VoltTextPrimary
import com.volt.android.ui.theme.VoltTextSecondary

// ─────────────────────────────────────────────────────────────────────────────
// Searchable Vehicle Picker Bottom Sheet
// Used both in registration and in "My Garage"
// ─────────────────────────────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VehiclePickerSheet(
    currentVehicleIds: Set<String> = emptySet(),
    onVehicleSelected: (VehicleProfile) -> Unit,
    onDismiss: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf(IndianEvCatalog.CAT_ALL) }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val filtered = remember(searchQuery, selectedCategory) {
        val base = IndianEvCatalog.byCategory(selectedCategory)
        if (searchQuery.isBlank()) base
        else IndianEvCatalog.search(searchQuery).filter { v ->
            selectedCategory == IndianEvCatalog.CAT_ALL ||
            IndianEvCatalog.categoryMap[v.id] == selectedCategory
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = VoltDarkBg,
        contentColor = VoltTextPrimary,
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(top = 12.dp, bottom = 6.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(VoltCardBorder)
            )
        }
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "SELECT YOUR EV",
                        color = VoltCyan,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "Indian EV Catalog",
                        color = VoltTextPrimary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = VoltTextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Search bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search make or model…", color = VoltTextMuted) },
                leadingIcon = {
                    Icon(Icons.Default.Search, contentDescription = null, tint = VoltCyan)
                },
                trailingIcon = {
                    if (searchQuery.isNotBlank()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear", tint = VoltTextMuted, modifier = Modifier.size(16.dp))
                        }
                    }
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = VoltTextPrimary,
                    unfocusedTextColor = VoltTextPrimary,
                    focusedBorderColor = VoltCyan,
                    unfocusedBorderColor = VoltCardBorder,
                    focusedContainerColor = VoltCardElevated,
                    unfocusedContainerColor = VoltCardElevated
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Category tabs
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(horizontal = 20.dp)
            ) {
                items(IndianEvCatalog.categories) { cat ->
                    val isSelected = cat == selectedCategory
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(
                                if (isSelected) Brush.horizontalGradient(listOf(VoltGradientStart, VoltGradientEnd))
                                else Brush.horizontalGradient(listOf(VoltCardElevated, VoltCardElevated))
                            )
                            .border(
                                1.dp,
                                if (isSelected) Color.Transparent else VoltCardBorder,
                                RoundedCornerShape(20.dp)
                            )
                            .clickable { selectedCategory = cat }
                            .padding(horizontal = 14.dp, vertical = 7.dp)
                    ) {
                        Text(
                            text = cat,
                            color = if (isSelected) Color.White else VoltTextSecondary,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Vehicle count
            Text(
                text = "${filtered.size} vehicles",
                color = VoltTextMuted,
                fontSize = 12.sp,
                modifier = Modifier.padding(horizontal = 20.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Vehicle list
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
            ) {
                items(filtered) { vehicle ->
                    val alreadyAdded = vehicle.id in currentVehicleIds
                    VehicleCatalogCard(
                        vehicle = vehicle,
                        alreadyAdded = alreadyAdded,
                        onClick = {
                            if (!alreadyAdded) {
                                onVehicleSelected(vehicle)
                                onDismiss()
                            }
                        }
                    )
                }
                item { Spacer(modifier = Modifier.height(32.dp)) }
            }
        }
    }
}

// ── Vehicle catalog card ──────────────────────────────────────────────────────
@Composable
fun VehicleCatalogCard(
    vehicle: VehicleProfile,
    alreadyAdded: Boolean = false,
    onClick: () -> Unit
) {
    val category = IndianEvCatalog.categoryMap[vehicle.id] ?: IndianEvCatalog.CAT_ALL
    val price = IndianEvCatalog.priceLabel(vehicle)
    val rangeKm = IndianEvCatalog.araiRange(vehicle)
    val isTwoWheeler = category == IndianEvCatalog.CAT_TWO_WHEELER

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (alreadyAdded) VoltEmerald.copy(alpha = 0.08f) else VoltCardBg
        ),
        border = BorderStroke(
            1.dp,
            if (alreadyAdded) VoltEmerald.copy(alpha = 0.5f) else VoltCardBorder
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Vehicle icon
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(VoltCardElevated),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isTwoWheeler) Icons.Default.EvStation else Icons.Default.DirectionsCar,
                    contentDescription = null,
                    tint = VoltCyan,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "${vehicle.make} ${vehicle.model}",
                        color = VoltTextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    // Category badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(VoltCyan.copy(alpha = 0.12f))
                            .padding(horizontal = 5.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = category,
                            color = VoltCyan,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Spacer(modifier = Modifier.height(3.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatPill("⚡ ${vehicle.batteryCapacityKWh.toInt()} kWh", VoltAmber)
                    StatPill("🛣 ~$rangeKm km", VoltEmerald)
                    StatPill("${vehicle.maxChargingPowerKw.toInt()} kW max", VoltCyan)
                }
                Spacer(modifier = Modifier.height(3.dp))
                Text(text = price, color = VoltTextMuted, fontSize = 11.sp)
            }

            Spacer(modifier = Modifier.width(8.dp))

            if (alreadyAdded) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "Added",
                    tint = VoltEmerald,
                    modifier = Modifier.size(22.dp)
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(30.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(listOf(VoltGradientStart.copy(alpha = 0.3f), Color.Transparent))
                        )
                        .border(1.dp, VoltCyan, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Select",
                        tint = VoltCyan,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun StatPill(text: String, color: Color) {
    Text(
        text = text,
        color = color,
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// My Garage Screen
// ─────────────────────────────────────────────────────────────────────────────
@Composable
fun GarageScreen(
    garageVehicles: List<VehicleProfile>,
    activeVehicle: VehicleProfile,
    onSetActive: (VehicleProfile) -> Unit,
    onAddVehicle: (VehicleProfile) -> Unit,
    onRemoveVehicle: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var showPicker by remember { mutableStateOf(false) }

    if (showPicker) {
        VehiclePickerSheet(
            currentVehicleIds = garageVehicles.map { it.id }.toSet(),
            onVehicleSelected = { v ->
                onAddVehicle(v)
            },
            onDismiss = { showPicker = false }
        )
    }

    Column(
        modifier = Modifier
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
                    text = "MY GARAGE",
                    color = VoltCyan,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Text(
                    text = "Your EV Fleet",
                    color = VoltTextPrimary,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            IconButton(onClick = onDismiss) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Close",
                    tint = VoltTextSecondary,
                    modifier = Modifier.size(22.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        if (garageVehicles.isEmpty()) {
            // Empty garage state
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.padding(32.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                            .background(VoltCardElevated)
                            .border(2.dp, VoltCyan, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.DirectionsCar,
                            contentDescription = null,
                            tint = VoltCyan,
                            modifier = Modifier.size(40.dp)
                        )
                    }
                    Text(
                        text = "No Vehicles Yet",
                        color = VoltTextPrimary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        text = "Add your EV from the Indian EV catalog with 30+ models",
                        color = VoltTextSecondary,
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center,
                        lineHeight = 20.sp
                    )
                }
            }
        } else {
            // Garage list
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Text(
                        text = "${garageVehicles.size} vehicle${if (garageVehicles.size != 1) "s" else ""} in your garage",
                        color = VoltTextMuted,
                        fontSize = 12.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                }
                items(garageVehicles) { vehicle ->
                    val isActive = vehicle.id == activeVehicle.id
                    GarageVehicleCard(
                        vehicle = vehicle,
                        isActive = isActive,
                        onSetActive = { onSetActive(vehicle) },
                        onRemove = { onRemoveVehicle(vehicle.id) }
                    )
                }
                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }

        // Add Vehicle button
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(RoundedCornerShape(26.dp))
                .background(
                    Brush.horizontalGradient(listOf(VoltGradientStart, VoltGradientEnd))
                )
                .clickable { showPicker = true },
            contentAlignment = Alignment.Center
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Add Vehicle",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Add Vehicle from Catalog",
                    color = Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
    }
}

// ── Garage vehicle card ───────────────────────────────────────────────────────
@Composable
private fun GarageVehicleCard(
    vehicle: VehicleProfile,
    isActive: Boolean,
    onSetActive: () -> Unit,
    onRemove: () -> Unit
) {
    val category = IndianEvCatalog.categoryMap[vehicle.id] ?: "EV"
    val rangeKm = IndianEvCatalog.araiRange(vehicle)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isActive) VoltCyan.copy(alpha = 0.08f) else VoltCardBg
        ),
        border = BorderStroke(
            width = if (isActive) 1.5.dp else 1.dp,
            color = if (isActive) VoltCyan else VoltCardBorder
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Icon
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(if (isActive) VoltCyan.copy(alpha = 0.15f) else VoltCardElevated),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.DirectionsCar,
                        contentDescription = null,
                        tint = if (isActive) VoltCyan else VoltTextSecondary,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "${vehicle.make} ${vehicle.model}",
                            color = VoltTextPrimary,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        if (isActive) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(VoltEmerald.copy(alpha = 0.15f))
                                    .border(1.dp, VoltEmerald, RoundedCornerShape(6.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "ACTIVE",
                                    color = VoltEmerald,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }
                    Text(
                        text = category,
                        color = VoltTextMuted,
                        fontSize = 11.sp
                    )
                }

                // Remove button (only for non-active)
                if (!isActive) {
                    IconButton(
                        onClick = onRemove,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Remove",
                            tint = VoltRose.copy(alpha = 0.7f),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Spec pills
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                SpecChip("${vehicle.batteryCapacityKWh.toInt()} kWh", VoltAmber)
                SpecChip("~$rangeKm km", VoltEmerald)
                SpecChip("${vehicle.maxChargingPowerKw.toInt()} kW", VoltCyan)
            }

            if (!isActive) {
                Spacer(modifier = Modifier.height(12.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(38.dp)
                        .clip(RoundedCornerShape(19.dp))
                        .border(1.dp, VoltCyan, RoundedCornerShape(19.dp))
                        .clickable { onSetActive() },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Set as Active Vehicle",
                        color = VoltCyan,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}

@Composable
private fun SpecChip(text: String, color: Color) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(color.copy(alpha = 0.10f))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(text = text, color = color, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
    }
}
