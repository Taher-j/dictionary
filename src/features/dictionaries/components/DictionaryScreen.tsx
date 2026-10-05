import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import type { DictionaryId, WordSort } from '@/domain/models';
import {
  useDeleteDictionary,
  useDictionary,
  useRestoreDictionary,
  useUpdateDictionary,
} from '@/features/dictionaries/hooks/useDictionaries';
import { WordList } from '@/features/words/components/WordList';
import { ActionSheet } from '@/ui/ActionSheet';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { IconButton } from '@/ui/IconButton';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { showToast } from '@/ui/toastStore';
import { spacing } from '@/ui/tokens';

export function DictionaryScreen({ id }: { id: DictionaryId }) {
  const { t } = useTranslation();
  const dictionary = useDictionary(id);
  const update = useUpdateDictionary();
  const remove = useDeleteDictionary();
  const restore = useRestoreDictionary();
  const [sort, setSort] = useState<WordSort>('alpha');
  const [menuOpen, setMenuOpen] = useState(false);
  const d = dictionary.data;

  const confirmDelete = () => {
    if (!d) return;
    Alert.alert(t('dictionary.deleteTitle', { name: d.name }), t('dictionary.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await remove.mutateAsync(id);
          router.back();
          showToast(t('dictionary.deleted', { name: d.name }), {
            label: t('common.undo'),
            onPress: () => restore.mutate(id),
          });
        },
      },
    ]);
  };

  return (
    <Screen
      scroll={false}
      padded={false}
      edges={['bottom', 'left', 'right']}
      footer={
        <Button
          label={t('dictionary.addWord')}
          onPress={() => router.push({ pathname: '/add', params: { dictionaryId: id } })}
        />
      }
    >
      <Stack.Screen
        options={{
          title: d?.name ?? '',
          headerRight: () => (
            <IconButton
              icon={{ ios: 'ellipsis.circle', android: 'more_vert', web: 'more_vert' }}
              accessibilityLabel={t('dictionary.menu')}
              onPress={() => setMenuOpen(true)}
            />
          ),
        }}
      />
      <View accessibilityRole="radiogroup" style={styles.sort}>
        <Chip
          label={t('dictionary.sortAlpha')}
          selected={sort === 'alpha'}
          onPress={() => setSort('alpha')}
        />
        <Chip
          label={t('dictionary.sortRecent')}
          selected={sort === 'recent'}
          onPress={() => setSort('recent')}
        />
      </View>
      <WordList
        query={{ dictionaryId: id, sort }}
        empty={
          <Text tone="muted" style={styles.empty}>
            {t('dictionary.empty')}
          </Text>
        }
      />
      <ActionSheet
        visible={menuOpen}
        title={d?.name}
        onClose={() => setMenuOpen(false)}
        actions={[
          {
            key: 'edit',
            label: t('dictionary.editNameLanguages'),
            onPress: () => router.push(`/dictionary/${id}/edit`),
          },
          {
            key: 'daily',
            label: d?.inDailyReview
              ? t('dictionary.dailyReviewOn')
              : t('dictionary.dailyReviewOff'),
            onPress: () => d && update.mutate({ id, patch: { inDailyReview: !d.inDailyReview } }),
          },
          { key: 'delete', label: t('common.delete'), destructive: true, onPress: confirmDelete },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sort: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  empty: {
    padding: spacing.md,
  },
});
