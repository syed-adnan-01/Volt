package com.volt.android.data

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

import kotlinx.coroutines.withTimeoutOrNull

data class UserCoordinates(
    val latitude: Double,
    val longitude: Double
)

object LocationHelper {

    private const val TAG = "LocationHelper"

    /**
     * Checks whether location permissions (Fine or Coarse) are granted.
     */
    fun hasLocationPermission(context: Context): Boolean {
        val fineLocation = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val coarseLocation = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        return fineLocation || coarseLocation
    }

    /**
     * Retrieves the current device location (latitude, longitude) asynchronously.
     */
    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(context: Context): UserCoordinates = withContext(Dispatchers.IO) {
        if (!hasLocationPermission(context)) {
            Log.w(TAG, "Location permission not granted, using default coordinates.")
            return@withContext UserCoordinates(12.9716, 77.5946)
        }

        try {
            val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)

            // 1. Fast check: Last known location from FusedLocationClient
            val fastLocation = withTimeoutOrNull(1000L) {
                try {
                    fusedLocationClient.lastLocation.await()
                } catch (_: Exception) {
                    null
                }
            }
            if (fastLocation != null) {
                return@withContext UserCoordinates(fastLocation.latitude, fastLocation.longitude)
            }

            // 2. Fast check: System LocationManager providers
            val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            if (locationManager != null) {
                val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER)
                for (provider in providers) {
                    try {
                        val loc = locationManager.getLastKnownLocation(provider)
                        if (loc != null) {
                            return@withContext UserCoordinates(loc.latitude, loc.longitude)
                        }
                    } catch (_: Exception) {}
                }
            }

            // 3. Request fresh current location with a strict 2-second timeout
            val freshLocation = withTimeoutOrNull(2000L) {
                val cancellationTokenSource = CancellationTokenSource()
                try {
                    fusedLocationClient.getCurrentLocation(
                        Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                        cancellationTokenSource.token
                    ).await()
                } catch (e: Exception) {
                    Log.d(TAG, "getCurrentLocation error: ${e.message}")
                    null
                }
            }

            if (freshLocation != null) {
                return@withContext UserCoordinates(freshLocation.latitude, freshLocation.longitude)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching current location: ${e.message}", e)
        }

        // 4. Fallback default coordinates for emulator / development if GPS fix is unavailable
        Log.i(TAG, "Using default Bengaluru coordinates for emulator.")
        return@withContext UserCoordinates(12.9716, 77.5946)
    }
}
