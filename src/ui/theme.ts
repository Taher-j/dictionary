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
  /** Status dot colours. Status is always shown with text too, never by colour alone. */
  statusIncomplete: string;
  statusNew: string;
  statusLearning: string;
  statusYoung: string;
  statusMature: string;
  statusSuspended: string;
  /** Translucent layer behind sheets and dialogs. */
  backdrop: string;
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
    statusIncomplete: palette.gray400,
    statusNew: palette.blue700,
    statusLearning: palette.amber600,
    statusYoung: palette.green600,
    statusMature: palette.green800,
    statusSuspended: palette.gray600,
    backdrop: 'rgba(0, 0, 0, 0.4)',
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
    statusIncomplete: palette.gray600,
    statusNew: palette.blue300,
    statusLearning: palette.amber300,
    statusYoung: palette.green300,
    statusMature: palette.green500,
    statusSuspended: palette.gray400,
    backdrop: 'rgba(0, 0, 0, 0.6)',
  },
};
