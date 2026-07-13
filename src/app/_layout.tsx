import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

// Drei Zustände: nicht eingeloggt → Login, eingeloggt ohne Gruppe → Onboarding,
// eingeloggt mit Gruppe → App. Die Guards regeln die Navigation automatisch.
function RootNavigator() {
  const { session, membership, initializing } = useAuth();

  useEffect(() => {
    if (!initializing) {
      SplashScreen.hideAsync();
    }
  }, [initializing]);

  if (initializing) {
    return null; // Splashscreen bleibt sichtbar
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !membership}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !!membership}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="training/new" />
        <Stack.Screen name="training/[id]/index" />
        <Stack.Screen name="training/[id]/edit" />
        <Stack.Screen name="leistung/neu" />
        <Stack.Screen name="wettkampf/neu" />
        <Stack.Screen name="wettkampf/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
