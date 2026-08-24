// ──────────────────────────────────────────────
// GlassInput — frosted-glass text input
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  type TextInputProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors, fontFamily, fontSize, fontWeight, glassEffect, radius, spacing } from '@/theme';

import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

interface GlassInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export function GlassInput({
  label,
  icon,
  error,
  style,
  containerStyle,
  onFocus,
  onBlur,
  ...props
}: GlassInputProps) {
  const [focused, setFocused] = useState(false);
  const borderOpacity = useSharedValue(0);

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: `rgba(99, 102, 241, ${borderOpacity.value})`,
  }));

  const handleFocus = (e: any) => {
    setFocused(true);
    borderOpacity.value = withTiming(0.5, { duration: 200 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setFocused(false);
    borderOpacity.value = withTiming(0, { duration: 200 });
    onBlur?.(e);
  };

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View style={[styles.container, animatedBorder, containerStyle]}>
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <TextInput
          style={[styles.input, icon ? { paddingLeft: 0 } : undefined, style]}
          placeholderTextColor={colors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </Animated.View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing['1'],
  },
  label: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing['1'],
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glassEffect.overlayColor,
    borderWidth: 1,
    borderColor: glassEffect.borderColor,
    borderRadius: radius.md,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    gap: spacing['3'],
  },
  iconWrapper: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  error: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: spacing['1'],
  },
});
