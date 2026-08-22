// ──────────────────────────────────────────────
// VOLT Design Tokens — Glassmorphic Minimalism
// Every visual decision in the app traces to this file.
// ──────────────────────────────────────────────

import { Platform } from 'react-native';

// ── Colors ────────────────────────────────────
export const colors = {
  // Background gradient (deep dark)
  bgStart: '#0a0a0f',
  bgEnd: '#12121a',

  // Glass surfaces
  glass: {
    background: 'rgba(255, 255, 255, 0.06)',
    backgroundHover: 'rgba(255, 255, 255, 0.10)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderFocus: 'rgba(255, 255, 255, 0.16)',
    shadow: 'rgba(0, 0, 0, 0.4)',
  },

  // Brand accent — electric indigo (EV vibe)
  primary: '#6366f1',
  primaryMuted: 'rgba(99, 102, 241, 0.2)',
  primaryGlow: 'rgba(99, 102, 241, 0.4)',

  // Semantic
  success: '#22c55e',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  warning: '#f59e0b',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  danger: '#ef4444',
  dangerMuted: 'rgba(239, 68, 68, 0.15)',

  // Text
  textPrimary: 'rgba(255, 255, 255, 0.92)',
  textSecondary: 'rgba(255, 255, 255, 0.55)',
  textTertiary: 'rgba(255, 255, 255, 0.30)',
  textInverse: '#0a0a0f',

  // Misc
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ── Typography ────────────────────────────────
export const fontFamily = Platform.select({
  ios: 'Inter',
  android: 'Inter',
  web: 'Inter, system-ui, -apple-system, sans-serif',
  default: 'Inter',
})!;

export const fontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 32,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
};

// ── Spacing (4px base grid) ───────────────────
export const spacing = {
  '0.5': 2,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
} as const;

// ── Radii ─────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ── Glass Effect Recipe ───────────────────────
export const glassEffect = {
  /** BlurView intensity (expo-blur / expo-glass-effect) */
  blurIntensity: 40,
  blurIntensityStrong: 60,
  /** Background overlay */
  overlayColor: colors.glass.background,
  /** Border */
  borderWidth: 1,
  borderColor: colors.glass.border,
  /** Shadow */
  shadowColor: colors.glass.shadow,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.4,
  shadowRadius: 32,
  elevation: 8, // Android
} as const;

// ── Tab Bar ───────────────────────────────────
export const tabBar = {
  height: Platform.select({ ios: 88, android: 72, default: 64 })!,
  iconSize: 22,
  activeColor: colors.primary,
  inactiveColor: colors.textTertiary,
} as const;
