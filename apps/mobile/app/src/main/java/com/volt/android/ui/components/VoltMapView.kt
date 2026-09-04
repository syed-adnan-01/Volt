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
    ORIGIN, DESTINATION, CHARGER, WAYPOINT, USER_LOCATION
}

// Clean light-themed map style JSON for Google Maps matching the VOLT light design language
private val VOLT_LIGHT_MAP_STYLE = """
[
  { "elementType": "geometry", "stylers": [{ "color": "#F8FAFC" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#FFFFFF" }, { "weight": 2 }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#64748B" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#1E293B" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#F1F5F9" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#94A3B8" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#ECFDF5" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#10B981" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#FFFFFF" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#E2E8F0" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748B" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#FFFFFF" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#CBD5E1" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#0F172A" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#F1F5F9" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748B" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#E0F2FE" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#0284C7" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#FFFFFF" }] }
]
""".trimIndent()

/**
 * Reusable Compose-wrapped Google Maps view that renders a route polyline with markers.
 * Supports a "preview mode" when no route is calculated yet — shows origin/destination markers
 * and centers the camera between them.
 *
 * @param routePoints Decoded polyline LatLng points from OSRM.
 * @param markers List of route markers (origin, charger stops, destination).
 * @param previewMarkers Markers to show in preview mode (before route calculation).
 * @param mapHeight Height of the map container.
 * @param isInteractive Whether the user can interact (scroll/zoom) with the map.
 */
@Composable
fun VoltMapView(
    routePoints: List<LatLng> = emptyList(),
    markers: List<RouteMarker> = emptyList(),
    previewMarkers: List<RouteMarker> = emptyList(),
    userLocation: LatLng? = null,
    mapHeight: Dp = 320.dp,
    isInteractive: Boolean = true,
    modifier: Modifier = Modifier
) {
    // Determine default camera center: user location, first marker, or India center
    val defaultCenter = userLocation
        ?: markers.firstOrNull()?.position
        ?: previewMarkers.firstOrNull()?.position
        ?: LatLng(20.5937, 78.9629)  // India center as default

    val defaultZoom = if (markers.isEmpty() && previewMarkers.isEmpty()) 5f else 10f

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(defaultCenter, defaultZoom)
    }

    // Auto-fit camera to route bounds or key preview markers (origin/destination)
    LaunchedEffect(routePoints, markers, previewMarkers, userLocation) {
        if (routePoints.size >= 2) {
            // Route mode: fit camera strictly to route polyline + route stop markers
            val boundsBuilder = LatLngBounds.Builder()
            routePoints.forEach { boundsBuilder.include(it) }
            markers.filter {
                it.type == MarkerType.ORIGIN ||
                it.type == MarkerType.DESTINATION ||
                it.type == MarkerType.WAYPOINT
            }.forEach { boundsBuilder.include(it.position) }

            if (userLocation != null) {
                boundsBuilder.include(userLocation)
            }
            try {
                val bounds = boundsBuilder.build()
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngBounds(bounds, 80),
                    durationMs = 800
                )
            } catch (_: Exception) { }
        } else {
            val keyMarkers = previewMarkers.filter {
                it.type == MarkerType.ORIGIN || it.type == MarkerType.DESTINATION
            }
            if (keyMarkers.size >= 2) {
                val boundsBuilder = LatLngBounds.Builder()
                keyMarkers.forEach { boundsBuilder.include(it.position) }
                if (userLocation != null) boundsBuilder.include(userLocation)
                try {
                    val bounds = boundsBuilder.build()
                    cameraPositionState.animate(
                        CameraUpdateFactory.newLatLngBounds(bounds, 100),
                        durationMs = 800
                    )
                } catch (_: Exception) { }
            } else if (keyMarkers.size == 1) {
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngZoom(keyMarkers[0].position, 13f),
                    durationMs = 800
                )
            } else if (userLocation != null) {
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngZoom(userLocation, 14f),
                    durationMs = 800
                )
            }
        }
    }

    val mapStyle = remember {
        try {
            MapStyleOptions(VOLT_LIGHT_MAP_STYLE)
        } catch (_: Exception) {
            null
        }
    }

    Card(
        modifier = modifier,
        shape = if (mapHeight > 0.dp) RoundedCornerShape(16.dp) else RoundedCornerShape(0.dp),
        colors = CardDefaults.cardColors(containerColor = VoltCardBg),
        border = if (mapHeight > 0.dp) BorderStroke(1.dp, VoltCardBorder) else null
    ) {
        Box(
            modifier = if (mapHeight > 0.dp) {
                Modifier
                    .fillMaxWidth()
                    .height(mapHeight)
                    .clip(RoundedCornerShape(16.dp))
            } else {
                Modifier.fillMaxSize()
            }
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
                    compassEnabled = isInteractive,
                    mapToolbarEnabled = false
                )
            ) {
                // Draw route polyline (only when route is calculated)
                if (routePoints.size >= 2) {
                    // Glow/shadow polyline underneath
                    Polyline(
                        points = routePoints,
                        color = VoltCyan.copy(alpha = 0.35f),
                        width = 24f,
                        geodesic = true
                    )
                    // Main route polyline
                    Polyline(
                        points = routePoints,
                        color = VoltCyan,
                        width = 12f,
                        geodesic = true
                    )
                }

                // Draw route markers (when route is calculated)
                markers.forEach { marker ->
                    val hue = when (marker.type) {
                        MarkerType.ORIGIN -> BitmapDescriptorFactory.HUE_CYAN
                        MarkerType.DESTINATION -> BitmapDescriptorFactory.HUE_GREEN
                        MarkerType.CHARGER -> BitmapDescriptorFactory.HUE_ORANGE
                        MarkerType.WAYPOINT -> BitmapDescriptorFactory.HUE_VIOLET
                        MarkerType.USER_LOCATION -> BitmapDescriptorFactory.HUE_AZURE
                    }
                    Marker(
                        state = MarkerState(position = marker.position),
                        title = marker.title,
                        snippet = marker.snippet,
                        icon = BitmapDescriptorFactory.defaultMarker(hue)
                    )
                }

                // Draw preview markers (origin/destination pins before route is calculated)
                if (routePoints.isEmpty()) {
                    previewMarkers.forEach { marker ->
                        val hue = when (marker.type) {
                            MarkerType.ORIGIN -> BitmapDescriptorFactory.HUE_CYAN
                            MarkerType.DESTINATION -> BitmapDescriptorFactory.HUE_GREEN
                            MarkerType.CHARGER -> BitmapDescriptorFactory.HUE_ORANGE
                            MarkerType.WAYPOINT -> BitmapDescriptorFactory.HUE_VIOLET
                            MarkerType.USER_LOCATION -> BitmapDescriptorFactory.HUE_AZURE
                        }
                        Marker(
                            state = MarkerState(position = marker.position),
                            title = marker.title,
                            snippet = marker.snippet,
                            icon = BitmapDescriptorFactory.defaultMarker(hue)
                        )
                    }
                }

                // Draw live GPS user location marker
                if (userLocation != null) {
                    Marker(
                        state = MarkerState(position = userLocation),
                        title = "Current Position",
                        snippet = "Live GPS Navigation",
                        icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE)
                    )
                }
            }
        }
    }
}
