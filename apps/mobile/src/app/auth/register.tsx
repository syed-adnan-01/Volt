// ──────────────────────────────────────────────
// Register Screen (Auth)
// Multi-step sign-up: Account → Vehicle Selection.
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
import { useAuthStore } from '@/state/authStore';
import { useVehicleStore } from '@/state/vehicleStore';
import {
  EV_CATALOG,
  getUniqueMakes,
  getModelsByMake,
  getCatalogEntry,
  getCategoryEmoji,
} from '@/constants/evCatalog';

type Step = 'account' | 'vehicle';

export default function RegisterScreen() {
  // ── Step ─────────────────────────────────────
  const [step, setStep] = useState<Step>('account');

  // ── Account fields ───────────────────────────
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── Vehicle fields ───────────────────────────
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [selectedVehicleKey, setSelectedVehicleKey] = useState<string | null>(null);

  // ── Misc ─────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { setToken, setUser } = useAuthStore();
  const { addVehicle } = useVehicleStore();

  // ── Dropdown options ─────────────────────────
  const makeOptions: SelectOption[] = useMemo(
    () =>
      getUniqueMakes().map((make) => ({
        key: make,
        label: make,
        subtitle: `${getModelsByMake(make).length} models`,
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

  // ── Handlers ─────────────────────────────────

  const handleAccountNext = () => {
    if (!name || !email || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setErrorMessage(null);
    setStep('vehicle');
  };

  const handleMakeChange = (make: string) => {
    setSelectedMake(make);
    setSelectedVehicleKey(null); // reset model when make changes
  };

  const handleFinishRegistration = async (skipVehicle: boolean) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // Simulate account creation
      const mockToken = `user-token-${Date.now()}`;
      setToken(mockToken);
      setUser({
        id: `user-${Date.now()}`,
        email,
        name,
        phone: null,
        role: 'driver',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Add vehicle from catalog if user selected one
      if (!skipVehicle && selectedVehicleKey) {
        const catalogEntry = getCatalogEntry(selectedVehicleKey);
        if (catalogEntry) {
          await addVehicle({
            make: catalogEntry.make,
            model: catalogEntry.model,
            battery_capacity_kwh: catalogEntry.battery_capacity_kwh,
            usable_capacity_kwh: catalogEntry.usable_capacity_kwh,
            consumption_kwh_per_km: catalogEntry.consumption_kwh_per_km,
            max_charging_power_kw: catalogEntry.max_charging_power_kw,
            battery_health_percent: 100,
            reserve_soc_percent: 10,
          });
        }
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  // ── Get selected vehicle details for preview ──
  const selectedEntry = selectedVehicleKey ? getCatalogEntry(selectedVehicleKey) : null;

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
          <Pressable
            onPress={() => {
              if (step === 'vehicle') {
                setStep('account');
                setErrorMessage(null);
              } else {
                router.back();
              }
            }}
          >
            <Text style={styles.backBtn}>← Back</Text>
          </Pressable>
          <Text style={styles.screenTitle}>
            {step === 'account' ? 'Create Account' : 'Add Your Vehicle'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'account'
              ? 'Join VOLT for predictive EV trip planning'
              : 'Select your EV for accurate range prediction'}
          </Text>

          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepLine, step === 'vehicle' && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 'vehicle' && styles.stepDotActive]} />
          </View>
          <View style={styles.stepLabels}>
            <Text style={[styles.stepLabel, styles.stepLabelActive]}>Account</Text>
            <Text style={[styles.stepLabel, step === 'vehicle' && styles.stepLabelActive]}>Vehicle</Text>
          </View>
        </View>

        {/* ── STEP 1: Account Form ──────────────── */}
        {step === 'account' && (
          <GlassCard intense style={styles.formCard}>
            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <GlassInput
              label="Full Name"
              placeholder="Jane Doe"
              value={name}
              onChangeText={setName}
            />

            <GlassInput
              label="Email Address"
              placeholder="driver@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <GlassInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <GlassInput
              label="Confirm Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <GlassButton
              title="Next — Add Vehicle"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleAccountNext}
            />
          </GlassCard>
        )}

        {/* ── STEP 2: Vehicle Selection ─────────── */}
        {step === 'vehicle' && (
          <GlassCard intense style={styles.formCard}>
            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
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

            {/* Selected Vehicle Preview */}
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
              title={loading ? 'Creating Account...' : 'Register & Add Vehicle'}
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => handleFinishRegistration(false)}
            />

            <Pressable onPress={() => handleFinishRegistration(true)}>
              <Text style={styles.skipLink}>Skip — I'll add a vehicle later</Text>
            </Pressable>
          </GlassCard>
        )}

        {/* Switch to Login */}
        {step === 'account' && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.push('/auth/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </Pressable>
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
  // ── Step Indicator ──
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['3'],
    gap: 0,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing['10'],
  },
  stepLabel: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  stepLabelActive: {
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  // ── Form ──
  formCard: {
    gap: spacing['4'],
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
  // ── Skip link ──
  skipLink: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    textDecorationLine: 'underline',
    paddingVertical: spacing['2'],
  },
  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  loginLink: {
    fontFamily,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
