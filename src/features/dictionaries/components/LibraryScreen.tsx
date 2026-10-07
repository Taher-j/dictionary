import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useDictionaries, useMoveDictionary } from '@/features/dictionaries/hooks/useDictionaries';
import { FilterBar } from '@/features/search/components/FilterBar';
import { LibraryResults } from '@/features/search/components/LibraryResults';
import { SearchField } from '@/features/search/components/SearchField';
import { hasActiveFilter, useLibrarySearchStore } from '@/features/search/searchStore';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { spacing } from '@/ui/tokens';

/**
 * Search field and filter chips over the dictionary list (docs/05-ux.md). With text or a filter
 * set, the matching words replace the list.
 */
export function LibraryScreen() {
  const { t } = useTranslation();
  const text = useLibrarySearchStore((s) => s.text);
  const setText = useLibrarySearchStore((s) => s.setText);
  const filter = useLibrarySearchStore((s) => s.filter);
  const showResults = text.trim() !== '' || hasActiveFilter(filter);
  const dictionaries = useDictionaries();
  const move = useMoveDictionary();
  const [reordering, setReordering] = useState(false);
  const list = dictionaries.data ?? [];

  return (
    <Screen
      title={t('tabs.library')}
      padded={false}
      scroll={false}
      footer={
        showResults ? null : (
          <Button
            label={t('library.newDictionary')}
            variant="secondary"
            onPress={() => router.push('/dictionary/new')}
          />
        )
      }
    >
      <View style={styles.search}>
        <SearchField value={text} onChangeText={setText} />
      </View>
      <FilterBar />
      {showResults ? (
        <View style={styles.results}>
          <LibraryResults />
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled">
          {list.length > 1 ? (
            <View style={styles.toolbar}>
              <TextButton
                label={reordering ? t('library.doneReordering') : t('library.reorder')}
                onPress={() => setReordering((r) => !r)}
              />
            </View>
          ) : null}

          {dictionaries.isSuccess && list.length === 0 ? (
            <Text tone="muted" style={styles.empty}>
              {t('library.empty')}
            </Text>
          ) : null}

          <View>
            {list.map((d, index) => (
              <ListRow
                key={d.id}
                title={d.icon ? t('library.nameWithIcon', { icon: d.icon, name: d.name }) : d.name}
                subtitle={
                  d.incompleteCount > 0
                    ? t('library.countsWithIncomplete', {
                        count: d.wordCount,
                        incomplete: d.incompleteCount,
                      })
                    : t('library.wordCount', { count: d.wordCount })
                }
                onPress={reordering ? undefined : () => router.push(`/dictionary/${d.id}`)}
                trailing={
                  reordering ? (
                    <View style={styles.reorder}>
                      <IconButton
                        icon={{
                          ios: 'chevron.up',
                          android: 'keyboard_arrow_up',
                          web: 'keyboard_arrow_up',
                        }}
                        accessibilityLabel={t('library.moveUp', { name: d.name })}
                        disabled={index === 0}
                        onPress={() => move.mutate({ id: d.id, direction: 'up' })}
                      />
                      <IconButton
                        icon={{
                          ios: 'chevron.down',
                          android: 'keyboard_arrow_down',
                          web: 'keyboard_arrow_down',
                        }}
                        accessibilityLabel={t('library.moveDown', { name: d.name })}
                        disabled={index === list.length - 1}
                        onPress={() => move.mutate({ id: d.id, direction: 'down' })}
                      />
                    </View>
                  ) : null
                }
              />
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    paddingHorizontal: spacing.md,
  },
  results: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  empty: {
    paddingHorizontal: spacing.md,
  },
  reorder: {
    flexDirection: 'row',
  },
});
