import type { CardId, DictionaryId, WordFilter, WordId, WordQuery } from '@/domain/models';
import type { SettingKey } from '@/domain/settings';

// TanStack Query key factories. Invalidate the broadest key that covers a change.

export const dictionaryKeys = {
  all: ['dictionaries'] as const,
  lists: () => [...dictionaryKeys.all, 'list'] as const,
  detail: (id: DictionaryId) => [...dictionaryKeys.all, 'detail', id] as const,
};

export const wordKeys = {
  all: ['words'] as const,
  lists: () => [...wordKeys.all, 'list'] as const,
  list: (query: WordQuery) => [...wordKeys.lists(), query] as const,
  searches: () => [...wordKeys.all, 'search'] as const,
  search: (text: string, query?: WordFilter & { limit?: number }) =>
    [...wordKeys.searches(), text, query ?? {}] as const,
  detail: (id: WordId) => [...wordKeys.all, 'detail', id] as const,
  incompleteCount: () => [...wordKeys.all, 'incompleteCount'] as const,
  duplicates: (dictionaryId: DictionaryId, term: string) =>
    [...wordKeys.all, 'duplicates', dictionaryId, term] as const,
};

export const trashKeys = {
  all: ['trash'] as const,
  words: () => [...trashKeys.all, 'words'] as const,
  dictionaries: () => [...trashKeys.all, 'dictionaries'] as const,
};

export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  withCounts: () => [...tagKeys.all, 'withCounts'] as const,
  suggestions: (text: string) => [...tagKeys.all, 'suggestions', text] as const,
  forWord: (wordId: WordId) => [...tagKeys.all, 'word', wordId] as const,
};

export const cardKeys = {
  all: ['cards'] as const,
  forWord: (wordId: WordId) => [...cardKeys.all, 'word', wordId] as const,
  detail: (id: CardId) => [...cardKeys.all, 'detail', id] as const,
};

export const reviewLogKeys = {
  all: ['reviewLogs'] as const,
  forCard: (cardId: CardId) => [...reviewLogKeys.all, 'card', cardId] as const,
};

export const settingsKeys = {
  all: ['settings'] as const,
  detail: (key: SettingKey) => [...settingsKeys.all, key] as const,
};

export const reviewKeys = {
  all: ['reviews'] as const,
  today: () => [...reviewKeys.all, 'today'] as const,
  dueTomorrow: () => [...reviewKeys.all, 'dueTomorrow'] as const,
};
