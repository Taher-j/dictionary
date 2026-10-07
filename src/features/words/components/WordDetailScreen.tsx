import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { WordDetails, WordId } from '@/domain/models';
import { useDictionaries } from '@/features/dictionaries/hooks/useDictionaries';
import { useSetWordSuspended } from '@/features/review/hooks/useReview';
import { WordTags } from '@/features/tags/components/WordTags';
import { EditableField } from '@/features/words/components/EditableField';
import {
  useDeleteWords,
  useRestoreWords,
  useUpdateWord,
  useWord,
} from '@/features/words/hooks/useWords';
import { formatDate } from '@/lib/format';
import { ActionSheet } from '@/ui/ActionSheet';
import { IconButton } from '@/ui/IconButton';
import { Screen } from '@/ui/Screen';
import { StatusBadge } from '@/ui/StatusBadge';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { showToast } from '@/ui/toastStore';
import { spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

type DetailField = Exclude<keyof WordDetails, 'translation'>;
const DETAIL_FIELDS: readonly DetailField[] = [
  'definition',
  'partOfSpeech',
  'forms',
  'pronunciation',
  'example',
  'notes',
  'source',
];
const MULTILINE: ReadonlySet<DetailField> = new Set(['definition', 'example', 'notes']);

/** Word detail (docs/05-ux.md): tap a field to edit it in place. */
export function WordDetailScreen({ id }: { id: WordId }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const word = useWord(id);
  const dictionaries = useDictionaries();
  const update = useUpdateWord();
  const remove = useDeleteWords();
  const restore = useRestoreWords();
  const setSuspended = useSetWordSuspended();
  const [menu, setMenu] = useState<'none' | 'actions' | 'move'>('none');
  const [showEmpty, setShowEmpty] = useState(false);

  const data = word.data;
  if (word.isSuccess && !data) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <Text>{t('word.notFound')}</Text>
      </Screen>
    );
  }
  if (!data) return null;

  const w = data.word;
  const dictionaryName = dictionaries.data?.find((d) => d.id === w.dictionaryId)?.name ?? '';
  const save = (patch: Parameters<typeof update.mutate>[0]['patch']) =>
    update.mutate({ id, patch });
  const emptyFields = DETAIL_FIELDS.filter((f) => !w[f]);
  const visibleFields = showEmpty ? DETAIL_FIELDS : DETAIL_FIELDS.filter((f) => w[f]);

  const deleteWord = async () => {
    await remove.mutateAsync([id]);
    router.back();
    showToast(t('word.deleted', { term: w.term }), {
      label: t('common.undo'),
      onPress: () => restore.mutate([id]),
    });
  };

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          title: dictionaryName,
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon={
                  w.starred
                    ? { ios: 'star.fill', android: 'star', web: 'star' }
                    : { ios: 'star', android: 'star_outline', web: 'star_outline' }
                }
                tone={w.starred ? 'primary' : 'default'}
                accessibilityLabel={w.starred ? t('word.unstar') : t('word.star')}
                accessibilityState={{ checked: w.starred }}
                onPress={() => save({ starred: !w.starred })}
              />
              <IconButton
                icon={{ ios: 'ellipsis.circle', android: 'more_vert', web: 'more_vert' }}
                accessibilityLabel={t('word.menu')}
                onPress={() => setMenu('actions')}
              />
            </View>
          ),
        }}
      />

      <EditableField
        label={t('fields.term')}
        value={w.term}
        variant="title"
        required
        onSave={(value) => value && save({ term: value })}
      />
      <EditableField
        label={t('fields.translation')}
        value={w.translation}
        variant="meaning"
        onSave={(value) => save({ translation: value })}
      />
      {visibleFields.map((field) => (
        <EditableField
          key={field}
          label={t(`fields.${field}`)}
          value={w[field]}
          multiline={MULTILINE.has(field)}
          onSave={(value) => save({ [field]: value })}
        />
      ))}
      {!showEmpty && emptyFields.length > 0 ? (
        <TextButton label={t('word.addDetails')} onPress={() => setShowEmpty(true)} />
      ) : null}

      <WordTags wordId={id} />

      <View style={[styles.meta, { borderTopColor: colors.border }]}>
        <StatusBadge status={data.status} />
        {data.card &&
        data.status !== 'incomplete' &&
        data.status !== 'suspended' &&
        data.status !== 'new' ? (
          <Text variant="caption" tone="muted">
            {t('word.nextReview', { date: formatDate(data.card.due, i18n.language) })}
          </Text>
        ) : null}
        <Text variant="caption" tone="muted">
          {t('word.added', { date: formatDate(w.createdAt, i18n.language) })}
        </Text>
      </View>

      <ActionSheet
        visible={menu === 'actions'}
        title={w.term}
        onClose={() => setMenu('none')}
        actions={[
          { key: 'move', label: t('word.moveTo'), onPress: () => setMenu('move') },
          ...(data.card
            ? [
                {
                  key: 'suspend',
                  label: data.card.suspended ? t('word.unsuspend') : t('word.suspend'),
                  onPress: () =>
                    setSuspended.mutate({ wordId: id, suspended: !data.card?.suspended }),
                },
              ]
            : []),
          {
            key: 'delete',
            label: t('common.delete'),
            destructive: true,
            onPress: () => void deleteWord(),
          },
        ]}
      />
      <ActionSheet
        visible={menu === 'move'}
        title={t('word.moveTo')}
        onClose={() => setMenu('none')}
        actions={(dictionaries.data ?? []).map((d) => ({
          key: d.id,
          label: d.name,
          selected: d.id === w.dictionaryId,
          onPress: () => {
            if (d.id === w.dictionaryId) return;
            save({ dictionaryId: d.id });
            showToast(t('word.moved', { term: w.term, dictionary: d.name }));
          },
        }))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
  },
  meta: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
});
