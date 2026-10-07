import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { SEARCH_LIMIT } from '@/data/repositories/wordRepository';
import type { DictionaryId, WordListItem } from '@/domain/models';
import { useDictionaries } from '@/features/dictionaries/hooks/useDictionaries';
import { GroupedWordList } from '@/features/search/components/GroupedWordList';
import { useLibrarySearchStore } from '@/features/search/searchStore';
import { useWordList, useWordSearch } from '@/features/words/hooks/useWords';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Text } from '@/ui/Text';
import { spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

const SEARCH_DEBOUNCE_MS = 150;

/**
 * Library results: search hits when there is text, otherwise every word matching the filters,
 * paged. Both are grouped by dictionary (docs/05-ux.md).
 */
export function LibraryResults() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const text = useLibrarySearchStore((s) => s.text);
  const filter = useLibrarySearchStore((s) => s.filter);
  const dictionaries = useDictionaries();
  const query = useDebouncedValue(text, SEARCH_DEBOUNCE_MS).trim();
  const searching = query !== '';

  const search = useWordSearch(query, filter, searching);
  const list = useWordList({ ...filter, sort: 'grouped' });

  const position = new Map((dictionaries.data ?? []).map((d, index) => [d.id, index]));
  const nameFor = (id: DictionaryId) => dictionaries.data?.find((d) => d.id === id)?.name ?? '';

  let items: WordListItem[];
  let loaded: boolean;
  if (searching) {
    // Search hits come best match first; group them in Library order, keeping that order inside.
    items = [...(search.data ?? [])].sort(
      (a, b) => (position.get(a.dictionaryId) ?? 0) - (position.get(b.dictionaryId) ?? 0),
    );
    loaded = search.isSuccess;
  } else {
    items = list.data?.pages.flatMap((p) => p.items) ?? [];
    loaded = list.isSuccess;
  }

  return (
    <GroupedWordList
      items={items}
      nameFor={nameFor}
      onEndReached={() => {
        if (!searching && list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
      }}
      empty={
        loaded ? (
          <Text tone="muted" style={styles.note}>
            {t('library.noResults')}
          </Text>
        ) : null
      }
      footer={
        searching && items.length >= SEARCH_LIMIT ? (
          <Text variant="caption" tone="muted" style={styles.note}>
            {t('library.searchLimit', { count: SEARCH_LIMIT })}
          </Text>
        ) : !searching && list.isFetchingNextPage ? (
          <View style={styles.note}>
            <ActivityIndicator color={colors.textMuted} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  note: {
    padding: spacing.md,
  },
});
