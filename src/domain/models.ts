// Domain models. Plain TypeScript: repositories map database rows to these types.

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type DictionaryId = Brand<string, 'DictionaryId'>;
export type WordId = Brand<string, 'WordId'>;
export type TagId = Brand<string, 'TagId'>;
export type CardId = Brand<string, 'CardId'>;
export type ReviewLogId = Brand<string, 'ReviewLogId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type ImportBatchId = Brand<string, 'ImportBatchId'>;

/** Epoch milliseconds. */
export type EpochMs = number;

export interface Dictionary {
  id: DictionaryId;
  name: string;
  icon: string | null;
  color: string | null;
  termLang: string | null;
  meaningLang: string | null;
  bothDirections: boolean;
  inDailyReview: boolean;
  lookupUrl: string | null;
  position: number;
  createdAt: EpochMs;
  updatedAt: EpochMs;
  deletedAt: EpochMs | null;
}

export interface NewDictionary {
  name: string;
  icon?: string | null;
  color?: string | null;
  termLang?: string | null;
  meaningLang?: string | null;
  bothDirections?: boolean;
  inDailyReview?: boolean;
  lookupUrl?: string | null;
  position?: number;
}

export type DictionaryPatch = Partial<NewDictionary>;

/** Optional text fields of a word. */
export interface WordDetails {
  translation: string | null;
  definition: string | null;
  example: string | null;
  partOfSpeech: string | null;
  forms: string | null;
  pronunciation: string | null;
  notes: string | null;
  source: string | null;
}

export interface Word extends WordDetails {
  id: WordId;
  dictionaryId: DictionaryId;
  term: string;
  termNorm: string;
  termFold: string;
  starred: boolean;
  importBatchId: ImportBatchId | null;
  createdAt: EpochMs;
  updatedAt: EpochMs;
  deletedAt: EpochMs | null;
}

export interface NewWord extends Partial<WordDetails> {
  dictionaryId: DictionaryId;
  term: string;
  starred?: boolean;
  importBatchId?: ImportBatchId | null;
}

/** Changing `dictionaryId` moves the word to another dictionary. */
export type WordPatch = Partial<Omit<NewWord, 'importBatchId'>>;

export type CardDirection = 'recognition' | 'recall';

/** Mirrors the ts-fsrs `State` enum. */
export const CardState = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
} as const;
export type CardStateValue = (typeof CardState)[keyof typeof CardState];

/** The scheduling state the scheduler reads and writes (mirrors the ts-fsrs `Card`). */
export interface CardSchedule {
  state: CardStateValue;
  due: EpochMs;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReview: EpochMs | null;
}

export interface Card extends CardSchedule {
  id: CardId;
  wordId: WordId;
  direction: CardDirection;
  suspended: boolean;
  updatedAt: EpochMs;
}

/** 1 again, 2 hard, 3 good, 4 easy. */
export type Rating = 1 | 2 | 3 | 4;

export interface ReviewLog {
  id: ReviewLogId;
  cardId: CardId;
  sessionId: SessionId | null;
  reviewedAt: EpochMs;
  rating: Rating;
  mode: string;
  /** True when the answer moved the schedule; false for free practice. */
  scheduled: boolean;
  durationMs: number | null;
  /** The card before this review, for undo and replay. */
  prevCard: CardSchedule | null;
}

export type NewReviewLog = Omit<ReviewLog, 'id'>;

export interface Tag {
  id: TagId;
  name: string;
  nameNorm: string;
  createdAt: EpochMs;
  updatedAt: EpochMs;
  deletedAt: EpochMs | null;
}

export type WordStatus = 'incomplete' | 'new' | 'learning' | 'young' | 'mature' | 'suspended';

export interface WordListItem {
  id: WordId;
  dictionaryId: DictionaryId;
  term: string;
  translation: string | null;
  definition: string | null;
  starred: boolean;
  status: WordStatus;
  createdAt: EpochMs;
}

export type WordSort = 'alpha' | 'recent';

/** One filter object shared by lists and search. Tags, status and starred arrive in Milestone 3. */
export interface WordQuery {
  dictionaryId?: DictionaryId;
  sort: WordSort;
  limit?: number;
}

export type WordCursor =
  | { sort: 'alpha'; termFold: string; id: WordId }
  | { sort: 'recent'; createdAt: EpochMs; id: WordId };

export interface Page<TItem, TCursor> {
  items: TItem[];
  nextCursor: TCursor | null;
}

export type DuplicateTier = 'exact' | 'possible' | 'elsewhere';

export interface DuplicateMatch {
  tier: DuplicateTier;
  wordId: WordId;
  dictionaryId: DictionaryId;
  term: string;
}
