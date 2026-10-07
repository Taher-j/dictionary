import type { ConfigContext, ExpoConfig } from 'expo/config';

// Placeholders (see docs/08-decisions.md, Q1 and Q2). Change them here and nowhere else.
// The bundle id must be final before Milestone 5.
const APP_NAME = 'Dictionary';
const SLUG = 'dictionary-app';
const SCHEME = 'dictionaryapp';
const BUNDLE_ID = 'dev.placeholder.dictionaryapp';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: SLUG,
  scheme: SCHEME,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  platforms: ['android', 'ios'],
  ios: {
    bundleIdentifier: BUNDLE_ID,
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    [
      'expo-localization',
      {
        // UI languages (src/domain/language.ts). Declared so Android and iOS offer per-app language
        // choice, and so iOS lays the app out right to left when the device language is Arabic.
        supportedLocales: { ios: ['en', 'de', 'ar'], android: ['en', 'de', 'ar'] },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
