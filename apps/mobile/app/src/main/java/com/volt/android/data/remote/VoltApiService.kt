package com.volt.android.data.remote

import com.volt.android.data.remote.dto.CreateVehicleRequest
import com.volt.android.data.remote.dto.DeviceTokenRequest
import com.volt.android.data.remote.dto.FeedbackDto
import com.volt.android.data.remote.dto.FeedbackRequest
import com.volt.android.data.remote.dto.StandardResponse
import com.volt.android.data.remote.dto.StationDto
import com.volt.android.data.remote.dto.StationPredictionDto
import com.volt.android.data.remote.dto.StationStatusDto
import com.volt.android.data.remote.dto.TripPlanDto
import com.volt.android.data.remote.dto.TripPlanRequest
import com.volt.android.data.remote.dto.UpdateTripStatusRequest
import com.volt.android.data.remote.dto.UpdateUserRequest
import com.volt.android.data.remote.dto.UserDto
import com.volt.android.data.remote.dto.VehicleDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface VoltApiService {

    // ── Health ─────────────────────────────────
    @GET("health")
    suspend fun getHealth(): Response<StandardResponse<Map<String, String>>>

    // ── Users & Auth ───────────────────────────
    @GET("users/me")
    suspend fun getCurrentUser(): Response<StandardResponse<UserDto>>

    @PATCH("users/me")
    suspend fun updateCurrentUser(
        @Body request: UpdateUserRequest
    ): Response<StandardResponse<UserDto>>

    @POST("users/me/device-token")
    suspend fun registerDeviceToken(
        @Body request: DeviceTokenRequest
    ): Response<StandardResponse<Map<String, Boolean>>>

    @DELETE("users/me/device-token")
    suspend fun deleteDeviceToken(
        @Body request: DeviceTokenRequest
    ): Response<StandardResponse<Map<String, Boolean>>>

    // ── Vehicles ───────────────────────────────
    @GET("vehicles")
    suspend fun getVehicles(): Response<StandardResponse<List<VehicleDto>>>

    @POST("vehicles")
    suspend fun createVehicle(
        @Body request: CreateVehicleRequest
    ): Response<StandardResponse<VehicleDto>>

    @GET("vehicles/{id}")
    suspend fun getVehicle(
        @Path("id") id: String
    ): Response<StandardResponse<VehicleDto>>

    @PATCH("vehicles/{id}")
    suspend fun updateVehicle(
        @Path("id") id: String,
        @Body request: CreateVehicleRequest
    ): Response<StandardResponse<VehicleDto>>

    @DELETE("vehicles/{id}")
    suspend fun deleteVehicle(
        @Path("id") id: String
    ): Response<StandardResponse<Map<String, Boolean>>>

    // ── Stations & Feedback ────────────────────
    @GET("stations")
    suspend fun searchStations(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("radiusKm") radiusKm: Double = 5.0
    ): Response<StandardResponse<List<StationDto>>>

    @GET("stations/{id}")
    suspend fun getStation(
        @Path("id") id: String
    ): Response<StandardResponse<StationDto>>

    @GET("stations/{id}/status")
    suspend fun getStationStatus(
        @Path("id") id: String
    ): Response<StandardResponse<StationStatusDto>>

    @GET("stations/{id}/predictions")
    suspend fun getStationPredictions(
        @Path("id") id: String
    ): Response<StandardResponse<StationPredictionDto>>

    @POST("stations/{id}/feedback")
    suspend fun submitFeedback(
        @Path("id") id: String,
        @Body request: FeedbackRequest
    ): Response<StandardResponse<FeedbackDto>>

    // ── Multi-Stop Trips ───────────────────────
    @POST("trips")
    suspend fun planTrip(
        @Body request: TripPlanRequest
    ): Response<StandardResponse<TripPlanDto>>

    @GET("trips/{id}")
    suspend fun getTrip(
        @Path("id") id: String
    ): Response<StandardResponse<TripPlanDto>>

    @POST("trips/{id}/reroute")
    suspend fun rerouteTrip(
        @Path("id") id: String
    ): Response<StandardResponse<TripPlanDto>>

    @PATCH("trips/{id}/status")
    suspend fun updateTripStatus(
        @Path("id") id: String,
        @Body request: UpdateTripStatusRequest
    ): Response<StandardResponse<Map<String, String>>>
}
