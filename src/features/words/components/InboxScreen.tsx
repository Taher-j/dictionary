import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import type { DictionaryId } from '@/domain/models';
import { useDictionaries } from '@/features/dictionaries/hooks/useDictionaries';
import { WordList } from '@/features/words/components/WordList';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { spacing } from '@/ui/tokens';

/** Words without a meaning, newest first; each row shows its dictionary. */
export function InboxScreen() {
  const { t } = useTranslation();
  const dictionaries = useDictionaries();
  const nameOf = (id: DictionaryId) => dictionaries.data?.find((d) => d.id === id)?.name;

  return (
    <Screen scroll={false} padded={false} edges={['bottom', 'left', 'right']}>
      <WordList
        query={{ incomplete: true, sort: 'recent' }}
        subtitleFor={nameOf}
        header={
          <Text tone="muted" style={styles.intro}>
            {t('inbox.intro')}
          </Text>
        }
        empty={
          <Text tone="muted" style={styles.intro}>
            {t('inbox.empty')}
          </Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    padding: spacing.md,
  },
});
