package com.volt.android.data.remote

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.volt.android.MainActivity
import com.volt.android.R

/**
 * Firebase Cloud Messaging service for VOLT.
 *
 * Handles incoming push notifications for:
 * - REROUTE_ALERT: When a reroute is triggered due to conditions change
 * - LOW_BATTERY_WARNING: When battery SoC drops below critical threshold during a trip
 * - STATION_UNAVAILABLE: When a planned charging station becomes unavailable
 * - TRIP_READY: When an AI-optimized trip plan is ready
 * - CHARGING_COMPLETE: When vehicle charging session is complete
 */
class VoltFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "VoltFCM"
        private const val CHANNEL_ID_ALERTS = "volt_alerts"
        private const val CHANNEL_ID_TRIPS = "volt_trips"
        private const val CHANNEL_ID_CHARGING = "volt_charging"
    }

    /**
     * Called when a new FCM registration token is generated.
     * This occurs on first app start and whenever the token is refreshed.
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM token: $token")
        // Store token locally for future backend registration
        getSharedPreferences("volt_prefs", Context.MODE_PRIVATE)
            .edit()
            .putString("fcm_token", token)
            .apply()
        // TODO: Send token to backend via POST /users/me/device-token when API is ready
    }

    /**
     * Called when a message is received from FCM.
     * Handles both data-only and notification+data messages.
     */
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d(TAG, "FCM message received from: ${message.from}")

        val data = message.data
        val notificationType = data["type"] ?: "GENERAL"
        val title = data["title"] ?: message.notification?.title ?: "VOLT Alert"
        val body = data["body"] ?: message.notification?.body ?: "You have a new notification."

        Log.d(TAG, "Notification type: $notificationType, title: $title")

        val channelId = when (notificationType) {
            "REROUTE_ALERT", "LOW_BATTERY_WARNING", "STATION_UNAVAILABLE" -> CHANNEL_ID_ALERTS
            "TRIP_READY" -> CHANNEL_ID_TRIPS
            "CHARGING_COMPLETE" -> CHANNEL_ID_CHARGING
            else -> CHANNEL_ID_ALERTS
        }

        val icon = when (notificationType) {
            "REROUTE_ALERT" -> R.drawable.ic_launcher_foreground
            "LOW_BATTERY_WARNING" -> R.drawable.ic_launcher_foreground
            "STATION_UNAVAILABLE" -> R.drawable.ic_launcher_foreground
            "CHARGING_COMPLETE" -> R.drawable.ic_launcher_foreground
            "TRIP_READY" -> R.drawable.ic_launcher_foreground
            else -> R.drawable.ic_launcher_foreground
        }

        sendNotification(
            channelId = channelId,
            title = title,
            body = body,
            notificationType = notificationType,
            data = data
        )
    }

    /**
     * Creates a notification channel (Android O+) and dispatches a system notification.
     */
    private fun sendNotification(
        channelId: String,
        title: String,
        body: String,
        notificationType: String,
        data: Map<String, String>
    ) {
        // Create intent to open the app when notification is tapped
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("notification_type", notificationType)
            // Pass along relevant data for deep navigation
            data["trip_id"]?.let { putExtra("trip_id", it) }
            data["station_id"]?.let { putExtra("station_id", it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setContentIntent(pendingIntent)
            .setPriority(
                when (notificationType) {
                    "REROUTE_ALERT", "LOW_BATTERY_WARNING" -> NotificationCompat.PRIORITY_HIGH
                    else -> NotificationCompat.PRIORITY_DEFAULT
                }
            )
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))

        // Add colored accent based on notification type
        val accentColor = when (notificationType) {
            "REROUTE_ALERT" -> 0xFFF59E0B.toInt()        // VoltAmber
            "LOW_BATTERY_WARNING" -> 0xFFEF4444.toInt()   // VoltRose
            "STATION_UNAVAILABLE" -> 0xFFF59E0B.toInt()   // VoltAmber
            "TRIP_READY" -> 0xFF00E5FF.toInt()            // VoltCyan
            "CHARGING_COMPLETE" -> 0xFF10B981.toInt()     // VoltEmerald
            else -> 0xFF00E5FF.toInt()                    // VoltCyan
        }
        notificationBuilder.color = accentColor

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create notification channels for Android O+
        createNotificationChannels(notificationManager)

        // Use notification type hash as notification ID to avoid overwriting different types
        val notificationId = notificationType.hashCode() + System.currentTimeMillis().toInt()
        notificationManager.notify(notificationId, notificationBuilder.build())
    }

    /**
     * Creates the required notification channels for Android O (API 26+).
     * Channels are idempotent — calling this multiple times is safe.
     */
    private fun createNotificationChannels(notificationManager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val alertsChannel = NotificationChannel(
                CHANNEL_ID_ALERTS,
                "Route & Safety Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Reroute alerts, low battery warnings, and station availability changes"
                enableVibration(true)
                enableLights(true)
                lightColor = 0xFFF59E0B.toInt()
            }

            val tripsChannel = NotificationChannel(
                CHANNEL_ID_TRIPS,
                "Trip Updates",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Trip planning results and route optimization updates"
            }

            val chargingChannel = NotificationChannel(
                CHANNEL_ID_CHARGING,
                "Charging Notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Charging session completion and status updates"
            }

            notificationManager.createNotificationChannel(alertsChannel)
            notificationManager.createNotificationChannel(tripsChannel)
            notificationManager.createNotificationChannel(chargingChannel)
        }
    }
}
