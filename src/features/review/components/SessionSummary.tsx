import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { reviewKeys } from '@/data/queryKeys';
import { useRepositories } from '@/data/RepositoriesProvider';
import type { Word } from '@/domain/models';
import type { SessionCard } from '@/domain/session';
import {
  useDueTomorrowCount,
  useEndReview,
  useStartPractice,
  useStartReview,
  useTodaySummary,
} from '@/features/review/hooks/useReview';
import { useReviewSessionStore } from '@/features/review/sessionStore';
import { formatPercent } from '@/lib/format';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { spacing } from '@/ui/tokens';

export interface SessionSummaryProps {
  answered: number;
  goodOrEasy: number;
  missed: readonly SessionCard[];
}

/** After the last card: counts, missed words (tap to edit), due tomorrow, Done / Keep going. */
export function SessionSummary({ answered, goodOrEasy, missed }: SessionSummaryProps) {
  const { t, i18n } = useTranslation();
  const { words } = useRepositories();
  const dueTomorrow = useDueTomorrowCount();
  const today = useTodaySummary();
  const end = useEndReview();
  const start = useStartReview();
  const startPractice = useStartPractice();
  const setup = useReviewSessionStore((s) => (s.kind === 'practice' ? s.setup : null));
  const missedWords = useQuery({
    queryKey: [...reviewKeys.all, 'missed', missed.map((m) => m.wordId)],
    queryFn: async () => {
      const found = await Promise.all(missed.map((m) => words.getById(m.wordId)));
      return found.filter((w): w is Word => w !== null);
    },
  });

  const waiting = (today.data?.dueCount ?? 0) + (today.data?.newCount ?? 0);
  const done = async () => {
    await end.mutateAsync();
    router.back();
  };
  const keepGoing = async () => {
    await end.mutateAsync();
    if (setup) startPractice.mutate({ setup, inPlace: true });
    else start.mutate({ inPlace: true });
  };

  return (
    <Screen
      title={t('review.summary.title')}
      footer={
        <>
          <Button label={t('review.summary.done')} onPress={() => void done()} />
          {setup ? (
            <Button
              variant="secondary"
              label={t('review.summary.practiceMore')}
              onPress={() => void keepGoing()}
            />
          ) : waiting > 0 ? (
            <Button
              variant="secondary"
              label={t('review.summary.keepGoing', { count: waiting })}
              onPress={() => void keepGoing()}
            />
          ) : null}
        </>
      }
    >
      <View style={styles.stats}>
        <Text>{t('review.summary.reviewed', { count: answered })}</Text>
        {answered > 0 ? (
          <Text>
            {t('review.summary.goodShare', {
              share: formatPercent(goodOrEasy / answered, i18n.language),
            })}
          </Text>
        ) : null}
        {setup ? (
          <Text tone="muted">{t('review.summary.practiceNote')}</Text>
        ) : dueTomorrow.data !== undefined ? (
          <Text tone="muted">{t('review.summary.dueTomorrow', { count: dueTomorrow.data })}</Text>
        ) : null}
      </View>

      {missedWords.data && missedWords.data.length > 0 ? (
        <View>
          <Text variant="heading">{t('review.summary.missed')}</Text>
          {missedWords.data.map((word) => (
            <ListRow
              key={word.id}
              title={word.term}
              subtitle={word.translation ?? word.definition}
              accessibilityHint={t('review.summary.editHint')}
              onPress={() => router.push(`/word/${word.id}`)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: {
    gap: spacing.xs,
  },
});
