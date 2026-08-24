// ──────────────────────────────────────────────
// Tabs Layout — Glassmorphic Bottom Tab Bar
// Frosted-glass tab bar with icon-only tabs
// and subtle active glow.
// ──────────────────────────────────────────────

import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { colors, fontFamily, fontSize, fontWeight, tabBar } from '@/theme';

// Simple SVG-free icon using Unicode symbols for Phase 0.
// In production, replace with a proper icon library.
function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      {focused && <View style={styles.activeGlow} />}
      <Text
        style={[
          styles.icon,
          { color: focused ? tabBar.activeColor : tabBar.inactiveColor },
        ]}
      >
        {symbol}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: tabBar.activeColor,
        tabBarInactiveTintColor: tabBar.inactiveColor,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon symbol="⚡" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ focused }) => <TabIcon symbol="🗺" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="navigate"
        options={{
          title: 'Navigate',
          tabBarIcon: ({ focused }) => <TabIcon symbol="🧭" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon symbol="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(10, 10, 15, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    height: tabBar.height,
    paddingBottom: Platform.select({ ios: 24, android: 8, default: 8 }),
    paddingTop: 8,
    position: 'absolute',
    // Glassmorphic shadow
    shadowColor: 'rgba(0, 0, 0, 0.6)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
  },
  tabLabel: {
    fontFamily,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  icon: {
    fontSize: tabBar.iconSize,
    lineHeight: tabBar.iconSize + 4,
  },
  activeGlow: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    top: -4,
  },
});
