import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { maxFontSizeMultiplier, typography } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

export type TextVariant = keyof typeof typography;
export type TextTone = 'default' | 'muted' | 'primary' | 'danger';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
}

export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    primary: colors.primary,
    danger: colors.danger,
  }[tone];

  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      accessibilityRole={variant === 'title' || variant === 'heading' ? 'header' : undefined}
      style={[typography[variant], { color }, style]}
      {...rest}
    />
  );
}
