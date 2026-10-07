import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { CardDirection, Word } from '@/domain/models';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { Text } from '@/ui/Text';
import { radius, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

const FLIP_MS = 300;

export interface FlashCardProps {
  word: Word;
  /** Recognition: the term, then the meaning. Recall: the meaning, then the term. */
  direction: CardDirection;
  revealed: boolean;
  onReveal: () => void;
  /** The dictionary's term language, for the speak button on the back. */
  termLang?: string | null;
}

/**
 * A flashcard in either direction. Tap anywhere to reveal. Flips; with reduced motion it
 * crossfades. Screen readers hear the prompt and a hint, then focus moves to the answer.
 */
export function FlashCard({ word, direction, revealed, onReveal, termLang }: FlashCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(revealed ? 1 : 0);
  const answerRef = useRef<View>(null);

  useEffect(() => {
    // A new card starts face up without animation; a reveal animates. The styles below pick a
    // crossfade under reduced motion, so the timing always runs (Reanimated would skip it).
    progress.value = revealed
      ? withTiming(1, { duration: FLIP_MS, reduceMotion: ReduceMotion.Never })
      : 0;
    if (revealed && answerRef.current) {
      AccessibilityInfo.sendAccessibilityEvent(answerRef.current, 'focus');
    }
  }, [revealed, word.id, progress]);

  const frontStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - progress.value }
      : {
          opacity: progress.value < 0.5 ? 1 : 0,
          transform: [
            { perspective: 1000 },
            { rotateY: `${interpolate(progress.value, [0, 1], [0, 180])}deg` },
          ],
        },
  );
  const backStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: progress.value }
      : {
          opacity: progress.value >= 0.5 ? 1 : 0,
          transform: [
            { perspective: 1000 },
            { rotateY: `${interpolate(progress.value, [0, 1], [180, 360])}deg` },
          ],
        },
  );

  const faceStyle = [styles.face, { backgroundColor: colors.surface, borderColor: colors.border }];
  const recall = direction === 'recall';
  const meaning = answerLabel(word);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[StyleSheet.absoluteFill, frontStyle]}
        pointerEvents={revealed ? 'none' : 'auto'}
        importantForAccessibility={revealed ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={revealed}
      >
        <Pressable
          style={faceStyle}
          onPress={onReveal}
          accessibilityRole="button"
          accessibilityLabel={recall ? `${t('review.recallPrompt')} ${meaning}` : word.term}
          accessibilityHint={t('review.revealHint')}
        >
          {recall ? (
            <Text variant="caption" tone="muted" style={styles.center}>
              {t('review.recallPrompt')}
            </Text>
          ) : null}
          <Text variant={recall ? 'meaning' : 'title'} style={styles.center}>
            {recall ? meaning : word.term}
          </Text>
          <Text variant="caption" tone="muted" style={styles.center}>
            {t('review.tapToReveal')}
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[StyleSheet.absoluteFill, backStyle]}
        pointerEvents={revealed ? 'auto' : 'none'}
        importantForAccessibility={revealed ? 'auto' : 'no-hide-descendants'}
        accessibilityElementsHidden={!revealed}
      >
        <View style={faceStyle}>
          <ScrollView contentContainerStyle={styles.back}>
            {recall ? (
              <View ref={answerRef} accessible accessibilityLabel={word.term}>
                <Text variant="title" style={styles.center}>
                  {word.term}
                </Text>
              </View>
            ) : (
              <Text variant="heading" style={styles.center}>
                {word.term}
              </Text>
            )}
            <View style={styles.speak}>
              <SpeakButton text={word.term} language={termLang} />
            </View>
            <View ref={recall ? undefined : answerRef} accessible accessibilityLabel={meaning}>
              {word.translation ? (
                <Text variant="meaning" style={styles.center}>
                  {word.translation}
                </Text>
              ) : null}
              {word.definition ? <Text style={styles.center}>{word.definition}</Text> : null}
            </View>
            {word.example ? (
              <Text tone="muted" style={[styles.center, styles.example]}>
                {word.example}
              </Text>
            ) : null}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

/** What a screen reader reads when focus moves to the answer. */
function answerLabel(word: Word): string {
  return [word.translation, word.definition].filter(Boolean).join('. ');
}

const styles = StyleSheet.create({
  speak: {
    alignItems: 'center',
  },
  container: {
    flex: 1,
    minHeight: 240,
  },
  face: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backfaceVisibility: 'hidden',
  },
  back: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  center: {
    textAlign: 'center',
  },
  example: {
    fontStyle: 'italic',
  },
});
