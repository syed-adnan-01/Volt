// ──────────────────────────────────────────────
// Navigate Screen — Live Navigation & Rerouting
// Shows active journey stats, battery tracking,
// next charging stop with queue predictions, and
// interactive rerouting trigger.
// ──────────────────────────────────────────────

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { GlassCard, GlassButton, StatusBadge } from '@/components/ui';
import { colors, fontFamily, fontSize, fontWeight, spacing } from '@/theme';
import { useTripStore } from '@/state/tripStore';
import { useVehicleStore } from '@/state/vehicleStore';

export default function NavigateScreen() {
  const { activePlan, status, rerouteEvents, triggerReroute, completeTrip } = useTripStore();
  const { selectedVehicle, simulatedSoC } = useVehicleStore();

  const isNavigating = status === 'navigating' && activePlan !== null;

  const nextStop = activePlan?.stops && activePlan.stops.length > 0 ? activePlan.stops[0] : null;

  return (
    <LinearGradient
      colors={[colors.bgStart, colors.bgEnd]}
      style={styles.gradient}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Live Navigation</Text>
          {isNavigating && (
            <StatusBadge label="En Route (Active)" variant="success" size="md" />
          )}
        </View>

        {!isNavigating ? (
          // ── Empty State ────────────────────
          <View style={styles.emptyState}>
            <GlassCard intense style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🧭</Text>
              <Text style={styles.emptyTitle}>No Active Journey</Text>
              <Text style={styles.emptySubtitle}>
                Plan an EV trip to unlock live corridor guidance, battery monitoring, and proactive AI rerouting.
              </Text>
              <GlassButton
                title="Plan a Trip"
                variant="primary"
                size="md"
                onPress={() => router.push('/(tabs)/plan')}
              />
            </GlassCard>
          </View>
        ) : (
          // ── Active Navigation State ────────
          <View style={styles.activeContent}>
            {/* Reroute Alert Notification Banner */}
            {rerouteEvents.length > 0 && (
              <GlassCard style={styles.rerouteAlertCard}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertIcon}>⚡</Text>
                  <Text style={styles.alertTitle}>Smart Reroute Event</Text>
                </View>
                <Text style={styles.alertMessage}>
                  {rerouteEvents[rerouteEvents.length - 1].message}
                </Text>
              </GlassCard>
            )}

            {/* Main Navigation HUD */}
            <GlassCard intense style={styles.hudCard}>
              <View style={styles.hudHeader}>
                <View>
                  <Text style={styles.hudNextTurn}>In 12 km, continue on Expressway</Text>
                  <Text style={styles.hudDestination}>Destination: Pune Highway Corridor</Text>
                </View>
                <StatusBadge label="On Track" variant="info" size="sm" />
              </View>

              <View style={styles.hudMetricsRow}>
                <View style={styles.hudMetric}>
                  <Text style={styles.hudMetricVal}>92 km/h</Text>
                  <Text style={styles.hudMetricLabel}>Current Speed</Text>
                </View>
                <View style={styles.hudDivider} />
                <View style={styles.hudMetric}>
                  <Text style={styles.hudMetricVal}>{activePlan.distanceKm} km</Text>
                  <Text style={styles.hudMetricLabel}>Remaining Dist.</Text>
                </View>
                <View style={styles.hudDivider} />
                <View style={styles.hudMetric}>
                  <Text style={styles.hudMetricVal}>1h 40m</Text>
                  <Text style={styles.hudMetricLabel}>ETA</Text>
                </View>
              </View>
            </GlassCard>

            {/* Battery & SoC Status */}
            <GlassCard style={styles.batteryCard}>
              <Text style={styles.sectionTitle}>Battery Telemetry</Text>
              <View style={styles.telemetryRow}>
                <View style={styles.batterySocBlock}>
                  <Text style={styles.batterySocValue}>{simulatedSoC}%</Text>
                  <Text style={styles.batterySocLabel}>Current SoC</Text>
                </View>
                <View style={styles.telemetryInfo}>
                  <Text style={styles.telemetryText}>
                    🚗 {selectedVehicle?.make} {selectedVehicle?.model}
                  </Text>
                  <Text style={styles.telemetrySubtext}>
                    Arrival SoC est: <Text style={{ color: colors.success }}>{activePlan.battery?.arrivalSoC ?? 35}%</Text>
                  </Text>
                  <Text style={styles.telemetrySubtext}>
                    Reserve Buffer: {selectedVehicle?.reserve_soc_percent ?? 10}%
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Next Charging Stop */}
            {nextStop ? (
              <GlassCard style={styles.chargerCard}>
                <Text style={styles.sectionTitle}>Next Planned Charging Stop</Text>
                <Pressable
                  onPress={() => router.push({ pathname: '/trip/charger/[id]', params: { id: nextStop.stationId } })}
                >
                  <View style={styles.chargerInfoRow}>
                    <View style={styles.chargerIcon}>
                      <Text style={{ fontSize: 20 }}>⚡</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.chargerName}>Stop 1: Lonavala Supercharger</Text>
                      <Text style={styles.chargerDetails}>
                        Target Charge: {nextStop.departureSoc}% • {nextStop.chargingMinutes} min charging
                      </Text>
                      <Text style={styles.chargerQueue}>
                        Predicted Wait: ~{nextStop.expectedWaitMinutes} mins • High Availability
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </Pressable>
              </GlassCard>
            ) : (
              <GlassCard style={styles.chargerCard}>
                <Text style={styles.sectionTitle}>Charging Strategy</Text>
                <Text style={styles.noStopsText}>
                  Direct journey! Your EV has ample battery to reach the destination without stopping.
                </Text>
              </GlassCard>
            )}

            {/* Controls */}
            <View style={styles.controlsRow}>
              <GlassButton
                title="⚡ Simulate Reroute (Watchdog)"
                variant="glass"
                size="md"
                fullWidth
                onPress={triggerReroute}
              />
              <GlassButton
                title="End & Complete Trip"
                variant="primary"
                size="lg"
                fullWidth
                onPress={completeTrip}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['16'],
    paddingBottom: 120,
    gap: spacing['5'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontFamily,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  emptyState: {
    gap: spacing['6'],
    marginTop: spacing['8'],
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing['4'],
    paddingVertical: spacing['8'],
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.6,
  },
  emptyTitle: {
    fontFamily,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing['4'],
  },
  activeContent: {
    gap: spacing['4'],
  },
  rerouteAlertCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: colors.primary,
    borderWidth: 1,
    gap: spacing['1'],
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
  },
  alertIcon: {
    fontSize: 16,
  },
  alertTitle: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  alertMessage: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
  },
  hudCard: {
    gap: spacing['4'],
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  hudNextTurn: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  hudDestination: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  hudMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    paddingVertical: spacing['3'],
  },
  hudMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  hudMetricVal: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  hudMetricLabel: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  hudDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionTitle: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing['2'],
  },
  batteryCard: {},
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['4'],
  },
  batterySocBlock: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batterySocValue: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  batterySocLabel: {
    fontFamily,
    fontSize: 9,
    color: colors.textSecondary,
  },
  telemetryInfo: {
    flex: 1,
    gap: 3,
  },
  telemetryText: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  telemetrySubtext: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  chargerCard: {},
  chargerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  chargerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargerName: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  chargerDetails: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  chargerQueue: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.success,
  },
  noStopsText: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  chevron: {
    fontFamily,
    fontSize: fontSize.lg,
    color: colors.textTertiary,
  },
  controlsRow: {
    gap: spacing['3'],
    marginTop: spacing['2'],
  },
});
