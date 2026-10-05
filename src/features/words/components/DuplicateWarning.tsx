import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Dictionary, DictionaryId, DuplicateMatch } from '@/domain/models';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { spacing } from '@/ui/tokens';

interface DuplicateWarningProps {
  matches: readonly DuplicateMatch[];
  dictionaries: readonly Pick<Dictionary, 'id' | 'name'>[];
}

const tierOrder = { exact: 0, possible: 1, elsewhere: 2 } as const;

/** Warns, never blocks: exact match (with a link), possible match, or "Also in". */
export function DuplicateWarning({ matches, dictionaries }: DuplicateWarningProps) {
  const { t } = useTranslation();
  if (matches.length === 0) return null;
  const nameOf = (id: DictionaryId) => dictionaries.find((d) => d.id === id)?.name ?? '';
  const sorted = [...matches].sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]).slice(0, 3);

  return (
    <View accessibilityLiveRegion="polite" style={styles.root}>
      {sorted.map((m) => (
        <View key={m.wordId} style={styles.line}>
          <Text
            variant={m.tier === 'exact' ? 'body' : 'caption'}
            tone={m.tier === 'exact' ? 'danger' : 'muted'}
            style={styles.message}
          >
            {m.tier === 'exact'
              ? t('add.duplicateExact', { term: m.term })
              : m.tier === 'possible'
                ? t('add.duplicatePossible', { term: m.term })
                : t('add.duplicateElsewhere', { dictionary: nameOf(m.dictionaryId) })}
          </Text>
          <TextButton
            label={t('add.openWord')}
            accessibilityLabel={t('add.openWordLabel', { term: m.term })}
            onPress={() => router.push(`/word/${m.wordId}`)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  message: {
    flex: 1,
  },
});
