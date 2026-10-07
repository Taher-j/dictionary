import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Word } from '@/domain/models';
import { gradeTyping, type TypingGrade } from '@/domain/practice/grade';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { TextField } from '@/ui/TextField';
import { radius, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

export interface TypingCardProps {
  word: Word;
  /** Saves the rating; the card then shows feedback until Continue. */
  onAnswer: (grade: TypingGrade) => Promise<void>;
  /** "I was right": the saved rating becomes Good. */
  onOverride: () => Promise<void>;
  onContinue: () => void;
  busy: boolean;
}

/** Recall by typing: the meaning is shown, the word is typed (docs/04-learning-system.md). */
export function TypingCard({ word, onAnswer, onOverride, onContinue, busy }: TypingCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [grade, setGrade] = useState<TypingGrade | null>(null);
  const meaning = [word.translation, word.definition].filter(Boolean).join('. ');

  const check = async () => {
    if (text.trim() === '' || busy) return;
    const result = gradeTyping(text, word.term);
    await onAnswer(result);
    setGrade(result);
  };

  const feedback = grade
    ? grade.result === 'exact'
      ? t('review.correct')
      : grade.result === 'close'
        ? t('review.almost', { answer: grade.expected })
        : t('review.wrong', { answer: word.term })
    : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text variant="caption" tone="muted" style={styles.center}>
        {t('review.recallPrompt')}
      </Text>
      <Text variant="meaning" style={styles.center}>
        {meaning}
      </Text>
      <TextField
        label={t('review.typeLabel')}
        hideLabel
        placeholder={t('review.typePlaceholder')}
        value={text}
        onChangeText={setText}
        editable={grade === null}
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
        autoComplete="off"
        returnKeyType="done"
        onSubmitEditing={() => void check()}
      />
      {grade === null ? (
        <Button
          label={t('review.check')}
          disabled={text.trim() === '' || busy}
          onPress={() => void check()}
        />
      ) : (
        <>
          <Text
            variant="label"
            tone={grade.result === 'wrong' ? 'danger' : 'default'}
            accessibilityLiveRegion="polite"
            style={styles.center}
          >
            {grade.result === 'exact' ? '✓ ' : grade.result === 'wrong' ? '✗ ' : ''}
            {feedback}
          </Text>
          {grade.result !== 'exact' ? (
            <TextButton
              label={t('review.iWasRight')}
              disabled={busy}
              onPress={async () => {
                await onOverride();
                onContinue();
              }}
            />
          ) : null}
          <Button label={t('review.continue')} disabled={busy} onPress={onContinue} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  center: {
    textAlign: 'center',
  },
});
