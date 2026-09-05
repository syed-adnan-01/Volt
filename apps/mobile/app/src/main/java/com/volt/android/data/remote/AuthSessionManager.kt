package com.volt.android.data.remote

import android.content.Context
import android.content.SharedPreferences
import com.volt.android.data.models.UserProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.Json

object AuthSessionManager {

    private const val PREFS_NAME = "volt_auth_prefs"
    private const val KEY_USER_PROFILE = "current_user_profile"
    private const val KEY_AUTH_TOKEN = "current_auth_token"

    private var sharedPreferences: SharedPreferences? = null
    private val json = Json { ignoreUnknownKeys = true; isLenient = true; encodeDefaults = true }

    private val _currentUser = MutableStateFlow<UserProfile?>(null)
    val currentUser: StateFlow<UserProfile?> = _currentUser.asStateFlow()

    private val _isAuthenticated = MutableStateFlow<Boolean>(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()

    val currentToken: String?
        get() = _currentUser.value?.token ?: sharedPreferences?.getString(KEY_AUTH_TOKEN, null)

    fun init(context: Context) {
        sharedPreferences = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        loadSavedSession()
    }

    private fun loadSavedSession() {
        val prefs = sharedPreferences ?: return
        val savedJson = prefs.getString(KEY_USER_PROFILE, null)
        if (!savedJson.isNullOrBlank()) {
            try {
                val profile = json.decodeFromString(UserProfile.serializer(), savedJson)
                // Disallow demo/guest sessions from bypassing login
                if (profile.isGuest || profile.token?.startsWith("demo-") == true) {
                    signOut()
                } else {
                    _currentUser.value = profile
                    _isAuthenticated.value = true
                }
            } catch (e: Exception) {
                // If decoding fails, reset session
                _currentUser.value = null
                _isAuthenticated.value = false
            }
        } else {
            _currentUser.value = null
            _isAuthenticated.value = false
        }
    }

    fun signInWithEmail(email: String, password: String): Result<UserProfile> {
        val trimmedEmail = email.trim()
        if (trimmedEmail.isBlank() || !android.util.Patterns.EMAIL_ADDRESS.matcher(trimmedEmail).matches()) {
            return Result.failure(IllegalArgumentException("Please enter a valid email address."))
        }
        if (password.length < 6) {
            return Result.failure(IllegalArgumentException("Password must be at least 6 characters."))
        }

        val nameFromEmail = trimmedEmail.substringBefore("@").replace(".", " ")
            .split(" ").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }

        val token = "user-token-${trimmedEmail.hashCode()}-${System.currentTimeMillis()}"
        val profile = UserProfile(
            id = "user-${trimmedEmail.hashCode().toString().takeLast(6)}",
            name = if (nameFromEmail.isNotBlank()) nameFromEmail else "Volt Driver",
            email = trimmedEmail,
            role = "driver",
            token = token,
            isGuest = false,
            preferredVehicleId = "v1"
        )

        saveSession(profile)
        return Result.success(profile)
    }

    fun signUp(
        name: String,
        email: String,
        password: String,
        preferredVehicleId: String? = "v1"
    ): Result<UserProfile> {
        val trimmedName = name.trim()
        val trimmedEmail = email.trim()

        if (trimmedName.isBlank()) {
            return Result.failure(IllegalArgumentException("Please enter your name."))
        }
        if (trimmedEmail.isBlank() || !android.util.Patterns.EMAIL_ADDRESS.matcher(trimmedEmail).matches()) {
            return Result.failure(IllegalArgumentException("Please enter a valid email address."))
        }
        if (password.length < 6) {
            return Result.failure(IllegalArgumentException("Password must be at least 6 characters long."))
        }

        val token = "user-token-${trimmedEmail.hashCode()}-${System.currentTimeMillis()}"
        val profile = UserProfile(
            id = "user-${System.currentTimeMillis().toString().takeLast(6)}",
            name = trimmedName,
            email = trimmedEmail,
            role = "driver",
            token = token,
            isGuest = false,
            preferredVehicleId = preferredVehicleId ?: "v1"
        )

        saveSession(profile)
        return Result.success(profile)
    }

    fun signInWithGoogleAccount(
        name: String,
        email: String,
        idToken: String? = null
    ): Result<UserProfile> {
        val trimmedEmail = email.trim()
        if (trimmedEmail.isBlank()) {
            return Result.failure(IllegalArgumentException("Google account email is missing."))
        }
        val displayName = if (name.isNotBlank()) name.trim() else trimmedEmail.substringBefore("@")
        val token = if (!idToken.isNullOrBlank()) idToken else "google-token-${trimmedEmail.hashCode()}-${System.currentTimeMillis()}"
        val profile = UserProfile(
            id = "google-user-${trimmedEmail.hashCode().toString().takeLast(8)}",
            name = displayName,
            email = trimmedEmail,
            role = "driver",
            token = token,
            isGuest = false,
            preferredVehicleId = "v1"
        )
        saveSession(profile)
        return Result.success(profile)
    }

    fun signInWithGoogle(): Result<UserProfile> {
        return Result.failure(IllegalStateException("Please authenticate using the Google Sign-In option."))
    }

    fun signOut() {
        _currentUser.value = null
        _isAuthenticated.value = false
        sharedPreferences?.edit()?.clear()?.apply()
    }

    private fun saveSession(profile: UserProfile) {
        _currentUser.value = profile
        _isAuthenticated.value = true
        try {
            val encoded = json.encodeToString(UserProfile.serializer(), profile)
            sharedPreferences?.edit()
                ?.putString(KEY_USER_PROFILE, encoded)
                ?.putString(KEY_AUTH_TOKEN, profile.token)
                ?.apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
