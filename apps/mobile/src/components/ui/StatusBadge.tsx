// ──────────────────────────────────────────────
// StatusBadge — pill indicator for confidence,
// data labels, and status
// ──────────────────────────────────────────────

import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fontFamily, fontSize, fontWeight, radius, spacing } from '@/theme';

type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'simulated';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  info: { bg: colors.primaryMuted, text: colors.primary },
  success: { bg: colors.successMuted, text: colors.success },
  warning: { bg: colors.warningMuted, text: colors.warning },
  danger: { bg: colors.dangerMuted, text: colors.danger },
  simulated: { bg: 'rgba(255,255,255,0.06)', text: colors.textSecondary },
};

export function StatusBadge({ label, variant = 'info', size = 'sm' }: StatusBadgeProps) {
  const variantStyle = variantColors[variant];
  const isSm = size === 'sm';

  const containerStyle: ViewStyle = {
    backgroundColor: variantStyle.bg,
    paddingHorizontal: isSm ? spacing['2'] : spacing['3'],
    paddingVertical: isSm ? spacing['0.5'] : spacing['1'],
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  };

  return (
    <View style={containerStyle}>
      <Text
        style={[
          styles.text,
          {
            color: variantStyle.text,
            fontSize: isSm ? fontSize.xs : fontSize.sm,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.3,
  },
});
