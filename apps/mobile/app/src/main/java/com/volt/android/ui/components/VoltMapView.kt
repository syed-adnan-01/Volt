package com.volt.android.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapType
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.Polyline
import com.google.maps.android.compose.rememberCameraPositionState
import com.volt.android.ui.theme.VoltAmber
import com.volt.android.ui.theme.VoltCardBg
import com.volt.android.ui.theme.VoltCardBorder
import com.volt.android.ui.theme.VoltCyan
import com.volt.android.ui.theme.VoltEmerald
import com.volt.android.ui.theme.VoltTextSecondary

/**
 * Data class representing a map marker for a stop on the route.
 */
data class RouteMarker(
    val position: LatLng,
    val title: String,
    val snippet: String = "",
    val type: MarkerType = MarkerType.WAYPOINT
)

enum class MarkerType {
    ORIGIN, DESTINATION, CHARGER, WAYPOINT
}

// Dark-themed map style JSON for Google Maps matching the VOLT design language
private val VOLT_DARK_MAP_STYLE = """
[
  { "elementType": "geometry", "stylers": [{ "color": "#0B0F19" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0B0F19" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#64748B" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#94A3B8" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748B" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#131C2E" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#10B981" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1A263D" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#22324E" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#94A3B8" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#22324E" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1A263D" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#F9FAFB" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#1A263D" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#94A3B8" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#131C2E" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#00B4D8" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#0B0F19" }] }
]
""".trimIndent()

/**
 * Reusable Compose-wrapped Google Maps view that renders a route polyline with markers.
 *
 * @param routePoints Decoded polyline LatLng points from OSRM.
 * @param markers List of route markers (origin, charger stops, destination).
 * @param mapHeight Height of the map container.
 * @param isInteractive Whether the user can interact (scroll/zoom) with the map.
 */
@Composable
fun VoltMapView(
    routePoints: List<LatLng>,
    markers: List<RouteMarker> = emptyList(),
    mapHeight: Dp = 280.dp,
    isInteractive: Boolean = true,
    modifier: Modifier = Modifier
) {
    val cameraPositionState = rememberCameraPositionState {
        // Default to US center if no route points
        position = CameraPosition.fromLatLngZoom(
            LatLng(37.7749, -122.4194), 6f
        )
    }

    // Auto-fit camera to route bounds when route points change
    LaunchedEffect(routePoints) {
        if (routePoints.size >= 2) {
            val boundsBuilder = LatLngBounds.Builder()
            routePoints.forEach { boundsBuilder.include(it) }
            markers.forEach { boundsBuilder.include(it.position) }
            try {
                val bounds = boundsBuilder.build()
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngBounds(bounds, 80),
                    durationMs = 800
                )
            } catch (_: Exception) {
                // Fallback if bounds computation fails
            }
        }
    }

    val mapStyle = remember {
        try {
            MapStyleOptions(VOLT_DARK_MAP_STYLE)
        } catch (_: Exception) {
            null
        }
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = VoltCardBg),
        border = BorderStroke(1.dp, VoltCardBorder)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(mapHeight)
                .clip(RoundedCornerShape(16.dp))
        ) {
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                properties = MapProperties(
                    mapType = MapType.NORMAL,
                    mapStyleOptions = mapStyle,
                    isMyLocationEnabled = false
                ),
                uiSettings = MapUiSettings(
                    zoomControlsEnabled = isInteractive,
                    scrollGesturesEnabled = isInteractive,
                    zoomGesturesEnabled = isInteractive,
                    rotationGesturesEnabled = isInteractive,
                    tiltGesturesEnabled = false,
                    compassEnabled = false,
                    mapToolbarEnabled = false
                )
            ) {
                // Draw route polyline
                if (routePoints.size >= 2) {
                    Polyline(
                        points = routePoints,
                        color = VoltCyan,
                        width = 12f
                    )
                    // Draw a subtle glow/shadow polyline underneath
                    Polyline(
                        points = routePoints,
                        color = VoltCyan.copy(alpha = 0.3f),
                        width = 22f
                    )
                }

                // Draw markers
                markers.forEach { marker ->
                    val hue = when (marker.type) {
                        MarkerType.ORIGIN -> BitmapDescriptorFactory.HUE_CYAN
                        MarkerType.DESTINATION -> BitmapDescriptorFactory.HUE_GREEN
                        MarkerType.CHARGER -> BitmapDescriptorFactory.HUE_ORANGE
                        MarkerType.WAYPOINT -> BitmapDescriptorFactory.HUE_VIOLET
                    }
                    Marker(
                        state = MarkerState(position = marker.position),
                        title = marker.title,
                        snippet = marker.snippet,
                        icon = BitmapDescriptorFactory.defaultMarker(hue)
                    )
                }
            }
        }
    }
}
