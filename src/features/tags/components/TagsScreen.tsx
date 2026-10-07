import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet } from 'react-native';

import type { TagWithCount } from '@/domain/models';
import { useDeleteTag, useMergeTag, useTagsWithCounts } from '@/features/tags/hooks/useTags';
import { ActionSheet } from '@/ui/ActionSheet';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { showToast } from '@/ui/toastStore';
import { spacing } from '@/ui/tokens';

/** Settings → Tags: every tag with its word count; rename, merge into another tag, delete. */
export function TagsScreen() {
  const { t } = useTranslation();
  const tags = useTagsWithCounts();
  const merge = useMergeTag();
  const remove = useDeleteTag();
  const [selected, setSelected] = useState<TagWithCount | null>(null);
  const [menu, setMenu] = useState<'none' | 'actions' | 'merge'>('none');
  const list = tags.data ?? [];
  const others = list.filter((tag) => tag.id !== selected?.id);

  const close = () => setMenu('none');

  const confirmMerge = (source: TagWithCount, target: TagWithCount) => {
    Alert.alert(
      t('tags.mergeTitle', { source: source.name, target: target.name }),
      t('tags.mergeBody', { count: source.wordCount, source: source.name, target: target.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('tags.merge'),
          onPress: async () => {
            await merge.mutateAsync({ sourceId: source.id, targetId: target.id });
            showToast(t('tags.merged', { source: source.name, target: target.name }));
          },
        },
      ],
    );
  };

  const confirmDelete = (tag: TagWithCount) => {
    Alert.alert(
      t('tags.deleteTitle', { name: tag.name }),
      t('tags.deleteBody', { count: tag.wordCount }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await remove.mutateAsync(tag.id);
            showToast(t('tags.deleted', { name: tag.name }));
          },
        },
      ],
    );
  };

  return (
    <Screen padded={false} edges={['bottom', 'left', 'right']}>
      {tags.isSuccess && list.length === 0 ? (
        <Text tone="muted" style={styles.empty}>
          {t('tags.empty')}
        </Text>
      ) : null}
      {list.map((tag) => (
        <ListRow
          key={tag.id}
          title={tag.name}
          subtitle={t('tags.wordCount', { count: tag.wordCount })}
          onPress={() => {
            setSelected(tag);
            setMenu('actions');
          }}
        />
      ))}

      <ActionSheet
        visible={menu === 'actions'}
        title={selected?.name}
        onClose={close}
        actions={
          selected
            ? [
                {
                  key: 'rename',
                  label: t('tags.rename'),
                  onPress: () => router.push(`/tags/${selected.id}`),
                },
                {
                  key: 'merge',
                  label: t('tags.mergeInto'),
                  onPress: () => setMenu('merge'),
                },
                {
                  key: 'delete',
                  label: t('tags.delete'),
                  destructive: true,
                  onPress: () => confirmDelete(selected),
                },
              ]
            : []
        }
      />
      <ActionSheet
        visible={menu === 'merge'}
        title={others.length === 0 ? t('tags.mergeEmpty') : t('tags.mergeInto')}
        onClose={close}
        actions={others.map((target) => ({
          key: target.id,
          label: target.name,
          onPress: () => {
            if (selected) confirmMerge(selected, target);
          },
        }))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    padding: spacing.md,
  },
});
