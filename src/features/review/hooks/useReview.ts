import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { cardKeys, reviewKeys, wordKeys } from '@/data/queryKeys';
import { useRepositories } from '@/data/RepositoriesProvider';
import type { Card, CardId, EpochMs, Rating, ReviewLogId, Word, WordId } from '@/domain/models';
import { buildChoice, seededRandom, type Choice } from '@/domain/practice/choice';
import { buildQueue } from '@/domain/queue';
import { createScheduler } from '@/domain/scheduler';
import { useReviewSessionStore } from '@/features/review/sessionStore';
import { useSettings } from '@/features/settings/hooks/useSettings';
import { systemClock } from '@/lib/clock';

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
  const { reviews } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cardId,
      rating,
    }: {
      cardId: CardId;
      rating: Rating;
      advance?: boolean;
    }): Promise<SavedAnswer> => {
      const { sessionId, shownAt } = useReviewSessionStore.getState();
      if (!sessionId) throw new Error('No active review session.');
      const now = reviewClock();
      const result = await reviews.answer(
        { cardId, sessionId, rating, durationMs: Math.max(0, now - shownAt) },
        (prev) => scheduler.apply(prev, rating, now),
      );
      return { logId: result.logId, rating, due: result.card.due, now };
    },
    onSuccess: (saved, { advance = true }) => {
      if (advance) advanceSession(saved);
      invalidateReviewData(queryClient);
    },
  });
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
      const { sessionId } = useReviewSessionStore.getState();
      if (!sessionId) throw new Error('No active review session.');
      await reviews.undoAnswer(saved.logId);
      const result = await reviews.answer(
        { cardId, sessionId, rating: 3, durationMs: null },
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
      const last = useReviewSessionStore.getState().session?.lastAnswer;
      if (!last) return false;
      await reviews.undoAnswer(last.logId);
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
