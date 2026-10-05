import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Text } from '@/ui/Text';
import { minTouchTarget, radius, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  /** Visible text; also the accessibility label unless one is given. */
  label: string;
  variant?: 'primary' | 'secondary';
}

export function Button({
  label,
  variant = 'primary',
  disabled,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary
          ? { backgroundColor: colors.primary }
          : { borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
        (pressed || disabled) && styles.dimmed,
      ]}
      {...rest}
    >
      <Text
        variant="label"
        style={{ color: isPrimary ? colors.onPrimary : colors.primary, textAlign: 'center' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.6,
  },
});
