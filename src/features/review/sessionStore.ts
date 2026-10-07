import { create } from 'zustand';

import type { SessionId } from '@/domain/models';
import type { PracticeSetup } from '@/domain/practice/practice';
import {
  sessionReducer,
  startSession,
  type SessionAction,
  type SessionCard,
  type SessionState,
} from '@/domain/session';

export type SessionKind = 'review' | 'practice';

interface ReviewSessionStore {
  sessionId: SessionId | null;
  /** Review moves due dates; practice only logs (docs/04-learning-system.md). */
  kind: SessionKind;
  /** The practice setup (modes, source), for picking modes and "Keep going". */
  setup: PracticeSetup | null;
  /** Card ids and word ids only; the card content is read through TanStack Query. */
  session: SessionState | null;
  /** When the current card was shown, for the log's duration. */
  shownAt: number;
  start: (
    sessionId: SessionId,
    queue: readonly SessionCard[],
    now: number,
    options?: { kind: SessionKind; setup: PracticeSetup | null },
  ) => void;
  dispatch: (action: SessionAction, now: number) => void;
  clear: () => void;
}

/** Interaction state of the active review session, driven by `sessionReducer`. */
export const useReviewSessionStore = create<ReviewSessionStore>((set) => ({
  sessionId: null,
  kind: 'review',
  setup: null,
  session: null,
  shownAt: 0,
  start: (sessionId, queue, now, options = { kind: 'review', setup: null }) =>
    set({ sessionId, session: startSession(queue), shownAt: now, ...options }),
  dispatch: (action, now) =>
    set((state) => {
      if (!state.session) return state;
      const session = sessionReducer(state.session, action);
      // The duration counts from when a new card appears, not from the reveal.
      return action.type === 'reveal' ? { session } : { session, shownAt: now };
    }),
  clear: () => set({ sessionId: null, session: null, shownAt: 0, kind: 'review', setup: null }),
}));
