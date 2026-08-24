// ──────────────────────────────────────────────
// Route Options Screen (Stack)
// Shows ranked candidate routes from the optimizer.
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
import { router } from 'expo-router';
import { GlassCard, GlassButton, StatusBadge } from '@/components/ui';
import { colors, fontFamily, fontSize, fontWeight, spacing } from '@/theme';

export default function RouteOptionsScreen() {
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
          <Text style={styles.screenTitle}>Route Options</Text>
          <Text style={styles.subtitle}>
            Mumbai → Pune • 148 km
          </Text>
        </View>

        {/* Recommended Route */}
        <GlassCard intense style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <StatusBadge label="Recommended" variant="success" size="md" />
            <Text style={styles.routeTime}>2h 15m</Text>
          </View>
          <Text style={styles.routeTitle}>Direct via Expressway</Text>
          <Text style={styles.routeDetail}>1 charging stop • 22 min charging</Text>

          <View style={styles.reasonsBlock}>
            <Text style={styles.reasonsTitle}>Why this route:</Text>
            <Text style={styles.reason}>✓ Reachable with current battery</Text>
            <Text style={styles.reason}>✓ High predicted availability</Text>
            <Text style={styles.reason}>✓ Lowest total journey time</Text>
          </View>

          <GlassButton
            title="Start Navigation"
            variant="primary"
            size="lg"
            fullWidth
          />
        </GlassCard>

        {/* Alternative Route */}
        <GlassCard style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <StatusBadge label="Alternative" variant="info" size="md" />
            <Text style={styles.routeTime}>2h 45m</Text>
          </View>
          <Text style={styles.routeTitle}>Via Old Highway</Text>
          <Text style={styles.routeDetail}>2 charging stops • 35 min charging</Text>

          <View style={styles.reasonsBlock}>
            <Text style={styles.reasonsTitle}>Why this route:</Text>
            <Text style={styles.reason}>✓ Better fallback coverage</Text>
            <Text style={styles.reason}>✓ Lower battery risk</Text>
          </View>

          <GlassButton
            title="Select Route"
            variant="glass"
            size="md"
            fullWidth
          />
        </GlassCard>

        <Text style={styles.disclaimer}>
          Predictions based on simulated data. Actual conditions may vary.
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
