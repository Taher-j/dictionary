import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/i18n/locales/en.json';

export const defaultNS = 'translation';
export const resources = { en: { translation: en } } as const;

const supported = Object.keys(resources);
const deviceLanguage = getLocales()[0].languageCode ?? 'en';

// Resources are bundled, so init is synchronous and t() works on the first render.
export const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  defaultNS,
  lng: supported.includes(deviceLanguage) ? deviceLanguage : 'en',
  fallbackLng: 'en',
  initAsync: false,
  interpolation: { escapeValue: false },
});
