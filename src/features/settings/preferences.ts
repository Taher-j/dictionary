import { Appearance, I18nManager } from 'react-native';

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

  // Saved natively and read at the next launch. Right to left only ever follows the device
  // language (Arabic is not offered in Settings), so forcing is never needed.
  const rtl = isRtlLanguage(resolved);
  I18nManager.allowRTL(rtl);
  return { restartNeeded: I18nManager.isRTL !== rtl };
}
