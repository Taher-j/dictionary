import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import type { ReviewStatus } from '@/domain/models';
import { useDictionaries } from '@/features/dictionaries/hooks/useDictionaries';
import { hasActiveFilter, useLibrarySearchStore } from '@/features/search/searchStore';
import { useTags } from '@/features/tags/hooks/useTags';
import { ActionSheet, type SheetAction } from '@/ui/ActionSheet';
import { Chip } from '@/ui/Chip';
import { TextButton } from '@/ui/TextButton';
import { spacing } from '@/ui/tokens';

const STATUSES: readonly ReviewStatus[] = ['new', 'learning', 'young', 'mature', 'suspended'];

type Picker = 'none' | 'dictionary' | 'tag' | 'status';

/** Filter chips under the Library search field. Dictionary, tag and status open a picker. */
export function FilterBar() {
  const { t } = useTranslation();
  const filter = useLibrarySearchStore((s) => s.filter);
  const setFilter = useLibrarySearchStore((s) => s.setFilter);
  const clearFilter = useLibrarySearchStore((s) => s.clearFilter);
  const dictionaries = useDictionaries();
  const tags = useTags();
  const [picker, setPicker] = useState<Picker>('none');

  const dictionaryName = dictionaries.data?.find((d) => d.id === filter.dictionaryId)?.name;
  const tagName = tags.data?.find((tag) => tag.id === filter.tagId)?.name;
  const statusName = filter.status ? t(`status.${filter.status}`) : undefined;

  let title: string | undefined;
  let actions: SheetAction[] = [];
  if (picker === 'dictionary') {
    title = t('filters.dictionary');
    actions = [
      {
        key: 'any',
        label: t('filters.anyDictionary'),
        selected: !filter.dictionaryId,
        onPress: () => setFilter({ dictionaryId: undefined }),
      },
      ...(dictionaries.data ?? []).map((d) => ({
        key: d.id,
        label: d.name,
        selected: d.id === filter.dictionaryId,
        onPress: () => setFilter({ dictionaryId: d.id }),
      })),
    ];
  } else if (picker === 'tag') {
    const list = tags.data ?? [];
    title = list.length === 0 ? t('filters.noTags') : t('filters.tag');
    actions = [
      {
        key: 'any',
        label: t('filters.anyTag'),
        selected: !filter.tagId,
        onPress: () => setFilter({ tagId: undefined }),
      },
      ...list.map((tag) => ({
        key: tag.id,
        label: tag.name,
        selected: tag.id === filter.tagId,
        onPress: () => setFilter({ tagId: tag.id }),
      })),
    ];
  } else if (picker === 'status') {
    title = t('filters.status');
    actions = [
      {
        key: 'any',
        label: t('filters.anyStatus'),
        selected: !filter.status,
        onPress: () => setFilter({ status: undefined }),
      },
      // A status needs a meaning, so it replaces the "needs meaning" filter.
      ...STATUSES.map((status) => ({
        key: status,
        label: t(`status.${status}`),
        selected: status === filter.status,
        onPress: () => setFilter({ status, incomplete: undefined }),
      })),
    ];
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bar}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        <Chip
          role="button"
          label={dictionaryName ?? t('filters.dictionary')}
          accessibilityLabel={
            dictionaryName
              ? t('filters.valueLabel', { filter: t('filters.dictionary'), value: dictionaryName })
              : t('filters.dictionary')
          }
          accessibilityHint={t('filters.opensList')}
          selected={Boolean(dictionaryName)}
          onPress={() => setPicker('dictionary')}
        />
        <Chip
          role="button"
          label={tagName ?? t('filters.tag')}
          accessibilityLabel={
            tagName
              ? t('filters.valueLabel', { filter: t('filters.tag'), value: tagName })
              : t('filters.tag')
          }
          accessibilityHint={t('filters.opensList')}
          selected={Boolean(tagName)}
          onPress={() => setPicker('tag')}
        />
        <Chip
          role="button"
          label={statusName ?? t('filters.status')}
          accessibilityLabel={
            statusName
              ? t('filters.valueLabel', { filter: t('filters.status'), value: statusName })
              : t('filters.status')
          }
          accessibilityHint={t('filters.opensList')}
          selected={Boolean(statusName)}
          onPress={() => setPicker('status')}
        />
        <Chip
          role="checkbox"
          label={t('filters.starred')}
          selected={Boolean(filter.starred)}
          onPress={() => setFilter({ starred: filter.starred ? undefined : true })}
        />
        <Chip
          role="checkbox"
          label={t('filters.incomplete')}
          selected={Boolean(filter.incomplete)}
          onPress={() =>
            setFilter(
              filter.incomplete
                ? { incomplete: undefined }
                : { incomplete: true, status: undefined },
            )
          }
        />
        {hasActiveFilter(filter) ? (
          <TextButton label={t('filters.clear')} onPress={clearFilter} />
        ) : null}
      </ScrollView>
      <ActionSheet
        visible={picker !== 'none'}
        title={title}
        actions={actions}
        onClose={() => setPicker('none')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    // A ScrollView grows by default; the chip row keeps its own height.
    flexGrow: 0,
  },
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
});
