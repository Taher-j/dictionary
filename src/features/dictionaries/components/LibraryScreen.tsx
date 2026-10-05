import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useDictionaries, useMoveDictionary } from '@/features/dictionaries/hooks/useDictionaries';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { spacing } from '@/ui/tokens';

/** Dictionary list with word counts; create and reorder. Search arrives in Milestone 3. */
export function LibraryScreen() {
  const { t } = useTranslation();
  const dictionaries = useDictionaries();
  const move = useMoveDictionary();
  const [reordering, setReordering] = useState(false);
  const list = dictionaries.data ?? [];

  return (
    <Screen
      title={t('tabs.library')}
      padded={false}
      footer={
        <Button
          label={t('library.newDictionary')}
          variant="secondary"
          onPress={() => router.push('/dictionary/new')}
        />
      }
    >
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
    </Screen>
  );
}

const styles = StyleSheet.create({
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
