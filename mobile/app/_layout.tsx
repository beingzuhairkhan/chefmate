import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { ToastProvider } from '@/components';
import { colors } from '@/theme';
import { ApiError } from '@/lib/api';
import { loadBackendState, logout } from '@/lib/backend';
import { secureSession } from '@/lib/secureSession';

function RestoreSession() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void secureSession.getToken().then(async (token) => {
      if (!token || !active) return;
      try {
        await loadBackendState();
        if (active) router.replace('/app');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await logout();
          if (active) Alert.alert('Session expired', 'Please sign in again to continue.');
        } else if (active) {
          Alert.alert('Could not reconnect', error instanceof Error ? error.message : 'ChefMate could not restore your session.');
        }
      }
    }).catch((error: unknown) => {
      if (active) Alert.alert('Could not restore session', error instanceof Error ? error.message : 'Secure session storage is unavailable.');
    });
    return () => { active = false; };
  }, [router]);

  return null;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
  }));
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'left', 'right']}>
            <StatusBar style="dark" />
            <RestoreSession />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="signup" />
              <Stack.Screen name="forgot-password" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="app" />
            </Stack>
          </SafeAreaView>
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
