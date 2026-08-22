// ──────────────────────────────────────────────
// GlassButton — glassmorphic pressable button
// ──────────────────────────────────────────────

import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, fontFamily, fontSize, fontWeight, radius, spacing } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'glass' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GlassButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeMap: Record<ButtonSize, { paddingV: number; paddingH: number; text: number }> = {
  sm: { paddingV: spacing['2'], paddingH: spacing['3'], text: fontSize.sm },
  md: { paddingV: spacing['3'], paddingH: spacing['5'], text: fontSize.base },
  lg: { paddingV: spacing['4'], paddingH: spacing['6'], text: fontSize.md },
};

export function GlassButton({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  style,
  ...props
}: GlassButtonProps) {
  const scale = useSharedValue(1);
  const sizeConfig = sizeMap[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  const containerStyle: ViewStyle = {
    paddingVertical: sizeConfig.paddingV,
    paddingHorizontal: sizeConfig.paddingH,
    borderRadius: radius.md,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    overflow: 'hidden',
    ...(isPrimary
      ? {}
      : isGhost
      ? { backgroundColor: 'transparent' }
      : {
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }),
  };

  const textStyle: TextStyle = {
    fontFamily,
    fontSize: sizeConfig.text,
    fontWeight: fontWeight.semibold,
    color: isPrimary ? colors.white : isGhost ? colors.primary : colors.textPrimary,
    letterSpacing: 0.3,
  };

  const inner = (
    <>
      {icon}
      <Text style={textStyle}>{title}</Text>
    </>
  );

  return (
    <AnimatedPressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[animatedStyle, !isPrimary && containerStyle, style]}
      {...props}
    >
      {isPrimary ? (
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[containerStyle, { borderWidth: 0 }]}
        >
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({});
