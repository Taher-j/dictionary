import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resolveLanguage } from '@/domain/language';
import ar from '@/i18n/locales/ar.json';
import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';

export const defaultNS = 'translation';
export const resources = {
  en: { translation: en },
  de: { translation: de },
  ar: { translation: ar },
} as const;

/** The device's (or, on Android 13+ and iOS, the app's own) preferred language code. */
export function deviceLanguage(): string | null {
  return getLocales()[0]?.languageCode ?? null;
}

// Resources are bundled, so init is synchronous and t() works on the first render.
export const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  defaultNS,
  // The saved preference is applied at startup, before the splash screen hides.
  lng: resolveLanguage('system', deviceLanguage()),
  fallbackLng: 'en',
  initAsync: false,
  interpolation: { escapeValue: false },
});
