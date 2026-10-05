import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { WordStatus } from '@/domain/models';
import { Text } from '@/ui/Text';
import { spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';
import type { ThemeColors } from '@/ui/theme';

const dotColor: Record<WordStatus, keyof ThemeColors> = {
  incomplete: 'statusIncomplete',
  new: 'statusNew',
  learning: 'statusLearning',
  young: 'statusYoung',
  mature: 'statusMature',
  suspended: 'statusSuspended',
};

/** A small dot plus the status word: colour is never the only signal. */
export function StatusBadge({ status }: { status: WordStatus }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.badge}>
      <View
        style={[
          styles.dot,
          status === 'incomplete'
            ? { borderColor: colors[dotColor[status]], borderWidth: 2 }
            : { backgroundColor: colors[dotColor[status]] },
        ]}
      />
      <Text variant="caption" tone="muted">
        {t(`status.${status}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
