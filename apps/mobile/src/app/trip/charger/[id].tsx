// ──────────────────────────────────────────────
// Charger Details Screen (Stack)
// Shows station info, predictions, and confidence.
// Phase 0: mocked data.
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

export default function ChargerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

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
          <Text style={styles.screenTitle}>Charger Details</Text>
        </View>

        {/* Station Info */}
        <GlassCard intense style={styles.mainCard}>
          <Text style={styles.stationName}>EV Station Lonavala</Text>
          <Text style={styles.stationAddress}>NH48, Lonavala, Maharashtra</Text>
          <View style={styles.tagsRow}>
            <StatusBadge label="CCS2" variant="info" />
            <StatusBadge label="50 kW" variant="info" />
            <StatusBadge label="Simulated" variant="simulated" />
          </View>
        </GlassCard>

        {/* Predictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Predictions</Text>
          <GlassCard>
            <View style={styles.predRow}>
              <View style={styles.predBlock}>
                <Text style={styles.predValue}>likely open</Text>
                <Text style={styles.predLabel}>Availability</Text>
              </View>
              <View style={styles.predDivider} />
              <View style={styles.predBlock}>
                <Text style={styles.predValue}>~8 min</Text>
                <Text style={styles.predLabel}>Wait Time</Text>
              </View>
              <View style={styles.predDivider} />
              <View style={styles.predBlock}>
                <Text style={styles.predValue}>0.72</Text>
                <Text style={styles.predLabel}>Reliability</Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard>
            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>Model Confidence</Text>
              <View style={styles.confidenceBarBg}>
                <View style={[styles.confidenceBarFill, { width: '62%' }]} />
              </View>
              <Text style={styles.confidenceValue}>0.62</Text>
            </View>
            <Text style={styles.confidenceNote}>
              Lower confidence — predictions may be less accurate
            </Text>
          </GlassCard>
        </View>

        {/* Data Freshness */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Source</Text>
          <GlassCard>
            <View style={styles.freshnessRow}>
              <StatusBadge label="Stale data → lower confidence" variant="warning" size="md" />
            </View>
            <Text style={styles.freshnessNote}>
              Last updated 4 hours ago. Predictions use simulated historical data.
            </Text>
          </GlassCard>
        </View>

        <GlassButton
          title="Navigate to Station"
          variant="primary"
          size="lg"
          fullWidth
        />
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
    marginBottom: spacing['2'],
  },
  screenTitle: {
    fontFamily,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  mainCard: {
    gap: spacing['3'],
  },
  stationName: {
    fontFamily,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  stationAddress: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing['2'],
    flexWrap: 'wrap',
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
  predRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  predBlock: {
    flex: 1,
    alignItems: 'center',
    gap: spacing['1'],
  },
  predValue: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  predLabel: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  predDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  confidenceLabel: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  confidenceBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: 3,
  },
  confidenceValue: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    width: 36,
    textAlign: 'right',
  },
  confidenceNote: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing['2'],
  },
  freshnessRow: {
    marginBottom: spacing['2'],
  },
  freshnessNote: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
