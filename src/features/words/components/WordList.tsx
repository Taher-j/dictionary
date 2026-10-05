import { FlashList } from '@shopify/flash-list';
import type { ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { DictionaryId, WordListItem, WordQuery } from '@/domain/models';
import { WordRow } from '@/features/words/components/WordRow';
import { useWordList } from '@/features/words/hooks/useWords';
import { spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

interface WordListProps {
  query: WordQuery;
  /** Rendered above the rows (scrolls with them). */
  header?: ReactElement;
  /** Rendered when the list is empty. */
  empty?: ReactElement;
  /** Subtitle per row; defaults to the meaning. */
  subtitleFor?: (dictionaryId: DictionaryId) => string | undefined;
}

/** Keyset-paged FlashList of words: loads the next page near the end. */
export function WordList({ query, header, empty, subtitleFor }: WordListProps) {
  const { colors } = useTheme();
  const list = useWordList(query);
  const items: WordListItem[] = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <FlashList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <WordRow word={item} subtitle={subtitleFor?.(item.dictionaryId)} />}
      onEndReached={() => {
        if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
      }}
      onEndReachedThreshold={1}
      ListHeaderComponent={header}
      ListEmptyComponent={list.isSuccess ? empty : null}
      ListFooterComponent={
        list.isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={colors.textMuted} />
          </View>
        ) : null
      }
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    padding: spacing.md,
  },
});
