import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { TRASH_RETENTION_DAYS } from '@/domain/trash';
import { useRestoreDictionary } from '@/features/dictionaries/hooks/useDictionaries';
import { useTrashedDictionaries, useTrashedWords } from '@/features/trash/useTrash';
import { useRestoreWords } from '@/features/words/hooks/useWords';
import { formatDate } from '@/lib/format';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { showToast } from '@/ui/toastStore';
import { spacing } from '@/ui/tokens';

/** Trashed dictionaries and words; everything here is deleted for good after 30 days. */
export function TrashScreen() {
  const { t, i18n } = useTranslation();
  const words = useTrashedWords();
  const dictionaries = useTrashedDictionaries();
  const restoreWords = useRestoreWords();
  const restoreDictionary = useRestoreDictionary();
  const items = words.data?.pages.flatMap((p) => p.items) ?? [];
  const deletedOn = (ms: number) => t('trash.deletedOn', { date: formatDate(ms, i18n.language) });

  const header = (
    <View>
      <Text tone="muted" style={styles.note}>
        {t('trash.note', { count: TRASH_RETENTION_DAYS })}
      </Text>
      {(dictionaries.data ?? []).map((d) => (
        <ListRow
          key={d.id}
          title={t('trash.dictionaryTitle', { name: d.name })}
          subtitle={deletedOn(d.deletedAt ?? 0)}
          trailing={
            <TextButton
              label={t('trash.restore')}
              accessibilityLabel={t('trash.restoreLabel', { name: d.name })}
              onPress={() =>
                restoreDictionary.mutate(d.id, {
                  onSuccess: () => showToast(t('trash.restored', { name: d.name })),
                })
              }
            />
          }
        />
      ))}
    </View>
  );

  const isEmpty =
    words.isSuccess &&
    dictionaries.isSuccess &&
    items.length === 0 &&
    (dictionaries.data ?? []).length === 0;

  return (
    <Screen scroll={false} padded={false} edges={['bottom', 'left', 'right']}>
      <FlashList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          isEmpty ? (
            <Text tone="muted" style={styles.note}>
              {t('trash.empty')}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <ListRow
            title={item.term}
            subtitle={t('trash.wordSubtitle', {
              dictionary: item.dictionaryName,
              deleted: deletedOn(item.deletedAt),
            })}
            trailing={
              <TextButton
                label={t('trash.restore')}
                accessibilityLabel={t('trash.restoreLabel', { name: item.term })}
                onPress={() =>
                  restoreWords.mutate([item.id], {
                    onSuccess: () => showToast(t('trash.restored', { name: item.term })),
                  })
                }
              />
            }
          />
        )}
        onEndReached={() => {
          if (words.hasNextPage && !words.isFetchingNextPage) void words.fetchNextPage();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    padding: spacing.md,
  },
});
