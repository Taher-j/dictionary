import { FlashList } from '@shopify/flash-list';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import type { DictionaryId, WordListItem } from '@/domain/models';
import { WordRow } from '@/features/words/components/WordRow';
import { Text } from '@/ui/Text';
import { spacing } from '@/ui/tokens';

type Row =
  | { type: 'header'; key: string; title: string }
  | { type: 'word'; key: string; word: WordListItem };

/** Inserts a header row wherever the dictionary changes. Items must be grouped already. */
function toRows(items: readonly WordListItem[], nameFor: (id: DictionaryId) => string): Row[] {
  const rows: Row[] = [];
  let current: DictionaryId | null = null;
  for (const word of items) {
    if (word.dictionaryId !== current) {
      current = word.dictionaryId;
      rows.push({ type: 'header', key: `h:${current}`, title: nameFor(current) });
    }
    rows.push({ type: 'word', key: word.id, word });
  }
  return rows;
}

interface GroupedWordListProps {
  /** Grouped by dictionary (consecutive). */
  items: readonly WordListItem[];
  nameFor: (id: DictionaryId) => string;
  onEndReached?: () => void;
  header?: ReactElement | null;
  footer?: ReactElement | null;
  empty?: ReactElement | null;
}

/** Word rows under one header per dictionary. */
export function GroupedWordList({
  items,
  nameFor,
  onEndReached,
  header,
  footer,
  empty,
}: GroupedWordListProps) {
  return (
    <FlashList
      data={toRows(items, nameFor)}
      keyExtractor={(row) => row.key}
      getItemType={(row) => row.type}
      renderItem={({ item: row }) =>
        row.type === 'header' ? (
          <View style={styles.header}>
            <Text variant="label" tone="muted" accessibilityRole="header">
              {row.title}
            </Text>
          </View>
        ) : (
          <WordRow word={row.word} />
        )
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={1}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={empty}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
});
