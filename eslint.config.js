// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Import boundaries (docs/02-architecture.md). Flat config replaces a rule's options per file
// instead of merging them, so each file group below lists every restriction that applies to it.
const databaseImports = {
  group: [
    'drizzle-orm',
    'drizzle-orm/*',
    'drizzle-kit',
    'expo-sqlite',
    'expo-sqlite/*',
    'better-sqlite3',
  ],
  message: 'Only src/data may use the database. Go through a repository.',
};
const fsrsImports = {
  group: ['ts-fsrs', 'ts-fsrs/*'],
  message: 'Only src/domain/scheduler.ts may import ts-fsrs.',
};
const fileSystemImports = {
  group: ['expo-file-system', 'expo-file-system/*'],
  message: 'Only src/services may use the file system. Add or use a wrapper there.',
};
const domainForbiddenImports = {
  group: [
    'react',
    'react/*',
    'react-native',
    'react-native/*',
    'expo',
    'expo/*',
    'expo-*',
    '@expo/*',
    '@/*',
    '!@/domain',
    '!@/domain/*',
  ],
  message: 'src/domain is plain TypeScript: no React, React Native, Expo or other app layers.',
};

const restrictImports = (...patterns) => ['error', { patterns }];

// Logical style properties only (docs/05-ux.md): marginStart, paddingEnd, start, end, ...
const physicalStyleKey = '/^(margin|padding)(Left|Right)$|^(left|right)$|^border(Left|Right)/';
const physicalStyleMessage =
  'Use logical style properties (marginStart, paddingEnd, start, end, ...) instead of left/right.';

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'android/*',
      'ios/*',
      '.expo/*',
      'dist/*',
      'expo-env.d.ts',
      'src/data/db/migrations/*',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // No hard-coded UI strings: every visible string goes through t().
      'react/jsx-no-literals': ['error', { noStrings: true, ignoreProps: true }],
      'no-restricted-syntax': [
        'error',
        { selector: `Property[key.name=${physicalStyleKey}]`, message: physicalStyleMessage },
        { selector: `Property[key.value=${physicalStyleKey}]`, message: physicalStyleMessage },
        {
          selector: "Property[key.name='textAlign'][value.value=/^(left|right)$/]",
          message: "Use textAlign: 'auto' or 'center'; left/right do not flip for RTL.",
        },
      ],
      'no-restricted-imports': restrictImports(databaseImports, fsrsImports, fileSystemImports),
    },
  },
  {
    files: ['src/data/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictImports(fsrsImports, fileSystemImports),
    },
  },
  {
    files: ['src/services/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictImports(databaseImports, fsrsImports),
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': restrictImports(
        domainForbiddenImports,
        databaseImports,
        fsrsImports,
      ),
    },
  },
  {
    files: ['src/domain/scheduler.ts'],
    rules: {
      'no-restricted-imports': restrictImports(domainForbiddenImports, databaseImports),
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      // Test names and fixtures are not UI.
      'react/jsx-no-literals': 'off',
    },
  },
]);
