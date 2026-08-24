// ──────────────────────────────────────────────
// Home Screen
// Hero card, dynamic vehicle list, "+ Add EV" CTA.
// ──────────────────────────────────────────────

import React, { useEffect } from 'react';
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
import { useVehicleStore } from '@/state/vehicleStore';
import { useAuthStore } from '@/state/authStore';

// ── Battery Ring ─────────────────────────────
function BatteryRing({ soc, size = 64 }: { soc: number; size?: number }) {
  const color = soc > 50 ? colors.success : soc > 20 ? colors.warning : colors.danger;
  return (
    <View
      style={[
        styles.batteryRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
        },
      ]}
    >
      <Text style={[styles.batteryText, { color, fontSize: size * 0.28 }]}>
        {soc}%
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { vehicles, selectedVehicle, selectVehicle, simulatedSoC, fetchVehicles } = useVehicleStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchVehicles();
  }, []);

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
          <Text style={styles.greeting}>
            {user ? `Welcome back, ${user.name || 'Driver'}` : 'Good day'}
          </Text>
          <Text style={styles.title}>VOLT</Text>
        </View>

        {/* Hero CTA Card */}
        <GlassCard intense style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>Plan a Trip</Text>
              <Text style={styles.heroSubtitle}>
                AI-optimized routes with charging stops tailored to your battery
              </Text>
            </View>
            <GlassButton
              title="Start Planning"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.push('/(tabs)/plan')}
            />
          </View>
          {/* Decorative gradient orb */}
          <View style={styles.heroOrb} />
        </GlassCard>

        {/* Vehicles Section Header with + Add EV */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Your Vehicles</Text>
            <Pressable onPress={() => router.push('/vehicle/add')}>
              <Text style={styles.addVehicleBtn}>+ Add EV</Text>
            </Pressable>
          </View>

          {vehicles.length === 0 ? (
            <GlassCard style={styles.emptyVehiclesCard}>
              <Text style={styles.emptyVehiclesText}>No vehicles saved yet.</Text>
              <GlassButton
                title="Add Your First EV"
                variant="glass"
                size="md"
                onPress={() => router.push('/vehicle/add')}
              />
            </GlassCard>
          ) : (
            vehicles.map((v) => {
              const isSelected = selectedVehicle?.id === v.id;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => {
                    selectVehicle(v);
                    router.push({ pathname: '/vehicle/[id]', params: { id: v.id } });
                  }}
                >
                  <GlassCard
                    intense={isSelected}
                    style={[styles.vehicleCard, isSelected && styles.selectedVehicleCard]}
                  >
                    <View style={styles.vehicleRow}>
                      <View style={styles.vehicleInfo}>
                        <View style={styles.vehicleTitleRow}>
                          <Text style={styles.vehicleName}>
                            {v.make} {v.model}
                          </Text>
                          {isSelected && <StatusBadge label="Active" variant="success" size="sm" />}
                        </View>
                        <Text style={styles.vehicleDetail}>
                          {v.battery_capacity_kwh} kWh • {v.battery_health_percent}% health
                        </Text>
                        <StatusBadge label="Simulated SoC" variant="simulated" />
                      </View>
                      <BatteryRing soc={isSelected ? simulatedSoC : 80} />
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Trips Planned</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>—</Text>
              <Text style={styles.statLabel}>Km Saved</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>—</Text>
              <Text style={styles.statLabel}>Avg. Wait</Text>
            </GlassCard>
          </View>
        </View>
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
    gap: spacing['6'],
  },
  header: {
    gap: spacing['1'],
  },
  greeting: {
    fontFamily,
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
  },
  title: {
    fontFamily,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  heroCard: {
    overflow: 'hidden',
    position: 'relative',
  },
  heroContent: {
    gap: spacing['5'],
    zIndex: 1,
  },
  heroTextBlock: {
    gap: spacing['2'],
  },
  heroTitle: {
    fontFamily,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  heroSubtitle: {
    fontFamily,
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  heroOrb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    top: -60,
    right: -60,
  },
  section: {
    gap: spacing['3'],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['1'],
  },
  sectionTitle: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  addVehicleBtn: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  emptyVehiclesCard: {
    alignItems: 'center',
    gap: spacing['3'],
    paddingVertical: spacing['6'],
  },
  emptyVehiclesText: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  vehicleCard: {
    marginBottom: spacing['2'],
  },
  selectedVehicleCard: {
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleInfo: {
    flex: 1,
    gap: spacing['1'],
    marginRight: spacing['4'],
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
  },
  vehicleName: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  vehicleDetail: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  batteryRing: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batteryText: {
    fontFamily,
    fontWeight: fontWeight.bold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing['3'],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing['1'],
  },
  statValue: {
    fontFamily,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  statLabel: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
