// ──────────────────────────────────────────────
// Plan Screen — Enter Destination
// Map with glassmorphic search bar overlay and
// hardcoded test route polyline (geometry de-risk).
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard, GlassInput, GlassButton } from '@/components/ui';
import { colors, fontFamily, fontSize, fontWeight, spacing, radius } from '@/theme';

// ── Hardcoded test route ─────────────────────
// Mumbai → Pune route (rough coordinates) to verify
// that the Array<[number, number]> geometry format
// from @volt/contracts RoutingResult renders correctly.
const TEST_ROUTE: Array<[number, number]> = [
  [19.076, 72.8777],   // Mumbai
  [19.0176, 73.0156],  // Panvel
  [18.7557, 73.4091],  // Lonavala
  [18.5204, 73.8567],  // Pune
];

// ── Map Placeholder ──────────────────────────
// react-native-maps requires native build config.
// For Phase 0 web/Expo Go testing, we show a styled
// placeholder. The map renders on actual device builds.
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
        <Text style={styles.mapLabelText}>Map View</Text>
        <Text style={styles.mapLabelSubtext}>
          Hardcoded route: Mumbai → Pune ({TEST_ROUTE.length} waypoints)
        </Text>
      </View>
    </View>
  );
}

export default function PlanScreen() {
  const [destination, setDestination] = useState('');

  return (
    <View style={styles.container}>
      {/* Full-screen map behind everything */}
      <MapPlaceholder />

      {/* Glassmorphic search overlay at top */}
      <View style={styles.searchOverlay}>
        <LinearGradient
          colors={['rgba(10,10,15,0.9)', 'rgba(10,10,15,0)']}
          style={styles.searchGradient}
        >
          <Text style={styles.screenTitle}>Plan Trip</Text>
          <GlassCard style={styles.searchCard}>
            <GlassInput
              placeholder="Where to?"
              value={destination}
              onChangeText={setDestination}
              icon={<Text style={styles.searchIcon}>📍</Text>}
            />
            <View style={styles.searchDivider} />
            <View style={styles.originRow}>
              <Text style={styles.originDot}>◉</Text>
              <Text style={styles.originText}>Current Location</Text>
            </View>
          </GlassCard>
        </LinearGradient>
      </View>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <GlassCard style={styles.routeInfoCard}>
          <View style={styles.routeInfoRow}>
            <View style={styles.routeInfoBlock}>
              <Text style={styles.routeInfoValue}>148 km</Text>
              <Text style={styles.routeInfoLabel}>Distance</Text>
            </View>
            <View style={styles.routeInfoDivider} />
            <View style={styles.routeInfoBlock}>
              <Text style={styles.routeInfoValue}>2h 15m</Text>
              <Text style={styles.routeInfoLabel}>Duration</Text>
            </View>
            <View style={styles.routeInfoDivider} />
            <View style={styles.routeInfoBlock}>
              <Text style={styles.routeInfoValue}>1 stop</Text>
              <Text style={styles.routeInfoLabel}>Charging</Text>
            </View>
          </View>
          <GlassButton
            title="Find Routes"
            variant="primary"
            size="lg"
            fullWidth
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
    bottom: 160,
    alignItems: 'center',
    gap: spacing['1'],
  },
  mapLabelText: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textTertiary,
  },
  mapLabelSubtext: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    opacity: 0.6,
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
    paddingBottom: spacing['8'],
    gap: spacing['4'],
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
  originText: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textSecondary,
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
