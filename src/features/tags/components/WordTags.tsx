import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Tag, WordId } from '@/domain/models';
import { termKeys } from '@/domain/termKeys';
import { useLibrarySearchStore } from '@/features/search/searchStore';
import {
  useAddWordTag,
  useRemoveWordTag,
  useTagSuggestions,
  useWordTags,
} from '@/features/tags/hooks/useTags';
import { ActionSheet } from '@/ui/ActionSheet';
import { Chip } from '@/ui/Chip';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { TextField } from '@/ui/TextField';
import { spacing } from '@/ui/tokens';

/** The word's tags: tap one for options; "Add tag" suggests existing tags while typing. */
export function WordTags({ wordId }: { wordId: WordId }) {
  const { t } = useTranslation();
  const wordTags = useWordTags(wordId);
  const add = useAddWordTag();
  const remove = useRemoveWordTag();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Tag | null>(null);
  const suggestions = useTagSuggestions(adding ? name : '');

  const current = wordTags.data ?? [];
  const currentIds = new Set(current.map((tag) => tag.id));
  const typed = name.trim();
  const typedNorm = typed === '' ? '' : termKeys(typed).norm;
  const options = (suggestions.data ?? []).filter((tag) => !currentIds.has(tag.id));
  const exists =
    (suggestions.data ?? []).some((tag) => tag.nameNorm === typedNorm) ||
    current.some((tag) => tag.nameNorm === typedNorm);

  const addTag = (tagName: string) => {
    if (tagName.trim() === '') return;
    add.mutate({ wordId, name: tagName });
    setName('');
    setAdding(false);
  };

  const showWords = (tag: Tag) => {
    const store = useLibrarySearchStore.getState();
    store.setText('');
    store.clearFilter();
    store.setFilter({ tagId: tag.id });
    router.navigate('/library');
  };

  return (
    <View style={styles.root}>
      <Text variant="caption" tone="muted">
        {t('tags.title')}
      </Text>
      <View style={styles.chips}>
        {current.map((tag) => (
          <Chip
            key={tag.id}
            role="button"
            label={tag.name}
            accessibilityLabel={t('tags.chipLabel', { name: tag.name })}
            accessibilityHint={t('tags.chipHint')}
            selected={false}
            onPress={() => setSelected(tag)}
          />
        ))}
        {adding ? null : <TextButton label={t('tags.add')} onPress={() => setAdding(true)} />}
      </View>

      {adding ? (
        <View style={styles.adding}>
          <TextField
            label={t('tags.name')}
            hideLabel
            placeholder={t('tags.placeholder')}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => addTag(name)}
            onBlur={() => {
              if (typed === '') setAdding(false);
            }}
          />
          <View style={styles.chips}>
            {options.map((tag) => (
              <Chip
                key={tag.id}
                role="button"
                label={tag.name}
                selected={false}
                onPress={() => addTag(tag.name)}
              />
            ))}
            {typed !== '' && !exists ? (
              <TextButton label={t('tags.create', { name: typed })} onPress={() => addTag(typed)} />
            ) : null}
          </View>
        </View>
      ) : null}

      <ActionSheet
        visible={selected !== null}
        title={selected?.name}
        onClose={() => setSelected(null)}
        actions={
          selected
            ? [
                {
                  key: 'show',
                  label: t('tags.showWords'),
                  onPress: () => showWords(selected),
                },
                {
                  key: 'remove',
                  label: t('tags.removeFromWord'),
                  destructive: true,
                  onPress: () => remove.mutate({ wordId, tagId: selected.id }),
                },
              ]
            : []
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  adding: {
    gap: spacing.sm,
  },
});
