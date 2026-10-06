import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useDictionaries } from '@/features/dictionaries/hooks/useDictionaries';
import { TodayReviewCard } from '@/features/review/components/TodayReviewCard';
import { useIncompleteCount, useWordList } from '@/features/words/hooks/useWords';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { spacing } from '@/ui/tokens';

const RECENT_COUNT = 3;

/** Today (docs/05-ux.md): the review card, the Inbox entry and recently added words. */
export function TodayScreen() {
  const { t } = useTranslation();
  const dictionaries = useDictionaries();
  const incomplete = useIncompleteCount();
  const recent = useWordList({ sort: 'recent', limit: RECENT_COUNT });
  const recentWords = recent.data?.pages[0]?.items.slice(0, RECENT_COUNT) ?? [];
  const dictionaryName = (id: string) => dictionaries.data?.find((d) => d.id === id)?.name ?? '';
  const prompted = useRef(false);

  // First launch: no dictionary yet, so open the one-sheet setup once.
  useEffect(() => {
    if (dictionaries.isSuccess && dictionaries.data.length === 0 && !prompted.current) {
      prompted.current = true;
      router.push('/dictionary/new?first=1');
    }
  }, [dictionaries.isSuccess, dictionaries.data]);

  const count = incomplete.data ?? 0;
  return (
    <Screen title={t('tabs.today')} padded={false}>
      <TodayReviewCard />
      {count > 0 ? (
        <ListRow
          title={t('today.inbox', { count })}
          accessibilityHint={t('today.inboxHint')}
          onPress={() => router.push('/inbox')}
        />
      ) : null}
      {recentWords.length > 0 ? (
        <View>
          <Text variant="heading" style={styles.heading}>
            {t('today.recentlyAdded')}
          </Text>
          {recentWords.map((word) => (
            <ListRow
              key={word.id}
              title={word.term}
              subtitle={dictionaryName(word.dictionaryId)}
              onPress={() => router.push(`/word/${word.id}`)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
});
