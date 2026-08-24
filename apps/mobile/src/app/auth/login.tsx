// ──────────────────────────────────────────────
// Login Screen (Auth)
// Glassmorphic design with demo sign-in bypass.
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { GlassCard, GlassInput, GlassButton, StatusBadge } from '@/components/ui';
import { colors, fontFamily, fontSize, fontWeight, spacing } from '@/theme';
import { useAuthStore } from '@/state/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { setToken, demoLogin } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Simulate/perform sign in
      // In production/Phase 1 with live Firebase, fetch token from Firebase SDK.
      // For now, attach token and navigate to tabs
      setToken(`token-${Date.now()}`);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    demoLogin();
    router.replace('/(tabs)');
  };

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
          <Text style={styles.logo}>VOLT</Text>
          <Text style={styles.subtitle}>AI-Powered EV Journey Optimizer</Text>
        </View>

        {/* Login Form Card */}
        <GlassCard intense style={styles.formCard}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <GlassInput
            label="Email Address"
            placeholder="driver@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <GlassInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <GlassButton
            title={loading ? 'Signing In...' : 'Sign In'}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleLogin}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <GlassButton
            title="Quick Demo Sign-In"
            variant="glass"
            size="lg"
            fullWidth
            onPress={handleDemoSignIn}
          />
          <StatusBadge label="Offline Demo Mode Available" variant="simulated" />
        </GlassCard>

        {/* Navigation to Register */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push('/auth/register')}>
            <Text style={styles.registerLink}>Register</Text>
          </Pressable>
        </View>
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
    gap: spacing['6'],
  },
  header: {
    alignItems: 'center',
    gap: spacing['1'],
    marginBottom: spacing['2'],
  },
  logo: {
    fontFamily,
    fontSize: 40,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: 4,
  },
  subtitle: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    gap: spacing['4'],
  },
  cardTitle: {
    fontFamily,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing['1'],
  },
  errorBox: {
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: spacing['3'],
  },
  errorText: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.danger,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    marginVertical: spacing['1'],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  registerLink: {
    fontFamily,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
