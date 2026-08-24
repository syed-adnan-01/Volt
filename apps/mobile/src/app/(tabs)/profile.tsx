// ──────────────────────────────────────────────
// Profile Screen
// User info card, vehicle count, settings & Sign Out.
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
import { useAuthStore } from '@/state/authStore';
import { useVehicleStore } from '@/state/vehicleStore';

function SettingsItem({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.settingsItem}>
      <Text style={styles.settingsIcon}>{icon}</Text>
      <View style={styles.settingsTextBlock}>
        <Text style={styles.settingsLabel}>{label}</Text>
        {value && <Text style={styles.settingsValue}>{value}</Text>}
      </View>
      <Text style={styles.settingsChevron}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, isDemo, logout } = useAuthStore();
  const { vehicles } = useVehicleStore();

  const getInitials = (name?: string | null) => {
    if (!name) return 'VS';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = () => {
    logout();
    router.replace('/auth/login');
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
        <Text style={styles.screenTitle}>Profile</Text>

        {/* User Card */}
        <GlassCard intense style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </LinearGradient>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Driver'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'driver@volt.app'}</Text>
            {isDemo ? (
              <StatusBadge label="Offline Demo Mode" variant="simulated" size="md" />
            ) : (
              <StatusBadge label="Authenticated" variant="success" size="md" />
            )}
          </View>
        </GlassCard>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <GlassCard padding={0}>
            <SettingsItem
              icon="🚗"
              label="Vehicles"
              value={`${vehicles.length} saved`}
              onPress={() => router.push('/vehicle/add')}
            />
            <View style={styles.divider} />
            <SettingsItem icon="🔔" label="Notifications" value="Enabled" />
            <View style={styles.divider} />
            <SettingsItem icon="📊" label="Units" value="Metric (km)" />
            <View style={styles.divider} />
            <SettingsItem icon="🎨" label="Appearance" value="Dark" />
          </GlassCard>
        </View>

        {/* Account Action */}
        <View style={styles.section}>
          {user ? (
            <GlassButton
              title="Sign Out"
              variant="ghost"
              size="md"
              fullWidth
              onPress={handleSignOut}
            />
          ) : (
            <GlassButton
              title="Sign In / Create Account"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.push('/auth/login')}
            />
          )}
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <GlassCard padding={0}>
            <SettingsItem icon="ℹ️" label="Version" value="0.1.0 (Phase 1)" />
            <View style={styles.divider} />
            <SettingsItem icon="📄" label="API Gateway" value="http://localhost:3000" />
          </GlassCard>
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
    paddingBottom: 120,
    gap: spacing['6'],
  },
  screenTitle: {
    fontFamily,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  userCard: {
    alignItems: 'center',
    gap: spacing['4'],
    paddingVertical: spacing['6'],
  },
  avatarContainer: {},
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  userInfo: {
    alignItems: 'center',
    gap: spacing['1'],
  },
  userName: {
    fontFamily,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  userEmail: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textSecondary,
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
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing['4'],
    paddingHorizontal: spacing['4'],
    gap: spacing['3'],
  },
  settingsIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  settingsTextBlock: {
    flex: 1,
    gap: spacing['0.5'],
  },
  settingsLabel: {
    fontFamily,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  settingsValue: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  settingsChevron: {
    fontFamily,
    fontSize: fontSize.lg,
    color: colors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginHorizontal: spacing['4'],
  },
});
