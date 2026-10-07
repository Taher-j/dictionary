import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { createContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, type AppTheme } from '@/ui/theme';

export const ThemeContext = createContext<AppTheme>(lightTheme);

interface ThemeProviderProps {
  children: ReactNode;
}

/** Follows the colour scheme; the Theme setting overrides it through `Appearance.setColorScheme`. */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.background,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}
