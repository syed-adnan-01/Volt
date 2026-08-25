// ──────────────────────────────────────────────
// Plan Screen — Enter Destination & Find Routes
// Glassmorphic search overlay, live vehicle specs,
// and real connection to the Trips Orchestrator.
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { GlassCard, GlassInput, GlassButton, StatusBadge } from '@/components/ui';
import { colors, fontFamily, fontSize, fontWeight, spacing } from '@/theme';
import { useVehicleStore } from '@/state/vehicleStore';
import { useTripStore } from '@/state/tripStore';

// ── Default Mumbai → Pune route points ───────
const TEST_ROUTE: Array<[number, number]> = [
  [19.076, 72.8777],   // Mumbai
  [19.0176, 73.0156],  // Panvel
  [18.7557, 73.4091],  // Lonavala
  [18.5204, 73.8567],  // Pune
];

function MapPlaceholder() {
  return (
    <View style={styles.mapPlaceholder}>
      <LinearGradient
        colors={['#0f0f1a', '#1a1a2e', '#16213e']}
        style={StyleSheet.absoluteFill}
      />
      {/* Route preview dots */}
      <View style={styles.routePreview}>
        {TEST_ROUTE.map((coord, i) => (
          <View key={i} style={styles.routePointRow}>
            <View
              style={[
                styles.routeDot,
                i === 0 && styles.routeDotOrigin,
                i === TEST_ROUTE.length - 1 && styles.routeDotDest,
              ]}
            />
            <Text style={styles.routeCoordText}>
              {coord[0].toFixed(4)}°N, {coord[1].toFixed(4)}°E
            </Text>
          </View>
        ))}
        {/* Connecting line */}
        <View style={styles.routeLine} />
      </View>

      <View style={styles.mapLabel}>
        <Text style={styles.mapLabelText}>Journey Corridor Preview</Text>
        <Text style={styles.mapLabelSubtext}>
          Mumbai → Pune (NH48 Highway with PostGIS Charger Nodes)
        </Text>
      </View>
    </View>
  );
}

export default function PlanScreen() {
  const [destination, setDestination] = useState('Pune, Maharashtra');
  const { selectedVehicle, simulatedSoC } = useVehicleStore();
  const { planTripAction, loading, error } = useTripStore();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFindRoutes = async () => {
    setLocalError(null);

    // Pune coordinates
    const destLat = 18.5204;
    const destLng = 73.8567;

    const res = await planTripAction(destLat, destLng, destination);
    if (res.success) {
      router.push('/trip/route-options');
    } else {
      setLocalError(res.error || 'Failed to calculate route.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Full-screen map background */}
      <MapPlaceholder />

      {/* Glassmorphic search overlay at top */}
      <View style={styles.searchOverlay}>
        <LinearGradient
          colors={['rgba(10,10,15,0.95)', 'rgba(10,10,15,0)']}
          style={styles.searchGradient}
        >
          <Text style={styles.screenTitle}>Plan Trip</Text>
          <GlassCard style={styles.searchCard}>
            <View style={styles.originRow}>
              <Text style={styles.originDot}>◉</Text>
              <View style={styles.originTextBlock}>
                <Text style={styles.originLabel}>Starting Point</Text>
                <Text style={styles.originText}>Mumbai, Maharashtra (Current)</Text>
              </View>
            </View>

            <View style={styles.searchDivider} />

            <GlassInput
              label="Destination"
              placeholder="Where to?"
              value={destination}
              onChangeText={setDestination}
              icon={<Text style={styles.searchIcon}>📍</Text>}
            />

            {/* Selected Vehicle Info */}
            <View style={styles.vehicleBadgeRow}>
              <Text style={styles.vehicleBadgeText}>
                🚗 {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : 'No EV selected'}
              </Text>
              <StatusBadge label={`Battery: ${simulatedSoC}%`} variant={simulatedSoC > 30 ? 'success' : 'warning'} size="sm" />
            </View>
          </GlassCard>

          {(error || localError) && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {error || localError}</Text>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <GlassCard style={styles.routeInfoCard}>
          <View style={styles.routeInfoRow}>
            <View style={styles.routeInfoBlock}>
              <Text style={styles.routeInfoValue}>148.5 km</Text>
              <Text style={styles.routeInfoLabel}>Estimated Dist.</Text>
            </View>
            <View style={styles.routeInfoDivider} />
            <View style={styles.routeInfoBlock}>
              <Text style={styles.routeInfoValue}>~2h 15m</Text>
              <Text style={styles.routeInfoLabel}>Drive Time</Text>
            </View>
            <View style={styles.routeInfoDivider} />
            <View style={styles.routeInfoBlock}>
              <Text style={styles.routeInfoValue}>{simulatedSoC < 40 ? '1 Stop' : '0 Stops'}</Text>
              <Text style={styles.routeInfoLabel}>Optimal Charge</Text>
            </View>
          </View>

          <GlassButton
            title={loading ? 'Optimizing Journey...' : 'Find AI-Optimized Routes'}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleFindRoutes}
            disabled={loading}
          />
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgStart,
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routePreview: {
    gap: spacing['6'],
    position: 'relative',
    paddingLeft: spacing['8'],
  },
  routePointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    zIndex: 1,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.6)',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  routeDotOrigin: {
    backgroundColor: colors.success,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  routeDotDest: {
    backgroundColor: colors.primary,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  routeCoordText: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  routeLine: {
    position: 'absolute',
    left: 37,
    top: 12,
    bottom: 12,
    width: 2,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  mapLabel: {
    position: 'absolute',
    bottom: 240,
    alignItems: 'center',
    gap: spacing['1'],
    paddingHorizontal: spacing['4'],
  },
  mapLabelText: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  mapLabelSubtext: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    opacity: 0.8,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchGradient: {
    paddingTop: Platform.select({ ios: 60, android: 48, default: 40 }),
    paddingHorizontal: spacing['5'],
    paddingBottom: spacing['6'],
    gap: spacing['3'],
  },
  screenTitle: {
    fontFamily,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  searchCard: {
    gap: spacing['3'],
  },
  searchIcon: {
    fontSize: 16,
  },
  searchDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  originDot: {
    fontSize: 14,
    color: colors.success,
  },
  originTextBlock: {
    gap: 2,
  },
  originLabel: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  originText: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  vehicleBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing['1'],
  },
  vehicleBadgeText: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  errorBanner: {
    backgroundColor: colors.dangerMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing['3'],
    marginTop: spacing['1'],
  },
  errorText: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.danger,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 100, // above tab bar
    left: 0,
    right: 0,
    paddingHorizontal: spacing['5'],
    zIndex: 10,
  },
  routeInfoCard: {
    gap: spacing['4'],
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeInfoBlock: {
    flex: 1,
    alignItems: 'center',
    gap: spacing['0.5'],
  },
  routeInfoValue: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  routeInfoLabel: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  routeInfoDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
