import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { PracticeMode } from '@/domain/practice/mode';
import {
  DEFAULT_PRACTICE_SETUP,
  PRACTICE_COUNTS,
  type PracticeSetup,
  type PracticeSource,
} from '@/domain/practice/practice';
import { useDictionaries } from '@/features/dictionaries/hooks/useDictionaries';
import { useStartPractice } from '@/features/review/hooks/useReview';
import { useSettings } from '@/features/settings/hooks/useSettings';
import { useTags } from '@/features/tags/hooks/useTags';
import { ActionSheet } from '@/ui/ActionSheet';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { showToast } from '@/ui/toastStore';
import { spacing } from '@/ui/tokens';

const MODES: readonly PracticeMode[] = ['flashcard', 'typing', 'choice'];
const MODE_KEYS = {
  flashcard: 'practice.modeFlashcard',
  typing: 'practice.modeTyping',
  choice: 'practice.modeChoice',
} as const;

/** Free practice setup (docs/04-learning-system.md): source, modes, count. Opens with the last one. */
export function PracticeSetupScreen() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const dictionaries = useDictionaries();
  const tags = useTags();
  const start = useStartPractice();
  const last = settings.lastPracticeSetup;
  const firstDictionary = dictionaries.data?.[0];
  const [source, setSource] = useState<PracticeSource | null>(last?.source ?? null);
  const [modes, setModes] = useState<PracticeMode[]>(last?.modes ?? DEFAULT_PRACTICE_SETUP.modes);
  const [count, setCount] = useState(last?.count ?? DEFAULT_PRACTICE_SETUP.count);
  const [picker, setPicker] = useState<'none' | 'dictionary' | 'tag'>('none');

  // Until something is chosen: the first dictionary.
  const chosen: PracticeSource | null =
    source ?? (firstDictionary ? { kind: 'dictionary', dictionaryId: firstDictionary.id } : null);
  const dictionaryName =
    chosen?.kind === 'dictionary'
      ? dictionaries.data?.find((d) => d.id === chosen.dictionaryId)?.name
      : undefined;
  const tagName =
    chosen?.kind === 'tag' ? tags.data?.find((tag) => tag.id === chosen.tagId)?.name : undefined;

  const toggleMode = (mode: PracticeMode) =>
    setModes((current) =>
      current.includes(mode)
        ? current.length > 1
          ? current.filter((m) => m !== mode)
          : current // at least one mode
        : MODES.filter((m) => m === mode || current.includes(m)),
    );

  const begin = async () => {
    if (!chosen) return;
    const setup: PracticeSetup = { source: chosen, modes, count };
    const started = await start.mutateAsync({ setup });
    if (!started) showToast(t('practice.nothing'));
  };

  return (
    <Screen
      edges={['bottom', 'left', 'right']}
      footer={
        <Button
          label={t('practice.start')}
          disabled={!chosen || start.isPending}
          onPress={() => void begin()}
        />
      }
    >
      <Text tone="muted">{t('practice.intro')}</Text>

      <Text variant="label" accessibilityRole="header">
        {t('practice.source')}
      </Text>
      <View accessibilityRole="radiogroup" style={styles.chips}>
        <Chip
          label={dictionaryName ?? t('practice.sourceDictionary')}
          accessibilityHint={t('filters.opensList')}
          selected={chosen?.kind === 'dictionary'}
          onPress={() => setPicker('dictionary')}
        />
        <Chip
          label={tagName ?? t('practice.sourceTag')}
          accessibilityHint={t('filters.opensList')}
          selected={chosen?.kind === 'tag'}
          onPress={() => setPicker('tag')}
        />
        <Chip
          label={t('practice.sourceWeak')}
          selected={chosen?.kind === 'weak'}
          onPress={() => setSource({ kind: 'weak' })}
        />
      </View>
      {chosen?.kind === 'weak' ? (
        <Text variant="caption" tone="muted">
          {t('practice.weakHint')}
        </Text>
      ) : null}

      <Text variant="label" accessibilityRole="header">
        {t('practice.modes')}
      </Text>
      <View style={styles.chips}>
        {MODES.map((mode) => (
          <Chip
            key={mode}
            role="checkbox"
            label={t(MODE_KEYS[mode])}
            selected={modes.includes(mode)}
            onPress={() => toggleMode(mode)}
          />
        ))}
      </View>
      <Text variant="caption" tone="muted">
        {t('practice.modesHint')}
      </Text>

      <Text variant="label" accessibilityRole="header">
        {t('practice.count')}
      </Text>
      <View accessibilityRole="radiogroup" style={styles.chips}>
        {PRACTICE_COUNTS.map((n) => (
          <Chip
            key={n}
            label={new Intl.NumberFormat(i18n.language).format(n)}
            selected={count === n}
            onPress={() => setCount(n)}
          />
        ))}
      </View>

      <ActionSheet
        visible={picker === 'dictionary'}
        title={t('practice.chooseDictionary')}
        onClose={() => setPicker('none')}
        actions={(dictionaries.data ?? []).map((d) => ({
          key: d.id,
          label: d.name,
          selected: chosen?.kind === 'dictionary' && chosen.dictionaryId === d.id,
          onPress: () => setSource({ kind: 'dictionary', dictionaryId: d.id }),
        }))}
      />
      <ActionSheet
        visible={picker === 'tag'}
        title={(tags.data ?? []).length === 0 ? t('filters.noTags') : t('practice.chooseTag')}
        onClose={() => setPicker('none')}
        actions={(tags.data ?? []).map((tag) => ({
          key: tag.id,
          label: tag.name,
          selected: chosen?.kind === 'tag' && chosen.tagId === tag.id,
          onPress: () => setSource({ kind: 'tag', tagId: tag.id }),
        }))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
