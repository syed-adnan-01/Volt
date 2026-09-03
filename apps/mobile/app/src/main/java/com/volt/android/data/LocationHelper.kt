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
    suspend fun getCurrentLocation(context: Context): UserCoordinates? = withContext(Dispatchers.IO) {
        if (!hasLocationPermission(context)) {
            Log.w(TAG, "Location permission not granted.")
            return@withContext null
        }

        try {
            val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
            val cancellationTokenSource = CancellationTokenSource()

            // 1. Try to get current high-accuracy location
            val location: Location? = try {
                fusedLocationClient.getCurrentLocation(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    cancellationTokenSource.token
                ).await()
            } catch (e: Exception) {
                Log.d(TAG, "getCurrentLocation failed, trying lastLocation: ${e.message}")
                fusedLocationClient.lastLocation.await()
            }

            if (location != null) {
                return@withContext UserCoordinates(location.latitude, location.longitude)
            }

            // 2. Fallback to system LocationManager if Play Services returned null
            val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            if (locationManager != null) {
                val providers = locationManager.getProviders(true)
                for (provider in providers) {
                    val loc = locationManager.getLastKnownLocation(provider)
                    if (loc != null) {
                        return@withContext UserCoordinates(loc.latitude, loc.longitude)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching current location: ${e.message}", e)
        }

        return@withContext null
    }
}
