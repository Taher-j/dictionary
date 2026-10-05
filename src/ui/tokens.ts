// Design tokens. Components read colours through the theme, never raw hex values.
// Every text colour below reaches at least 4.5:1 against the backgrounds it is used on.

export const palette = {
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',
  gray950: '#0B0F14',
  gray925: '#161B22',
  blue300: '#93C5FD',
  blue700: '#1D4ED8',
  red300: '#FCA5A5',
  red700: '#B91C1C',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;

/** Minimum touch target: 48 dp on Android, which also covers the 44 pt iOS minimum. */
export const minTouchTarget = 48;

/** Text follows the system font scale up to 200%. */
export const maxFontSizeMultiplier = 2;
