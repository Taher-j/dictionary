import { router } from 'expo-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import type { WordListItem } from '@/domain/models';
import { ListRow } from '@/ui/ListRow';
import { StatusBadge } from '@/ui/StatusBadge';

interface WordRowProps {
  word: WordListItem;
  /** Shown instead of the meaning, e.g. the dictionary name in the Inbox. */
  subtitle?: string;
}

export const WordRow = memo(function WordRow({ word, subtitle }: WordRowProps) {
  const { t } = useTranslation();
  const meaning = word.translation ?? word.definition;
  return (
    <ListRow
      title={word.term}
      subtitle={subtitle ?? meaning ?? t('word.noMeaning')}
      trailing={<StatusBadge status={word.status} />}
      accessibilityLabel={t('word.rowLabel', {
        term: word.term,
        meaning: subtitle ?? meaning ?? t('word.noMeaning'),
        status: t(`status.${word.status}`),
      })}
      onPress={() => router.push(`/word/${word.id}`)}
    />
  );
});
