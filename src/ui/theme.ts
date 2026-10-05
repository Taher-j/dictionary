import { palette } from '@/ui/tokens';

export interface ThemeColors {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  danger: string;
}

export interface AppTheme {
  scheme: 'light' | 'dark';
  colors: ThemeColors;
}

export const lightTheme: AppTheme = {
  scheme: 'light',
  colors: {
    background: palette.white,
    surface: palette.gray100,
    border: palette.gray300,
    text: palette.gray900,
    textMuted: palette.gray600,
    primary: palette.blue700,
    onPrimary: palette.white,
    danger: palette.red700,
  },
};

export const darkTheme: AppTheme = {
  scheme: 'dark',
  colors: {
    background: palette.gray950,
    surface: palette.gray925,
    border: palette.gray700,
    text: palette.gray100,
    textMuted: palette.gray400,
    primary: palette.blue300,
    onPrimary: palette.gray950,
    danger: palette.red300,
  },
};
