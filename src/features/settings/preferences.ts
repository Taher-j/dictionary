import { Alert, Appearance, I18nManager } from 'react-native';

import { isRtlLanguage, resolveLanguage } from '@/domain/language';
import type { Settings } from '@/domain/settings';
import { deviceLanguage, i18n } from '@/i18n';

/**
 * Applies the theme and UI language. Theme and language switch at once; the layout direction is
 * fixed for the app's lifetime, so a change to or from Arabic needs a restart (no expo-updates to
 * reload). Returns whether that restart is needed.
 */
export function applyPreferences({ theme, language }: Pick<Settings, 'theme' | 'language'>): {
  restartNeeded: boolean;
} {
  Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);

  const resolved = resolveLanguage(language, deviceLanguage());
  if (i18n.language !== resolved) void i18n.changeLanguage(resolved);

  // Saved natively and read at the next launch. Forced, not just allowed: on Android, React Native
  // takes the direction from the system language list, so an Arabic per-app language (Android
  // 13+) would get Arabic text in a left-to-right layout.
  const rtl = isRtlLanguage(resolved);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return { restartNeeded: I18nManager.isRTL !== rtl };
}

/** Asks for a restart when the layout direction no longer matches the UI language. */
export function promptRestart(): void {
  // i18n.t, not a component's t: the language may have changed in this same call.
  Alert.alert(i18n.t('settings.restartTitle'), i18n.t('settings.restartBody'));
}
