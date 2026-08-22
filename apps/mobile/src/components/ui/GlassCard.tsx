// ──────────────────────────────────────────────
// GlassCard — frosted-glass surface component
// The foundational container for all VOLT UI surfaces.
// ──────────────────────────────────────────────

import React from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, glassEffect, radius, spacing } from '@/theme';

interface GlassCardProps extends ViewProps {
  /** Override padding */
  padding?: number;
  /** Override border radius */
  borderRadius?: number;
  /** Extra intensity for emphasized cards */
  intense?: boolean;
  children: React.ReactNode;
}

export function GlassCard({
  children,
  padding = spacing['4'],
  borderRadius = radius.lg,
  intense = false,
  style,
  ...props
}: GlassCardProps) {
  const dynamicStyle: ViewStyle = {
    padding,
    borderRadius,
    backgroundColor: intense
      ? 'rgba(255, 255, 255, 0.10)'
      : glassEffect.overlayColor,
  };

  return (
    <View
      style={[styles.container, dynamicStyle, style]}
      {...props}
    >
      {/* Subtle gradient shimmer at the top edge */}
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.shimmer, { borderRadius }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: glassEffect.borderWidth,
    borderColor: glassEffect.borderColor,
    // Shadow (iOS)
    shadowColor: glassEffect.shadowColor,
    shadowOffset: glassEffect.shadowOffset,
    shadowOpacity: glassEffect.shadowOpacity,
    shadowRadius: glassEffect.shadowRadius,
    // Shadow (Android)
    elevation: glassEffect.elevation,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
});
