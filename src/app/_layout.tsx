import '@/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { RepositoriesProvider } from '@/data/RepositoriesProvider';
import { StartupError } from '@/features/startup/StartupError';
import { useAppStartup } from '@/features/startup/useAppStartup';
import { createQueryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { ToastHost } from '@/ui/ToastHost';

// Keep the splash screen up until the database is open and migrated.
void SplashScreen.preventAutoHideAsync();

// Deep links such as /add open on top of the tabs, so Back returns to the app.
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const { t } = useTranslation();
  const startup = useAppStartup();

  useEffect(() => {
    if (startup.status !== 'loading') void SplashScreen.hideAsync();
  }, [startup.status]);

  return (
    <QueryClientProvider client={queryClient}>
      <KeyboardProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          {startup.status === 'error' ? <StartupError error={startup.error} /> : null}
          {startup.status === 'ready' ? (
            <RepositoriesProvider value={startup.services}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="review"
                  options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
                />
                <Stack.Screen
                  name="add"
                  options={{ presentation: 'modal', title: t('add.title') }}
                />
                <Stack.Screen
                  name="dictionary/new"
                  options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents' }}
                />
                <Stack.Screen
                  name="dictionary/[id]/edit"
                  options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents' }}
                />
                <Stack.Screen name="dictionary/[id]" options={{ headerShown: true, title: '' }} />
                <Stack.Screen name="word/[id]" options={{ headerShown: true, title: '' }} />
                <Stack.Screen
                  name="inbox"
                  options={{ headerShown: true, title: t('inbox.title') }}
                />
                <Stack.Screen
                  name="trash"
                  options={{ headerShown: true, title: t('trash.title') }}
                />
                <Stack.Screen
                  name="tags/index"
                  options={{ headerShown: true, title: t('tags.title') }}
                />
                <Stack.Screen
                  name="tags/[id]"
                  options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents' }}
                />
                <Stack.Screen
                  name="dev"
                  options={{ presentation: 'modal', title: t('dev.title') }}
                />
              </Stack>
              <ToastHost />
            </RepositoriesProvider>
          ) : null}
        </ThemeProvider>
      </KeyboardProvider>
    </QueryClientProvider>
  );
}
