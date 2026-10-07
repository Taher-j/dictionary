/** UI languages with a translation. Arabic is only used when the device language is Arabic. */
export const APP_LANGUAGES = ['en', 'de', 'ar'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

/** Choices offered in Settings (08-decisions.md: Arabic is not offered, only followed). */
export const LANGUAGE_PREFERENCES = ['system', 'en', 'de'] as const;
export type LanguagePreference = (typeof LANGUAGE_PREFERENCES)[number];

const RTL_LANGUAGES: ReadonlySet<AppLanguage> = new Set(['ar']);

function isAppLanguage(code: string | null): code is AppLanguage {
  return (APP_LANGUAGES as readonly (string | null)[]).includes(code);
}

/** The UI language for a preference: the device language when supported, else English. */
export function resolveLanguage(
  preference: LanguagePreference,
  deviceLanguage: string | null,
): AppLanguage {
  if (preference !== 'system') return preference;
  return isAppLanguage(deviceLanguage) ? deviceLanguage : 'en';
}

export function isRtlLanguage(language: AppLanguage): boolean {
  return RTL_LANGUAGES.has(language);
}
