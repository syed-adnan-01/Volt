// ──────────────────────────────────────────────
// Vehicle Details Screen
// View & manage saved EV specs and SoC settings.
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
import { router, useLocalSearchParams } from 'expo-router';
import { GlassCard, GlassButton, StatusBadge } from '@/components/ui';
import { colors, fontFamily, fontSize, fontWeight, spacing } from '@/theme';
import { useVehicleStore } from '@/state/vehicleStore';

export default function VehicleDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vehicles, selectedVehicle, selectVehicle, removeVehicle } = useVehicleStore();

  const vehicle = vehicles.find((v) => v.id === id) || selectedVehicle;

  if (!vehicle) {
    return (
      <LinearGradient colors={[colors.bgStart, colors.bgEnd]} style={styles.gradient}>
        <View style={styles.notFoundContent}>
          <Text style={styles.screenTitle}>Vehicle Not Found</Text>
          <GlassButton title="Go Back" variant="glass" onPress={() => router.back()} />
        </View>
      </LinearGradient>
    );
  }

  const isSelected = selectedVehicle?.id === vehicle.id;

  const handleSelect = () => {
    selectVehicle(vehicle);
  };

  const handleDelete = async () => {
    await removeVehicle(vehicle.id);
    router.back();
  };

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
            <Text style={styles.backBtn}>← Back</Text>
          </Pressable>
          <Text style={styles.screenTitle}>
            {vehicle.make} {vehicle.model}
          </Text>
          {isSelected ? (
            <StatusBadge label="Active Vehicle" variant="success" size="md" />
          ) : (
            <StatusBadge label="Saved Vehicle" variant="info" size="md" />
          )}
        </View>

        {/* Specs Card */}
        <GlassCard intense style={styles.specsCard}>
          <Text style={styles.sectionTitle}>Battery Specifications</Text>

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Total Capacity</Text>
            <Text style={styles.specValue}>{vehicle.battery_capacity_kwh} kWh</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Usable Capacity</Text>
            <Text style={styles.specValue}>{vehicle.usable_capacity_kwh} kWh</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Avg. Consumption</Text>
            <Text style={styles.specValue}>{vehicle.consumption_kwh_per_km} kWh/km</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Max Charging Rate</Text>
            <Text style={styles.specValue}>{vehicle.max_charging_power_kw} kW</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Battery Health</Text>
            <Text style={styles.specValue}>{vehicle.battery_health_percent}%</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Reserve Buffer</Text>
            <Text style={styles.specValue}>{vehicle.reserve_soc_percent}% SoC</Text>
          </View>
        </GlassCard>

        {/* Actions */}
        <View style={styles.actionsBlock}>
          {!isSelected && (
            <GlassButton
              title="Set as Active Vehicle"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleSelect}
            />
          )}

          <GlassButton
            title="Remove Vehicle"
            variant="ghost"
            size="md"
            fullWidth
            onPress={handleDelete}
          />
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
    paddingBottom: 40,
    gap: spacing['5'],
  },
  notFoundContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  specsCard: {
    gap: spacing['3'],
  },
  sectionTitle: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing['2'],
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing['1'],
  },
  specLabel: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  specValue: {
    fontFamily,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionsBlock: {
    gap: spacing['3'],
    marginTop: spacing['2'],
  },
});
