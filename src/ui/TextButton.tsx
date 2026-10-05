import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Text } from '@/ui/Text';
import { minTouchTarget, spacing } from '@/ui/tokens';

export interface TextButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  tone?: 'primary' | 'danger' | 'muted';
}

/** A low-emphasis text button (links, "Restore", "Add details"), still 48 dp tall. */
export function TextButton({
  label,
  tone = 'primary',
  accessibilityLabel,
  ...rest
}: TextButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      {...rest}
    >
      <Text variant="label" tone={tone}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
