import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import type { Dictionary, DictionaryId } from '@/domain/models';
import { Chip } from '@/ui/Chip';
import { spacing } from '@/ui/tokens';

interface DictionaryChipsProps {
  dictionaries: readonly Pick<Dictionary, 'id' | 'name'>[];
  selected: DictionaryId | null;
  onSelect: (id: DictionaryId) => void;
}

/** One-tap dictionary choice for quick add. */
export function DictionaryChips({ dictionaries, selected, onSelect }: DictionaryChipsProps) {
  const { t } = useTranslation();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      accessibilityRole="radiogroup"
      accessibilityLabel={t('add.dictionary')}
      contentContainerStyle={styles.row}
    >
      {dictionaries.map((d) => (
        <Chip
          key={d.id}
          label={d.name}
          selected={d.id === selected}
          onPress={() => onSelect(d.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
  },
});
