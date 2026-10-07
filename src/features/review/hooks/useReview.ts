import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { cardKeys, reviewKeys, wordKeys } from '@/data/queryKeys';
import { useRepositories } from '@/data/RepositoriesProvider';
import type { Card, CardId, EpochMs, Rating, ReviewLogId, Word, WordId } from '@/domain/models';
import { buildChoice, seededRandom, type Choice } from '@/domain/practice/choice';
import type { PracticeMode } from '@/domain/practice/mode';
import type { PracticeSetup } from '@/domain/practice/practice';
import { becameLeech } from '@/domain/practice/weakWords';
import { buildQueue } from '@/domain/queue';
import { createScheduler } from '@/domain/scheduler';
import { useReviewSessionStore } from '@/features/review/sessionStore';
import { useSetSetting, useSettings } from '@/features/settings/hooks/useSettings';
import { i18n } from '@/i18n';
import { systemClock } from '@/lib/clock';

const DAY_MS = 86_400_000;

/** One scheduler for the app; its defaults come from docs/04-learning-system.md. */
export const scheduler = createScheduler();

/** Injected so session code stays testable; the app uses the system clock. */
export const reviewClock = systemClock;

/** Reviews change card states: Today's counts, word statuses and card details. */
function invalidateReviewData(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
  void queryClient.invalidateQueries({ queryKey: cardKeys.all });
  void queryClient.invalidateQueries({ queryKey: wordKeys.all });
}

export function useTodaySummary() {
  const { reviews } = useRepositories();
  const { dailyNewLimit } = useSettings();
  return useQuery({
    queryKey: [...reviewKeys.today(), dailyNewLimit],
    queryFn: () => reviews.todaySummary(dailyNewLimit),
    // Cards become due with time alone (learning steps, the 04:00 rollover); the query is a
    // cheap local count.
    refetchInterval: 60 * 1000,
  });
}

export function useDueTomorrowCount() {
  const { reviews } = useRepositories();
  return useQuery({
    queryKey: reviewKeys.dueTomorrow(),
    queryFn: () => reviews.dueTomorrowCount(),
  });
}

/**
 * Builds a fresh queue from the database and opens the session screen. "Keep going" passes
 * `inPlace` because the session screen is already open.
 */
export function useStartReview() {
  const { reviews } = useRepositories();
  const { dailyNewLimit, sessionSize } = useSettings();
  const start = useReviewSessionStore((s) => s.start);
  return useMutation({
    mutationFn: async (_options: { inPlace?: boolean } = {}) => {
      const candidates = await reviews.queueCandidates({ dailyNewLimit, sessionSize });
      const queue = buildQueue({ ...candidates, sessionSize });
      if (queue.length === 0) return false;
      const sessionId = await reviews.startSession();
      start(
        sessionId,
        queue.map(({ cardId, wordId }) => ({ cardId, wordId })),
        reviewClock(),
      );
      return true;
    },
    onSuccess: (started, options) => {
      if (started && !options.inPlace) router.push('/review');
    },
  });
}

/**
 * Free practice (docs/04-learning-system.md): a random sample from the setup's source, in the
 * setup's modes. Remembers the setup for next time. False when no card matches.
 */
export function useStartPractice() {
  const { reviews } = useRepositories();
  const setSetting = useSetSetting();
  const start = useReviewSessionStore((s) => s.start);
  return useMutation({
    mutationFn: async ({ setup }: { setup: PracticeSetup; inPlace?: boolean }) => {
      await setSetting.mutateAsync({ key: 'lastPracticeSetup', value: setup });
      const queue = await reviews.practiceCandidates(setup.source, setup.count);
      if (queue.length === 0) return false;
      const sessionId = await reviews.startSession('practice', JSON.stringify(setup));
      start(
        sessionId,
        queue.map(({ cardId, wordId }) => ({ cardId, wordId })),
        reviewClock(),
        { kind: 'practice', setup },
      );
      return true;
    },
    onSuccess: (started, { inPlace }) => {
      if (started && !inPlace) router.push('/review');
    },
  });
}

/** The card on screen with its word. Word edits invalidate cardKeys, so this refreshes. */
export function useReviewCard(cardId: CardId | null) {
  const { cards, words } = useRepositories();
  return useQuery({
    queryKey: cardKeys.detail(cardId ?? ('' as CardId)),
    enabled: cardId !== null,
    queryFn: async () => {
      const card = cardId ? await cards.getById(cardId) : null;
      const word = card ? await words.getById(card.wordId) : null;
      return card && word ? { card, word } : null;
    },
  });
}

/** What the session needs to move on after a saved answer. */
export interface SavedAnswer {
  logId: ReviewLogId;
  rating: Rating;
  due: EpochMs;
  now: EpochMs;
}

/** Moves the session on after a saved answer (typing and choice wait for "Continue"). */
export function advanceSession(saved: SavedAnswer) {
  const { logId, rating, due, now } = saved;
  useReviewSessionStore
    .getState()
    .dispatch({ type: 'answered', logId, rating, due, now }, reviewClock());
}

/**
 * Saves the answer first; the session advances only after the write succeeded. With
 * `advance: false` the caller shows feedback and calls `advanceSession` itself.
 */
export function useAnswer() {
  const { reviews, cards } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cardId,
      rating,
      mode,
    }: {
      cardId: CardId;
      rating: Rating;
      mode: PracticeMode;
      advance?: boolean;
    }): Promise<SavedAnswer & { leech: WordId | null }> => {
      const { sessionId, shownAt, kind } = useReviewSessionStore.getState();
      if (!sessionId) throw new Error('No active review session.');
      const now = reviewClock();
      const durationMs = Math.max(0, now - shownAt);
      if (kind === 'practice') {
        // Practice never schedules: only Again brings the card back in this session.
        const logId = await reviews.logPractice({ cardId, sessionId, rating, durationMs, mode });
        return { logId, rating, due: rating === 1 ? now : now + DAY_MS, now, leech: null };
      }
      const result = await reviews.answer({ cardId, sessionId, rating, durationMs, mode }, (prev) =>
        scheduler.apply(prev, rating, now),
      );
      const leech = becameLeech(result.previousLapses, result.card.lapses)
        ? result.card.wordId
        : null;
      return { logId: result.logId, rating, due: result.card.due, now, leech };
    },
    onSuccess: ({ leech, ...saved }, { advance = true }) => {
      if (advance) advanceSession(saved);
      invalidateReviewData(queryClient);
      if (leech) promptLeech(leech, cards, queryClient);
    },
  });
}

/**
 * A card just reached 8 lapses (docs/04-learning-system.md): offer once to edit the word (an
 * example or a memory aid helps) or to suspend it.
 */
function promptLeech(
  wordId: WordId,
  cards: ReturnType<typeof useRepositories>['cards'],
  queryClient: QueryClient,
) {
  Alert.alert(i18n.t('review.leechTitle'), i18n.t('review.leechBody'), [
    { text: i18n.t('review.leechLater'), style: 'cancel' },
    { text: i18n.t('review.leechEdit'), onPress: () => router.push(`/word/${wordId}`) },
    {
      text: i18n.t('review.leechSuspend'),
      onPress: async () => {
        await cards.setSuspendedForWord(wordId, true);
        useReviewSessionStore.getState().dispatch({ type: 'suspended', wordId }, reviewClock());
        invalidateReviewData(queryClient);
      },
    },
  ]);
}

/**
 * "I was right" after a typed answer: the saved rating is replaced by Good (undo, then answer),
 * so still exactly one rating per card reaches the scheduler.
 */
export function useOverrideAnswer() {
  const { reviews } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardId, saved }: { cardId: CardId; saved: SavedAnswer }) => {
      const { sessionId, kind } = useReviewSessionStore.getState();
      if (!sessionId) throw new Error('No active review session.');
      if (kind === 'practice') {
        await reviews.undoPractice(saved.logId);
        const logId = await reviews.logPractice({
          cardId,
          sessionId,
          rating: 3,
          durationMs: null,
          mode: 'typing',
        });
        return { logId, rating: 3, due: saved.now + DAY_MS, now: saved.now } as SavedAnswer;
      }
      await reviews.undoAnswer(saved.logId);
      const result = await reviews.answer(
        { cardId, sessionId, rating: 3, durationMs: null, mode: 'typing' },
        (prev) => scheduler.apply(prev, 3, saved.now),
      );
      return {
        logId: result.logId,
        rating: 3,
        due: result.card.due,
        now: saved.now,
      } as SavedAnswer;
    },
    onSuccess: () => invalidateReviewData(queryClient),
  });
}

/** Multiple-choice options for a card, stable for the card (seeded by its id). Null: too few words. */
export function useChoice(card: Card | null, word: Word | null) {
  const { words } = useRepositories();
  return useQuery({
    // Not under cardKeys: answers invalidate those, and the options must not change mid-card.
    queryKey: ['choice', card?.id ?? ''],
    enabled: card !== null && word !== null,
    staleTime: Infinity,
    queryFn: async (): Promise<Choice | null> => {
      if (!card || !word) return null;
      const pool = await words.choicePool(word.dictionaryId, word.id);
      const side = (w: { term: string; meaning: string }) =>
        card.direction === 'recall' ? w.term : w.meaning;
      const correct = {
        wordId: word.id,
        text: side({ term: word.term, meaning: word.translation ?? word.definition ?? '' }),
        partOfSpeech: word.partOfSpeech,
      };
      return buildChoice(
        correct,
        pool.map((w) => ({ wordId: w.id, text: side(w), partOfSpeech: w.partOfSpeech })),
        seededRandom(card.id),
      );
    },
  });
}

export function useUndoAnswer() {
  const { reviews } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { session, kind } = useReviewSessionStore.getState();
      const last = session?.lastAnswer;
      if (!last) return false;
      if (kind === 'practice') await reviews.undoPractice(last.logId);
      else await reviews.undoAnswer(last.logId);
      return true;
    },
    onSuccess: (undone) => {
      if (!undone) return;
      useReviewSessionStore.getState().dispatch({ type: 'undone' }, reviewClock());
      invalidateReviewData(queryClient);
    },
  });
}

/** Suspend ("I know this") or unsuspend a word; an active session drops the word's cards. */
export function useSetWordSuspended() {
  const { cards } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ wordId, suspended }: { wordId: WordId; suspended: boolean }) => {
      await cards.setSuspendedForWord(wordId, suspended);
      return { wordId, suspended };
    },
    onSuccess: ({ wordId, suspended }) => {
      if (suspended) {
        useReviewSessionStore.getState().dispatch({ type: 'suspended', wordId }, reviewClock());
      }
      invalidateReviewData(queryClient);
    },
  });
}

export function useEndReview() {
  const { reviews } = useRepositories();
  return useMutation({
    mutationFn: async () => {
      const { sessionId, clear } = useReviewSessionStore.getState();
      clear();
      if (sessionId) await reviews.endSession(sessionId);
    },
  });
}
