import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/ui/Text';
import { maxFontSizeMultiplier, minTouchTarget, radius, spacing, typography } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /** Visible label; also the accessibility label. */
  label: string;
  /** Shown below the field (help or validation). */
  hint?: ReactNode;
  /** Rendered inside the field at the end edge, e.g. a paste button. */
  accessory?: ReactNode;
  /** Visually hide the label (it stays the accessibility label). */
  hideLabel?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, accessory, hideLabel, multiline, ...rest },
  ref,
) {
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      {hideLabel ? null : (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      )}
      <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          multiline={multiline}
          style={[
            typography.body,
            styles.input,
            multiline && styles.multiline,
            { color: colors.text },
          ]}
          {...rest}
        />
        {accessory}
      </View>
      {hint}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    minHeight: minTouchTarget,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  multiline: {
    minHeight: minTouchTarget * 2,
    textAlignVertical: 'top',
  },
});
