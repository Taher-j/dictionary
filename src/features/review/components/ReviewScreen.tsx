import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CardState, type Rating } from '@/domain/models';
import type { Choice } from '@/domain/practice/choice';
import { pickMode, type PracticeMode } from '@/domain/practice/mode';
import { pickPracticeMode } from '@/domain/practice/practice';
import { currentCard, isFinished } from '@/domain/session';
import { useDictionaries } from '@/features/dictionaries/hooks/useDictionaries';
import { ChoiceCard } from '@/features/review/components/ChoiceCard';
import { FlashCard } from '@/features/review/components/FlashCard';
import { RatingButtons } from '@/features/review/components/RatingButtons';
import { SessionSummary } from '@/features/review/components/SessionSummary';
import { TypingCard } from '@/features/review/components/TypingCard';
import {
  advanceSession,
  reviewClock,
  scheduler,
  useAnswer,
  useChoice,
  useOverrideAnswer,
  type SavedAnswer,
  useEndReview,
  useReviewCard,
  useSetWordSuspended,
  useUndoAnswer,
} from '@/features/review/hooks/useReview';
import { useReviewSessionStore } from '@/features/review/sessionStore';
import { useLightHaptic } from '@/features/settings/hooks/useHaptics';
import { useSettings } from '@/features/settings/hooks/useSettings';
import { ActionSheet } from '@/ui/ActionSheet';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { showToast } from '@/ui/toastStore';
import { radius, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

/** Review session (docs/05-ux.md): reveal, rate, undo, edit, "I know this", then the summary. */
export function ReviewScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const session = useReviewSessionStore((s) => s.session);
  const dispatch = useReviewSessionStore((s) => s.dispatch);
  const kind = useReviewSessionStore((s) => s.kind);
  const setup = useReviewSessionStore((s) => s.setup);
  const practice = kind === 'practice' && setup !== null;
  const current = session ? currentCard(session) : null;
  const card = useReviewCard(current?.cardId ?? null);
  const { flashcardsOnly } = useSettings();
  const dictionaries = useDictionaries();
  const choice = useChoice(card.data?.card ?? null, card.data?.word ?? null);
  const answer = useAnswer();
  const override = useOverrideAnswer();
  // An answer saved by typing or choice, waiting for "Continue".
  const [saved, setSaved] = useState<SavedAnswer | null>(null);
  // Mode and options are fixed when a card appears: saving an answer changes the card's state,
  // which must not switch the mode (or reshuffle the options) while feedback is shown.
  const [attempt, setAttempt] = useState<{
    key: string;
    mode: PracticeMode;
    choice: Choice | null;
  } | null>(null);
  const undo = useUndoAnswer();
  const suspend = useSetWordSuspended();
  const end = useEndReview();
  const haptic = useLightHaptic();
  const [menuOpen, setMenuOpen] = useState(false);

  // No session (for example after the app was restarted on this screen): nothing to show.
  if (!session) return <Screen>{null}</Screen>;

  if (isFinished(session)) {
    return (
      <SessionSummary
        answered={session.answered}
        goodOrEasy={session.goodOrEasy}
        missed={session.missed}
      />
    );
  }

  const data = card.data;
  const remaining = session.queue.length;
  const total = session.answered + remaining;
  const busy = answer.isPending || undo.isPending || override.isPending;
  // Choice is only possible for new and learning cards; wait for its options before deciding.
  const needsChoice = practice
    ? setup.modes.includes('choice')
    : !flashcardsOnly &&
      data !== null &&
      data !== undefined &&
      data.card.state !== CardState.Review;
  // Per-attempt state resets for every card shown, including a requeued repeat.
  const attemptKey = `${current?.cardId ?? ''}-${session.answered}`;
  const nextMode =
    data && (!needsChoice || choice.isSuccess)
      ? practice
        ? pickPracticeMode(data.card, setup.modes, session.answered, Boolean(choice.data))
        : pickMode(data.card, { flashcardsOnly, choiceAvailable: Boolean(choice.data) })
      : null;
  if (nextMode && attempt?.key !== attemptKey) {
    setAttempt({ key: attemptKey, mode: nextMode, choice: choice.data ?? null });
  }
  const mode = attempt?.key === attemptKey ? attempt.mode : null;
  const options = attempt?.key === attemptKey ? attempt.choice : null;

  const save = async (rating: Rating) => {
    if (!current) return;
    haptic();
    try {
      setSaved(
        await answer.mutateAsync({
          cardId: current.cardId,
          rating,
          mode: mode ?? 'flashcard',
          advance: false,
        }),
      );
    } catch (error) {
      showToast(t('review.saveFailed'));
      throw error;
    }
  };

  const continueSession = () => {
    if (!saved) return;
    advanceSession(saved);
    setSaved(null);
  };

  const close = async () => {
    await end.mutateAsync();
    router.back();
  };

  const rate = (rating: Rating) => {
    if (!current || busy) return;
    haptic();
    answer.mutate(
      { cardId: current.cardId, rating, mode: 'flashcard' },
      { onError: () => showToast(t('review.saveFailed')) },
    );
  };

  return (
    <Screen
      padded={false}
      scroll={false}
      footer={
        mode !== 'flashcard' ? null : session.revealed && data ? (
          <RatingButtons
            preview={practice ? undefined : scheduler.preview(data.card, reviewClock())}
            disabled={busy}
            onRate={rate}
          />
        ) : (
          <Button
            label={t('review.showAnswer')}
            disabled={!data}
            onPress={() => dispatch({ type: 'reveal' }, reviewClock())}
          />
        )
      }
    >
      <View style={styles.header}>
        <IconButton
          icon={{ ios: 'xmark', android: 'close', web: 'close' }}
          accessibilityLabel={t('review.close')}
          onPress={() => void close()}
        />
        <View style={styles.headerEnd}>
          <IconButton
            icon={{ ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' }}
            accessibilityLabel={t('review.undo')}
            disabled={!session.lastAnswer || busy || saved !== null}
            onPress={() =>
              undo.mutate(undefined, { onError: () => showToast(t('review.saveFailed')) })
            }
          />
          <IconButton
            icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            accessibilityLabel={t('review.edit')}
            disabled={!current}
            onPress={() => current && router.push(`/word/${current.wordId}`)}
          />
          <IconButton
            icon={{ ios: 'ellipsis.circle', android: 'more_vert', web: 'more_vert' }}
            accessibilityLabel={t('review.menu')}
            onPress={() => setMenuOpen(true)}
          />
        </View>
      </View>

      <View style={styles.progressRow}>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={t('review.progressLabel')}
          accessibilityValue={{ min: 0, max: total, now: session.answered }}
          style={[styles.track, { backgroundColor: colors.surface }]}
        >
          <View
            style={[
              styles.fill,
              {
                backgroundColor: colors.primary,
                width: `${total === 0 ? 100 : (session.answered / total) * 100}%`,
              },
            ]}
          />
        </View>
        <Text variant="caption" tone="muted">
          {t('review.remaining', { count: remaining })}
        </Text>
      </View>

      {mode === 'flashcard' && data ? (
        <View style={styles.card}>
          <FlashCard
            word={data.word}
            direction={data.card.direction}
            revealed={session.revealed}
            onReveal={() => dispatch({ type: 'reveal' }, reviewClock())}
            termLang={dictionaries.data?.find((d) => d.id === data.word.dictionaryId)?.termLang}
          />
        </View>
      ) : null}
      {mode === 'typing' && data ? (
        <ScrollView contentContainerStyle={styles.card} keyboardShouldPersistTaps="handled">
          <TypingCard
            key={attemptKey}
            word={data.word}
            busy={busy}
            onAnswer={(grade) => save(grade.rating)}
            onOverride={async () => {
              if (!saved || !current) return;
              setSaved(await override.mutateAsync({ cardId: current.cardId, saved }));
            }}
            onContinue={continueSession}
          />
        </ScrollView>
      ) : null}
      {mode === 'choice' && data && options ? (
        <ScrollView contentContainerStyle={styles.card}>
          <ChoiceCard
            key={attemptKey}
            direction={data.card.direction}
            prompt={
              data.card.direction === 'recall'
                ? [data.word.translation, data.word.definition].filter(Boolean).join('. ')
                : data.word.term
            }
            choice={options}
            busy={busy}
            onAnswer={save}
            onContinue={continueSession}
          />
        </ScrollView>
      ) : null}

      <ActionSheet
        visible={menuOpen}
        title={data?.word.term}
        onClose={() => setMenuOpen(false)}
        actions={[
          {
            key: 'suspend',
            label: t('review.knowThis'),
            onPress: () => {
              if (!current) return;
              const term = data?.word.term ?? '';
              suspend.mutate(
                { wordId: current.wordId, suspended: true },
                { onSuccess: () => showToast(t('review.suspended', { term })) },
              );
            },
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  headerEnd: {
    flexDirection: 'row',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  card: {
    flex: 1,
    padding: spacing.md,
  },
});
