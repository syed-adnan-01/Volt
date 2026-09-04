package com.volt.android.ui.components

import android.Manifest
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.volt.android.data.LocationHelper
import com.volt.android.data.LocationSearchService
import com.volt.android.data.PlaceSuggestion
import com.volt.android.ui.theme.VoltCardBg
import com.volt.android.ui.theme.VoltCardBorder
import com.volt.android.ui.theme.VoltCardElevated
import com.volt.android.ui.theme.VoltCyan
import com.volt.android.ui.theme.VoltEmerald
import com.volt.android.ui.theme.VoltTextMuted
import com.volt.android.ui.theme.VoltTextPrimary
import com.volt.android.ui.theme.VoltTextSecondary
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun LocationInputField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    onLocationSelected: (PlaceSuggestion) -> Unit,
    leadingIcon: ImageVector,
    iconTint: Color,
    modifier: Modifier = Modifier,
    isStartingLocation: Boolean = false,
    onCurrentLocationAcquired: ((Double, Double, String) -> Unit)? = null
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var suggestions by remember { mutableStateOf<List<PlaceSuggestion>>(emptyList()) }
    var isSearching by remember { mutableStateOf(false) }
    var isLocatingCurrent by remember { mutableStateOf(false) }
    var isFocused by remember { mutableStateOf(false) }
    var searchJob by remember { mutableStateOf<Job?>(null) }

    // Helper to fetch device current location
    fun fetchCurrentLocation() {
        scope.launch {
            isLocatingCurrent = true
            val coords = LocationHelper.getCurrentLocation(context)
            if (coords != null) {
                val readableName = LocationSearchService.reverseGeocode(context, coords.latitude, coords.longitude)
                onValueChange(readableName)
                onCurrentLocationAcquired?.invoke(coords.latitude, coords.longitude, readableName)
                suggestions = emptyList()
            } else {
                Toast.makeText(
                    context,
                    "Unable to acquire GPS location. Please check location settings.",
                    Toast.LENGTH_SHORT
                ).show()
            }
            isLocatingCurrent = false
        }
    }

    // Permission launcher for Location access
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (fineGranted || coarseGranted) {
            fetchCurrentLocation()
        } else {
            Toast.makeText(
                context,
                "Location permission is required to use Current Location.",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    // Query autocomplete recommendations with 200ms debounce
    LaunchedEffect(value, isFocused) {
        if (!isFocused || value.trim().length < 2) {
            suggestions = emptyList()
            isSearching = false
            return@LaunchedEffect
        }

        searchJob?.cancel()
        searchJob = scope.launch {
            delay(200)
            isSearching = true
            try {
                val results = LocationSearchService.searchLocations(context, value)
                suggestions = results
            } catch (_: Exception) {
                suggestions = emptyList()
            } finally {
                isSearching = false
            }
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = value,
            onValueChange = {
                onValueChange(it)
            },
            label = { Text(label, color = VoltTextSecondary) },
            leadingIcon = {
                Icon(leadingIcon, contentDescription = label, tint = iconTint)
            },
            trailingIcon = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (isSearching || isLocatingCurrent) {
                        CircularProgressIndicator(
                            color = VoltCyan,
                            strokeWidth = 2.dp,
                            modifier = Modifier
                                .size(18.dp)
                                .padding(end = 4.dp)
                        )
                    }

                    if (isStartingLocation && !isLocatingCurrent) {
                        IconButton(
                            onClick = {
                                if (LocationHelper.hasLocationPermission(context)) {
                                    fetchCurrentLocation()
                                } else {
                                    permissionLauncher.launch(
                                        arrayOf(
                                            Manifest.permission.ACCESS_FINE_LOCATION,
                                            Manifest.permission.ACCESS_COARSE_LOCATION
                                        )
                                    )
                                }
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.MyLocation,
                                contentDescription = "Use Current Location",
                                tint = VoltCyan,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    } else if (value.isNotEmpty()) {
                        IconButton(
                            onClick = {
                                onValueChange("")
                                suggestions = emptyList()
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Clear",
                                tint = VoltTextMuted,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = VoltTextPrimary,
                unfocusedTextColor = VoltTextPrimary,
                focusedBorderColor = iconTint,
                unfocusedBorderColor = VoltCardBorder
            ),
            modifier = Modifier
                .fillMaxWidth()
                .onFocusChanged { focusState ->
                    isFocused = focusState.isFocused
                }
        )

        // Quick "Use Current Location" chip option for Starting Location
        if (isStartingLocation && isFocused && value.isBlank()) {
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(VoltCardElevated)
                    .clickable {
                        if (LocationHelper.hasLocationPermission(context)) {
                            fetchCurrentLocation()
                        } else {
                            permissionLauncher.launch(
                                arrayOf(
                                    Manifest.permission.ACCESS_FINE_LOCATION,
                                    Manifest.permission.ACCESS_COARSE_LOCATION
                                )
                            )
                        }
                    }
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.MyLocation,
                    contentDescription = "Current Location",
                    tint = VoltCyan,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (isLocatingCurrent) "Acquiring GPS location..." else "📍 Use My Current Location",
                    color = VoltCyan,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        // Suggestions Dropdown Card
        AnimatedVisibility(
            visible = isFocused && suggestions.isNotEmpty(),
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically()
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = VoltCardElevated),
                border = BorderStroke(1.dp, VoltCardBorder)
            ) {
                Column(modifier = Modifier.padding(vertical = 4.dp)) {
                    suggestions.forEachIndexed { index, suggestion ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    onValueChange(suggestion.fullDisplayName)
                                    onLocationSelected(suggestion)
                                    suggestions = emptyList()
                                }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .background(VoltCardBg, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (isStartingLocation) Icons.Default.Place else Icons.Default.LocationOn,
                                    contentDescription = "Place",
                                    tint = iconTint,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = suggestion.name,
                                    color = VoltTextPrimary,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                if (suggestion.secondaryText.isNotBlank()) {
                                    Text(
                                        text = suggestion.secondaryText,
                                        color = VoltTextSecondary,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }

                        if (index < suggestions.lastIndex) {
                            HorizontalDivider(
                                color = VoltCardBorder.copy(alpha = 0.5f),
                                thickness = 0.5.dp,
                                modifier = Modifier.padding(horizontal = 12.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
