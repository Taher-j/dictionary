import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/ui/Text';
import { minTouchTarget, radius, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityHint?: string;
  /** `radio` in a single-choice group (default), `checkbox` for a toggle, `button` to open a picker. */
  role?: 'radio' | 'checkbox' | 'button';
  /** Defaults to the label. */
  accessibilityLabel?: string;
}

/** A selectable pill. Selection shows as fill and a check-like weight change, not colour alone. */
export function Chip({
  label,
  selected,
  onPress,
  accessibilityHint,
  role = 'radio',
  accessibilityLabel = label,
}: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'button' ? { selected } : { checked: selected }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text variant="label" style={{ color: selected ? colors.onPrimary : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
