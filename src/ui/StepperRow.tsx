import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/ui/IconButton';
import { Text } from '@/ui/Text';
import { minTouchTarget, spacing } from '@/ui/tokens';

export interface StepperRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

/** A setting row with − and + buttons. Screen readers can also adjust it as one control. */
export function StepperRow({ label, value, min, max, step = 1, onChange }: StepperRowProps) {
  const { t, i18n } = useTranslation();
  const formatted = new Intl.NumberFormat(i18n.language).format(value);
  const change = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: formatted }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) =>
        change(event.nativeEvent.actionName === 'increment' ? step : -step)
      }
    >
      <Text style={styles.label}>{label}</Text>
      <IconButton
        icon={{ ios: 'minus.circle', android: 'remove_circle_outline', web: 'remove' }}
        accessibilityLabel={t('common.decrease', { label })}
        disabled={value <= min}
        onPress={() => change(-step)}
      />
      <Text variant="label" style={styles.value}>
        {formatted}
      </Text>
      <IconButton
        icon={{ ios: 'plus.circle', android: 'add_circle_outline', web: 'add' }}
        accessibilityLabel={t('common.increase', { label })}
        disabled={value >= max}
        onPress={() => change(step)}
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
    gap: spacing.xs,
  },
  label: {
    flex: 1,
  },
  value: {
    minWidth: 40,
    textAlign: 'center',
  },
});
