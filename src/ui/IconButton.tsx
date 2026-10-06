import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { minTouchTarget } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

export interface IconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  icon: SymbolViewProps['name'];
  /** Required: icon-only buttons need a spoken label. */
  accessibilityLabel: string;
  tone?: 'default' | 'primary';
  size?: number;
}

export function IconButton({
  icon,
  tone = 'default',
  size = 24,
  disabled,
  accessibilityState,
  ...rest
}: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled) }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...rest}
    >
      <SymbolView
        name={icon}
        size={size}
        tintColor={tone === 'primary' ? colors.primary : colors.text}
        accessible={false}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.35,
  },
});
