// ──────────────────────────────────────────────
// Add Vehicle Screen
// Glassmorphic form for registering a new EV.
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { GlassCard, GlassInput, GlassButton } from '@/components/ui';
import { colors, fontFamily, fontSize, fontWeight, spacing } from '@/theme';
import { useVehicleStore } from '@/state/vehicleStore';

export default function AddVehicleScreen() {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [batteryCapacity, setBatteryCapacity] = useState('75');
  const [usableCapacity, setUsableCapacity] = useState('70');
  const [consumption, setConsumption] = useState('0.18');
  const [maxPower, setMaxPower] = useState('150');
  const [health, setHealth] = useState('98');
  const [reserveSoC, setReserveSoC] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addVehicle } = useVehicleStore();

  const handleAdd = async () => {
    if (!make.trim() || !model.trim()) {
      setError('Vehicle Make and Model are required.');
      return;
    }

    const capacityNum = parseFloat(batteryCapacity);
    const usableNum = parseFloat(usableCapacity);
    const consumptionNum = parseFloat(consumption);
    const powerNum = parseFloat(maxPower);
    const healthNum = parseFloat(health);
    const reserveNum = parseFloat(reserveSoC);

    if (isNaN(capacityNum) || isNaN(usableNum) || isNaN(consumptionNum) || isNaN(powerNum)) {
      setError('Please enter valid numeric values for battery specifications.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await addVehicle({
        make: make.trim(),
        model: model.trim(),
        battery_capacity_kwh: capacityNum,
        usable_capacity_kwh: usableNum,
        consumption_kwh_per_km: consumptionNum,
        max_charging_power_kw: powerNum,
        battery_health_percent: isNaN(healthNum) ? 100 : healthNum,
        reserve_soc_percent: isNaN(reserveNum) ? 10 : reserveNum,
      });

      if (success) {
        router.back();
      } else {
        setError('Failed to add vehicle. Please check inputs and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.screenTitle}>Add EV Vehicle</Text>
          <Text style={styles.subtitle}>Enter your EV specs for accurate range prediction</Text>
        </View>

        {/* Form */}
        <GlassCard intense style={styles.formCard}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <GlassInput
            label="Make (Brand)"
            placeholder="e.g. Tesla, Hyundai, Rivian"
            value={make}
            onChangeText={setMake}
          />

          <GlassInput
            label="Model"
            placeholder="e.g. Model Y, IONIQ 6, R1T"
            value={model}
            onChangeText={setModel}
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <GlassInput
                label="Battery Capacity (kWh)"
                placeholder="75"
                value={batteryCapacity}
                onChangeText={setBatteryCapacity}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <GlassInput
                label="Usable Capacity (kWh)"
                placeholder="70"
                value={usableCapacity}
                onChangeText={setUsableCapacity}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <GlassInput
                label="Consumption (kWh/km)"
                placeholder="0.18"
                value={consumption}
                onChangeText={setConsumption}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <GlassInput
                label="Max Power (kW)"
                placeholder="150"
                value={maxPower}
                onChangeText={setMaxPower}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <GlassInput
                label="Battery Health (%)"
                placeholder="98"
                value={health}
                onChangeText={setHealth}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <GlassInput
                label="Reserve SoC (%)"
                placeholder="10"
                value={reserveSoC}
                onChangeText={setReserveSoC}
                keyboardType="numeric"
              />
            </View>
          </View>

          <GlassButton
            title={loading ? 'Saving Vehicle...' : 'Save Vehicle'}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleAdd}
          />
        </GlassCard>
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
  formCard: {
    gap: spacing['4'],
  },
  row: {
    flexDirection: 'row',
    gap: spacing['3'],
  },
  halfInput: {
    flex: 1,
  },
  errorBox: {
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: spacing['3'],
  },
  errorText: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.danger,
  },
});
