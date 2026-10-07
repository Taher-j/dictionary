import { StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/ui/Text';
import { minTouchTarget, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

export interface SwitchRowProps {
  label: string;
  /** One line under the label, e.g. what the setting changes. */
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

/** A setting row with an on/off switch; the whole row is one switch for screen readers. */
export function SwitchRow({ label, hint, value, onChange }: SwitchRowProps) {
  const { colors } = useTheme();
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => onChange(!value)}
    >
      <View style={styles.text}>
        <Text>{label}</Text>
        {hint ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        importantForAccessibility="no"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
});
