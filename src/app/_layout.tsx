import '@/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { createQueryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/ui/ThemeProvider';

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const { t } = useTranslation();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add" options={{ presentation: 'modal', title: t('add.title') }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
