import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Rating } from '@/domain/models';
import type { Choice } from '@/domain/practice/choice';
import { gradeChoice } from '@/domain/practice/grade';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { minTouchTarget, radius, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

export interface ChoiceCardProps {
  /** The term (recognition) or the meaning (recall). */
  prompt: string;
  direction: 'recognition' | 'recall';
  choice: Choice;
  onAnswer: (rating: Rating) => Promise<void>;
  onContinue: () => void;
  busy: boolean;
}

/** Multiple choice for new and learning cards: one tap, then the right answer is marked. */
export function ChoiceCard({
  prompt,
  direction,
  choice,
  onAnswer,
  onContinue,
  busy,
}: ChoiceCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [chosen, setChosen] = useState<number | null>(null);

  const choose = async (index: number) => {
    if (chosen !== null || busy) return;
    await onAnswer(gradeChoice(index, choice.correctIndex));
    setChosen(index);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text variant="caption" tone="muted" style={styles.center}>
        {direction === 'recall' ? t('review.chooseWord') : t('review.chooseMeaning')}
      </Text>
      <Text variant={direction === 'recall' ? 'meaning' : 'title'} style={styles.center}>
        {prompt}
      </Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {choice.options.map((option, index) => {
          const answered = chosen !== null;
          const isCorrect = index === choice.correctIndex;
          const isChosen = index === chosen;
          // Marks are text as well as colour (docs/05-ux.md).
          const mark = answered && isCorrect ? '✓ ' : answered && isChosen ? '✗ ' : '';
          return (
            <Pressable
              key={`${index}-${option}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: isChosen, disabled: answered }}
              accessibilityLabel={
                answered && isCorrect
                  ? t('review.optionCorrect', { option })
                  : answered && isChosen
                    ? t('review.optionWrong', { option })
                    : option
              }
              onPress={() => void choose(index)}
              style={({ pressed }) => [
                styles.option,
                {
                  borderColor:
                    answered && isCorrect
                      ? colors.primary
                      : answered && isChosen
                        ? colors.danger
                        : colors.border,
                  borderWidth: answered && (isCorrect || isChosen) ? 2 : StyleSheet.hairlineWidth,
                  backgroundColor: colors.background,
                },
                pressed && !answered && styles.pressed,
              ]}
            >
              <Text>
                {mark}
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {chosen !== null ? (
        <>
          <Text variant="label" accessibilityLiveRegion="polite" style={styles.center}>
            {chosen === choice.correctIndex ? t('review.correct') : t('review.notQuite')}
          </Text>
          <Button label={t('review.continue')} disabled={busy} onPress={onContinue} />
        </>
      ) : null}
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
  options: {
    gap: spacing.sm,
  },
  option: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  pressed: {
    opacity: 0.7,
  },
});
