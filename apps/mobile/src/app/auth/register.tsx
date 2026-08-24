// ──────────────────────────────────────────────
// Register Screen (Auth)
// Glassmorphic sign-up screen.
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
import { GlassCard, GlassInput, GlassButton } from '@/components/ui';
import { colors, fontFamily, fontSize, fontWeight, spacing } from '@/theme';
import { useAuthStore } from '@/state/authStore';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { setToken, setUser } = useAuthStore();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Simulate account creation
      const mockToken = `user-token-${Date.now()}`;
      setToken(mockToken);
      setUser({
        id: `user-${Date.now()}`,
        email,
        name,
        phone: null,
        role: 'driver',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
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
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backBtn}>← Back</Text>
          </Pressable>
          <Text style={styles.screenTitle}>Create Account</Text>
          <Text style={styles.subtitle}>Join VOLT for predictive EV trip planning</Text>
        </View>

        {/* Form Card */}
        <GlassCard intense style={styles.formCard}>
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <GlassInput
            label="Full Name"
            placeholder="Jane Doe"
            value={name}
            onChangeText={setName}
          />

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

          <GlassInput
            label="Confirm Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <GlassButton
            title={loading ? 'Creating Account...' : 'Register'}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleRegister}
          />
        </GlassCard>

        {/* Switch to Login */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginLink}>Sign In</Text>
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
    gap: spacing['5'],
  },
  header: {
    gap: spacing['2'],
  },
  backBtn: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.primary,
    marginBottom: spacing['1'],
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
  formCard: {
    gap: spacing['4'],
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
  loginLink: {
    fontFamily,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
