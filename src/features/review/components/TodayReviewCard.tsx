import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { estimateMinutes } from '@/domain/queue';
import { useStartReview, useTodaySummary } from '@/features/review/hooks/useReview';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { radius, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

/** "12 to review · about 2 min", due and new counts, Start; or "All caught up". */
export function TodayReviewCard() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const summary = useTodaySummary();
  const start = useStartReview();

  if (!summary.data) return null;
  const { dueCount, newCount, nextDueAt } = summary.data;
  const total = dueCount + newCount;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {total > 0 ? (
        <>
          <Text variant="heading">
            {t('today.toReview', { count: total, minutes: estimateMinutes(total) })}
          </Text>
          <Text tone="muted">{t('today.dueAndNew', { due: dueCount, new: newCount })}</Text>
          <Button
            label={t('today.startReview')}
            disabled={start.isPending}
            onPress={() => start.mutate({})}
          />
        </>
      ) : (
        <>
          <Text variant="heading">{t('today.caughtUp')}</Text>
          {nextDueAt !== null ? (
            <Text tone="muted">
              {t('today.nextReview', { when: formatDateTime(nextDueAt, i18n.language) })}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
});
