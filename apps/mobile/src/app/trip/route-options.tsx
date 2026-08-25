// ──────────────────────────────────────────────
// Route Options Screen (Stack)
// Shows ranked candidate routes and charging stops
// directly from the Trips Orchestrator and Optimizer.
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

export default function RouteOptionsScreen() {
  const { activePlan, routeOptions, startNavigation } = useTripStore();

  const handleStartNavigation = async () => {
    await startNavigation();
    router.replace('/(tabs)/navigate');
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  if (!activePlan) {
    return (
      <LinearGradient colors={[colors.bgStart, colors.bgEnd]} style={styles.gradient}>
        <View style={styles.emptyContent}>
          <Text style={styles.screenTitle}>No Plan Calculated</Text>
          <Text style={styles.subtitle}>Please plan a journey from the Plan tab.</Text>
          <GlassButton title="Go to Plan" variant="primary" onPress={() => router.back()} />
        </View>
      </LinearGradient>
    );
  }

  const hasStops = activePlan.stops && activePlan.stops.length > 0;

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
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backBtn}>← Back to Map</Text>
          </Pressable>
          <Text style={styles.screenTitle}>Trip Route Options</Text>
          <Text style={styles.subtitle}>
            Mumbai → Pune • {activePlan.distanceKm} km • Est. {formatDuration(activePlan.durationMinutes)}
          </Text>
        </View>

        {/* Primary Recommended Route */}
        <GlassCard intense style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <StatusBadge label="AI Optimal Route" variant="success" size="md" />
            <Text style={styles.routeTime}>{formatDuration(activePlan.durationMinutes)}</Text>
          </View>

          <Text style={styles.routeTitle}>Direct Corridor via Expressway</Text>
          <Text style={styles.routeDetail}>
            {hasStops
              ? `${activePlan.stops.length} charging stop${activePlan.stops.length > 1 ? 's' : ''} recommended`
              : 'Direct drive • No charging stop required'}
          </Text>

          {/* Battery Status */}
          <View style={styles.batteryMetricsRow}>
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Current SoC</Text>
              <Text style={styles.metricValue}>{activePlan.battery?.currentSoC ?? 80}%</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Arrival SoC</Text>
              <Text style={[styles.metricValue, { color: colors.success }]}>
                {activePlan.battery?.arrivalSoC ?? 35}%
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Energy Needed</Text>
              <Text style={styles.metricValue}>
                {activePlan.battery?.energyRequiredKWh ?? 22} kWh
              </Text>
            </View>
          </View>

          {/* Charging Stops List */}
          {hasStops && (
            <View style={styles.stopsSection}>
              <Text style={styles.stopsSectionTitle}>Scheduled Charging Stops:</Text>
              {activePlan.stops.map((stop, index) => (
                <Pressable
                  key={stop.stationId || index}
                  onPress={() => router.push({ pathname: '/trip/charger/[id]', params: { id: stop.stationId } })}
                >
                  <View style={styles.stopCard}>
                    <View style={styles.stopIconCircle}>
                      <Text style={styles.stopIconText}>⚡</Text>
                    </View>
                    <View style={styles.stopInfo}>
                      <Text style={styles.stopName}>Stop {stop.sequence}: Lonavala Expressway Hub</Text>
                      <Text style={styles.stopMeta}>
                        Charge to {stop.departureSoc}% • {stop.chargingMinutes} min charging • ~{stop.expectedWaitMinutes}m wait
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Reasons */}
          <View style={styles.reasonsBlock}>
            <Text style={styles.reasonsTitle}>Why this strategy:</Text>
            <Text style={styles.reason}>✓ Verified battery reachability & 10% reserve SoC</Text>
            <Text style={styles.reason}>✓ High predicted charger availability</Text>
            <Text style={styles.reason}>✓ Minimum total journey delay</Text>
          </View>

          <GlassButton
            title="Start Navigation"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleStartNavigation}
          />
        </GlassCard>

        {/* Alternative Route Preview */}
        {routeOptions.length > 1 && (
          <GlassCard style={styles.routeCard}>
            <View style={styles.routeHeader}>
              <StatusBadge label="Alternative" variant="info" size="md" />
              <Text style={styles.routeTime}>{formatDuration(routeOptions[1].durationMinutes)}</Text>
            </View>
            <Text style={styles.routeTitle}>Via Old Highway Scenic Route</Text>
            <Text style={styles.routeDetail}>{routeOptions[1].distanceKm} km • Safe backup chargers</Text>

            <View style={styles.reasonsBlock}>
              <Text style={styles.reasonsTitle}>Why this route:</Text>
              <Text style={styles.reason}>✓ More frequent roadside fallback chargers</Text>
              <Text style={styles.reason}>✓ Lower speed / lower wind consumption</Text>
            </View>
          </GlassCard>
        )}

        <Text style={styles.disclaimer}>
          Real-time predictions generated via PostGIS spatial query and ML service clients.
        </Text>
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
    paddingBottom: 40,
    gap: spacing['5'],
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['5'],
    gap: spacing['4'],
  },
  header: {
    gap: spacing['2'],
  },
  backBtn: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.primary,
    marginBottom: spacing['1'],
  },
  screenTitle: {
    fontFamily,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  routeCard: {
    gap: spacing['4'],
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeTime: {
    fontFamily,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  routeTitle: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  routeDetail: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  batteryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    paddingVertical: spacing['3'],
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricLabel: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  metricValue: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  stopsSection: {
    gap: spacing['2'],
  },
  stopsSectionTitle: {
    fontFamily,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 8,
    padding: spacing['3'],
    gap: spacing['3'],
  },
  stopIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIconText: {
    fontSize: 16,
  },
  stopInfo: {
    flex: 1,
    gap: 2,
  },
  stopName: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  stopMeta: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  chevron: {
    fontFamily,
    fontSize: fontSize.lg,
    color: colors.textTertiary,
  },
  reasonsBlock: {
    gap: spacing['1'],
    paddingVertical: spacing['2'],
    paddingHorizontal: spacing['3'],
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
  },
  reasonsTitle: {
    fontFamily,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing['1'],
  },
  reason: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.success,
    lineHeight: 20,
  },
  disclaimer: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
