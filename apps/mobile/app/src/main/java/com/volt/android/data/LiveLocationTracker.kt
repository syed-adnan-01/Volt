package com.volt.android.data

import android.annotation.SuppressLint
import android.content.Context
import android.os.Looper
import android.util.Log
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.model.LatLng
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

/**
 * Continuous GPS tracker for active EV trips.
 *
 * Wraps [FusedLocationProviderClient] with a coroutine [callbackFlow],
 * requesting high-accuracy updates every 5 seconds (or 5m movement)
 * only while a trip is actively navigating.
 */
class LiveLocationTracker(
    private val context: Context,
    private val fusedLocationClient: FusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(context)
) {
    companion object {
        private const val TAG = "LiveLocationTracker"
        private const val UPDATE_INTERVAL_MS = 5000L
        private const val MIN_UPDATE_INTERVAL_MS = 2000L
        private const val MIN_DISPLACEMENT_METERS = 5f
    }

    /**
     * Emits continuous location updates as a Kotlin Flow when a trip is active.
     */
    fun trackLocation(): Flow<LatLng> = getLocationUpdates()

    @SuppressLint("MissingPermission")
    fun getLocationUpdates(): Flow<LatLng> = callbackFlow {
        if (!LocationHelper.hasLocationPermission(context)) {
            Log.w(TAG, "Location permission not granted, closing location flow.")
            close()
            return@callbackFlow
        }

        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            UPDATE_INTERVAL_MS
        ).apply {
            setMinUpdateIntervalMillis(MIN_UPDATE_INTERVAL_MS)
            setMinUpdateDistanceMeters(MIN_DISPLACEMENT_METERS)
            setWaitForAccurateLocation(false)
        }.build()

        val locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                for (location in result.locations) {
                    val latLng = LatLng(location.latitude, location.longitude)
                    trySend(latLng)
                }
            }
        }

        try {
            Log.d(TAG, "Starting live trip location updates.")
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting live location updates: ${e.message}", e)
            close(e)
        }

        awaitClose {
            Log.d(TAG, "Stopping live trip location updates.")
            try {
                fusedLocationClient.removeLocationUpdates(locationCallback)
            } catch (e: Exception) {
                Log.e(TAG, "Error removing location updates: ${e.message}", e)
            }
        }
    }
}
