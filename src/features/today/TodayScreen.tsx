import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { useDictionaries } from '@/features/dictionaries/hooks/useDictionaries';
import { useIncompleteCount } from '@/features/words/hooks/useWords';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { spacing } from '@/ui/tokens';

/** Today. The review card arrives in Milestone 4; for now: first launch and the Inbox entry. */
export function TodayScreen() {
  const { t } = useTranslation();
  const dictionaries = useDictionaries();
  const incomplete = useIncompleteCount();
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
      <Text tone="muted" style={styles.intro}>
        {t('today.reviewComingSoon')}
      </Text>
      {count > 0 ? (
        <ListRow
          title={t('today.inbox', { count })}
          accessibilityHint={t('today.inboxHint')}
          onPress={() => router.push('/inbox')}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    paddingHorizontal: spacing.md,
  },
});
