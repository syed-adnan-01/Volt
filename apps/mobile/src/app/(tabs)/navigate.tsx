// ──────────────────────────────────────────────
// Navigate Screen — Live Trip (Empty State)
// Shows "No active trip" when idle, skeleton
// for live battery/next charger display.
// ──────────────────────────────────────────────

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard, GlassButton, StatusBadge } from '@/components/ui';
import { colors, fontFamily, fontSize, fontWeight, spacing, radius } from '@/theme';

// ── Skeleton Pulse Block ─────────────────────
function SkeletonBlock({ width, height = 14 }: { width: number | string; height?: number }) {
  return (
    <View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius: height / 2 },
      ]}
    />
  );
}

export default function NavigateScreen() {
  const hasActiveTrip = false; // Phase 0: no active trip

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
        <Text style={styles.screenTitle}>Navigation</Text>

        {!hasActiveTrip ? (
          // ── Empty State ────────────────────
          <View style={styles.emptyState}>
            <GlassCard intense style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🧭</Text>
              <Text style={styles.emptyTitle}>No Active Trip</Text>
              <Text style={styles.emptySubtitle}>
                Plan a trip to see live navigation with battery updates, charging stops, and estimated wait times.
              </Text>
              <GlassButton
                title="Plan a Trip"
                variant="glass"
                size="md"
              />
            </GlassCard>

            {/* Skeleton preview of what navigation will look like */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trip Overview</Text>
              <GlassCard style={styles.previewCard}>
                <View style={styles.previewRow}>
                  <View style={styles.previewBlock}>
                    <SkeletonBlock width={48} height={48} />
                    <SkeletonBlock width={60} />
                    <SkeletonBlock width={40} height={10} />
                  </View>
                  <View style={styles.previewDivider} />
                  <View style={styles.previewBlock}>
                    <SkeletonBlock width={48} height={48} />
                    <SkeletonBlock width={60} />
                    <SkeletonBlock width={40} height={10} />
                  </View>
                  <View style={styles.previewDivider} />
                  <View style={styles.previewBlock}>
                    <SkeletonBlock width={48} height={48} />
                    <SkeletonBlock width={60} />
                    <SkeletonBlock width={40} height={10} />
                  </View>
                </View>
              </GlassCard>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Next Charging Stop</Text>
              <GlassCard>
                <View style={styles.chargerSkeleton}>
                  <SkeletonBlock width="70%" height={16} />
                  <SkeletonBlock width="50%" height={12} />
                  <SkeletonBlock width="40%" height={12} />
                  <View style={styles.chargerSkeletonRow}>
                    <SkeletonBlock width={80} height={28} />
                    <SkeletonBlock width={80} height={28} />
                  </View>
                </View>
              </GlassCard>
            </View>
          </View>
        ) : null}
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
  screenTitle: {
    fontFamily,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  emptyState: {
    gap: spacing['6'],
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
  section: {
    gap: spacing['3'],
  },
  sectionTitle: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  previewCard: {},
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  previewBlock: {
    alignItems: 'center',
    gap: spacing['2'],
  },
  previewDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  skeleton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chargerSkeleton: {
    gap: spacing['3'],
  },
  chargerSkeletonRow: {
    flexDirection: 'row',
    gap: spacing['3'],
    marginTop: spacing['2'],
  },
});
