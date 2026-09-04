// ──────────────────────────────────────────────
// Add Vehicle Screen
// Select from Indian EV catalog or manually enter.
// Users can reach this screen from the profile or
// home screen to add vehicles after signup.
// ──────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { GlassCard, GlassInput, GlassButton, GlassSelect } from '@/components/ui';
import type { SelectOption } from '@/components/ui/GlassSelect';
import { colors, fontFamily, fontSize, fontWeight, spacing } from '@/theme';
import { useVehicleStore } from '@/state/vehicleStore';
import {
  getUniqueMakes,
  getModelsByMake,
  getCatalogEntry,
  getCategoryEmoji,
} from '@/constants/evCatalog';

type InputMode = 'catalog' | 'manual';

export default function AddVehicleScreen() {
  const [mode, setMode] = useState<InputMode>('catalog');

  // ── Catalog selection ────────────────────────
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [selectedVehicleKey, setSelectedVehicleKey] = useState<string | null>(null);

  // ── Manual input fields ──────────────────────
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

  // ── Dropdown options ─────────────────────────
  const makeOptions: SelectOption[] = useMemo(
    () =>
      getUniqueMakes().map((m) => ({
        key: m,
        label: m,
        subtitle: `${getModelsByMake(m).length} models`,
      })),
    [],
  );

  const modelOptions: SelectOption[] = useMemo(() => {
    if (!selectedMake) return [];
    return getModelsByMake(selectedMake).map((ev) => ({
      key: ev.key,
      label: ev.displayName,
      subtitle: `${ev.battery_capacity_kwh} kWh • ${ev.max_charging_power_kw} kW`,
      icon: getCategoryEmoji(ev.category),
    }));
  }, [selectedMake]);

  const handleMakeChange = (m: string) => {
    setSelectedMake(m);
    setSelectedVehicleKey(null);
  };

  // ── Get selected vehicle entry ───────────────
  const selectedEntry = selectedVehicleKey ? getCatalogEntry(selectedVehicleKey) : null;

  // ── Submit Handler ───────────────────────────
  const handleAdd = async () => {
    if (mode === 'catalog') {
      if (!selectedVehicleKey || !selectedEntry) {
        setError('Please select a vehicle from the catalog.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const success = await addVehicle({
          make: selectedEntry.make,
          model: selectedEntry.model,
          battery_capacity_kwh: selectedEntry.battery_capacity_kwh,
          usable_capacity_kwh: selectedEntry.usable_capacity_kwh,
          consumption_kwh_per_km: selectedEntry.consumption_kwh_per_km,
          max_charging_power_kw: selectedEntry.max_charging_power_kw,
          battery_health_percent: 100,
          reserve_soc_percent: 10,
        });

        if (success) {
          router.back();
        } else {
          setError('Failed to add vehicle. Please try again.');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    } else {
      // Manual mode
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
          <Text style={styles.subtitle}>
            {mode === 'catalog'
              ? 'Select your EV from the catalog'
              : 'Enter your EV specs manually'}
          </Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <Pressable
            style={[styles.modeBtn, mode === 'catalog' && styles.modeBtnActive]}
            onPress={() => { setMode('catalog'); setError(null); }}
          >
            <Text style={[styles.modeText, mode === 'catalog' && styles.modeTextActive]}>
              📋 Select from Catalog
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
            onPress={() => { setMode('manual'); setError(null); }}
          >
            <Text style={[styles.modeText, mode === 'manual' && styles.modeTextActive]}>
              ✏️ Enter Manually
            </Text>
          </Pressable>
        </View>

        {/* ── CATALOG MODE ────────────────────── */}
        {mode === 'catalog' && (
          <GlassCard intense style={styles.formCard}>
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <GlassSelect
              label="Vehicle Brand"
              placeholder="Select manufacturer..."
              options={makeOptions}
              value={selectedMake}
              onSelect={handleMakeChange}
              searchable
              searchPlaceholder="Search brands..."
            />

            <GlassSelect
              label="Vehicle Model"
              placeholder={selectedMake ? 'Select model...' : 'Select brand first'}
              options={modelOptions}
              value={selectedVehicleKey}
              onSelect={setSelectedVehicleKey}
              disabled={!selectedMake}
              searchable
              searchPlaceholder="Search models..."
            />

            {/* Vehicle Preview */}
            {selectedEntry && (
              <GlassCard style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewEmoji}>
                    {getCategoryEmoji(selectedEntry.category)}
                  </Text>
                  <View style={styles.previewTitleBlock}>
                    <Text style={styles.previewName}>
                      {selectedEntry.make} {selectedEntry.model}
                    </Text>
                    <Text style={styles.previewCategory}>
                      {selectedEntry.category.charAt(0).toUpperCase() + selectedEntry.category.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.previewSpecs}>
                  <View style={styles.specItem}>
                    <Text style={styles.specValue}>{selectedEntry.battery_capacity_kwh}</Text>
                    <Text style={styles.specLabel}>kWh Total</Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Text style={styles.specValue}>{selectedEntry.usable_capacity_kwh}</Text>
                    <Text style={styles.specLabel}>kWh Usable</Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Text style={styles.specValue}>{selectedEntry.max_charging_power_kw}</Text>
                    <Text style={styles.specLabel}>kW Max</Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.specItem}>
                    <Text style={styles.specValue}>{(selectedEntry.consumption_kwh_per_km * 1000).toFixed(0)}</Text>
                    <Text style={styles.specLabel}>Wh/km</Text>
                  </View>
                </View>
              </GlassCard>
            )}

            <GlassButton
              title={loading ? 'Adding Vehicle...' : 'Add Vehicle'}
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleAdd}
            />
          </GlassCard>
        )}

        {/* ── MANUAL MODE ─────────────────────── */}
        {mode === 'manual' && (
          <GlassCard intense style={styles.formCard}>
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <GlassInput
              label="Make (Brand)"
              placeholder="e.g. Tata, Mahindra, Hyundai"
              value={make}
              onChangeText={setMake}
            />

            <GlassInput
              label="Model"
              placeholder="e.g. Nexon EV Max, XUV400"
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
  // ── Mode Toggle ──
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing['3'],
    borderRadius: 10,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.30)',
  },
  modeText: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textTertiary,
  },
  modeTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  // ── Form ──
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
  // ── Vehicle Preview ──
  previewCard: {
    gap: spacing['3'],
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  previewEmoji: {
    fontSize: 28,
  },
  previewTitleBlock: {
    flex: 1,
    gap: 2,
  },
  previewName: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  previewCategory: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  previewSpecs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    paddingVertical: spacing['3'],
    paddingHorizontal: spacing['2'],
  },
  specItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  specValue: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  specLabel: {
    fontFamily,
    fontSize: 9,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  specDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
