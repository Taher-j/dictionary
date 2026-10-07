import { isRtlLanguage, resolveLanguage } from '@/domain/language';

describe('resolveLanguage', () => {
  it('follows a supported device language, including Arabic', () => {
    expect(resolveLanguage('system', 'de')).toBe('de');
    expect(resolveLanguage('system', 'ar')).toBe('ar');
    expect(resolveLanguage('system', 'en')).toBe('en');
  });

  it('falls back to English for other device languages', () => {
    expect(resolveLanguage('system', 'fr')).toBe('en');
    expect(resolveLanguage('system', null)).toBe('en');
  });

  it('uses an explicit choice whatever the device language', () => {
    expect(resolveLanguage('de', 'ar')).toBe('de');
    expect(resolveLanguage('en', 'de')).toBe('en');
  });

  it('marks Arabic as right to left', () => {
    expect(isRtlLanguage('ar')).toBe(true);
    expect(isRtlLanguage('de')).toBe(false);
  });
});
