// ──────────────────────────────────────────────
// Firebase Cloud Messaging (FCM) Push Notifications
// Sends real-time journey & charging alerts to user devices.
// ──────────────────────────────────────────────

import { firebaseMessaging } from './admin.js';
import { query } from '../../db/client.js';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface NotificationResult {
  sentCount: number;
  failureCount: number;
}

/**
 * Sends a push notification to all active device tokens registered for a user.
 */
export async function sendPushNotification(
  userId: string,
  payload: NotificationPayload
): Promise<NotificationResult> {
  try {
    // 1. Fetch user device tokens from database
    const tokenResult = await query<{ fcm_token: string }>(
      `SELECT fcm_token FROM device_tokens WHERE user_id = $1`,
      [userId]
    );

    if (tokenResult.rows.length === 0) {
      return { sentCount: 0, failureCount: 0 };
    }

    const tokens = tokenResult.rows.map((r) => r.fcm_token);

    // 2. Dispatch multicast message via Firebase Admin SDK
    const response = await firebaseMessaging.sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'volt_journey_alerts',
        },
      },
    });

    // 3. Clean up invalid/unregistered tokens
    const tokensToRemove: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errCode = resp.error.code;
        if (
          errCode === 'messaging/invalid-registration-token' ||
          errCode === 'messaging/registration-token-not-registered'
        ) {
          tokensToRemove.push(tokens[idx]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await query(
        `DELETE FROM device_tokens WHERE user_id = $1 AND fcm_token = ANY($2)`,
        [userId, tokensToRemove]
      );
    }

    return {
      sentCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error: any) {
    console.warn(`⚠️ FCM push notification dispatch failed for user ${userId}:`, error.message);
    return { sentCount: 0, failureCount: 0 };
  }
}

/**
 * Trigger: Trip plan optimized and ready for navigation.
 */
export async function notifyTripPlanReady(
  userId: string,
  tripId: string,
  destination: string
): Promise<NotificationResult> {
  return sendPushNotification(userId, {
    title: '⚡ Trip Plan Ready',
    body: `Your optimized route to ${destination} is ready with charging stops planned.`,
    data: {
      type: 'TRIP_PLAN_READY',
      tripId,
    },
  });
}

/**
 * Trigger: Live conditions require a reroute recommendation.
 */
export async function notifyRerouteAlert(
  userId: string,
  tripId: string,
  reason: string
): Promise<NotificationResult> {
  return sendPushNotification(userId, {
    title: '⚠️ Reroute Recommended',
    body: reason || 'A faster or more reliable charging station was found on your route.',
    data: {
      type: 'REROUTE_RECOMMENDED',
      tripId,
    },
  });
}

/**
 * Trigger: Low battery warning with safety buffer margin.
 */
export async function notifyLowBatteryWarning(
  userId: string,
  currentSoc: number,
  stationName?: string
): Promise<NotificationResult> {
  const stationText = stationName ? ` Head to ${stationName}.` : ' Navigate to nearest charger.';
  return sendPushNotification(userId, {
    title: '🔋 Low Battery Alert',
    body: `Battery at ${currentSoc.toFixed(0)}%.${stationText}`,
    data: {
      type: 'LOW_BATTERY_WARNING',
      currentSoc: currentSoc.toString(),
    },
  });
}

/**
 * Trigger: Prompt driver to submit feedback after charging session.
 */
export async function notifyFeedbackPrompt(
  userId: string,
  stationId: string,
  stationName: string
): Promise<NotificationResult> {
  return sendPushNotification(userId, {
    title: '⭐ How was your charge?',
    body: `Help fellow EV drivers by rating your experience at ${stationName}.`,
    data: {
      type: 'FEEDBACK_PROMPT',
      stationId,
    },
  });
}
