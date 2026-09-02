package com.volt.android.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UserProfile(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("email") val email: String,
    @SerialName("phone") val phone: String? = null,
    @SerialName("role") val role: String = "driver",
    @SerialName("token") val token: String = "",
    @SerialName("is_guest") val isGuest: Boolean = false,
    @SerialName("preferred_vehicle_id") val preferredVehicleId: String? = null
)

enum class AuthTab {
    SIGN_IN,
    SIGN_UP
}
