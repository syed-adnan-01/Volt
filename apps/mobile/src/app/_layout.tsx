// ──────────────────────────────────────────────
// Root Layout
// Dark theme, font loading, providers.
// ──────────────────────────────────────────────

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { colors } from '@/theme';

// Keep the splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s — server data is cache, not source of truth
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Inter: require('../../assets/fonts/Inter.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bgStart },
          animation: 'fade',
        }}
      />
    </QueryClientProvider>
  );
}
