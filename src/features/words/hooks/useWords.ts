import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import {
  cardKeys,
  dictionaryKeys,
  reviewKeys,
  tagKeys,
  trashKeys,
  wordKeys,
} from '@/data/queryKeys';
import { useRepositories } from '@/data/RepositoriesProvider';
import type {
  DictionaryId,
  NewWord,
  WordCursor,
  WordFilter,
  WordId,
  WordPatch,
  WordQuery,
} from '@/domain/models';
import { termKeys } from '@/domain/termKeys';
import { hasMeaning, wordStatus } from '@/domain/wordStatus';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

/** Word writes change lists, counts, cards, review counts, tag counts and the trash. Local data, so refetching is cheap. */
export function invalidateWordData(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: wordKeys.all });
  void queryClient.invalidateQueries({ queryKey: tagKeys.all });
  void queryClient.invalidateQueries({ queryKey: dictionaryKeys.all });
  void queryClient.invalidateQueries({ queryKey: cardKeys.all });
  void queryClient.invalidateQueries({ queryKey: trashKeys.all });
  void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
}

/** Keyset-paged word list for FlashList. */
export function useWordList(query: WordQuery) {
  const { words } = useRepositories();
  return useInfiniteQuery({
    queryKey: wordKeys.list(query),
    queryFn: ({ pageParam }) => words.list(query, pageParam),
    initialPageParam: null as WordCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

/** Search across dictionaries; the previous results stay visible while the next query runs. */
export function useWordSearch(text: string, filter: WordFilter, enabled: boolean) {
  const { words } = useRepositories();
  return useQuery({
    queryKey: wordKeys.search(text, filter),
    queryFn: () => words.search(text, filter),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** A word with its recognition card status. */
export function useWord(id: WordId) {
  const { words, cards } = useRepositories();
  return useQuery({
    queryKey: wordKeys.detail(id),
    queryFn: async () => {
      const word = await words.getById(id);
      if (!word) return null;
      const card = (await cards.listForWord(id)).find((c) => c.direction === 'recognition');
      return { word, card: card ?? null, status: wordStatus(card ?? null, hasMeaning(word)) };
    },
  });
}

export function useIncompleteCount() {
  const { words } = useRepositories();
  return useQuery({ queryKey: wordKeys.incompleteCount(), queryFn: () => words.countIncomplete() });
}

/** Duplicate matches for a term while it is typed (debounced). */
export function useDuplicates(dictionaryId: DictionaryId | null, term: string, delayMs = 250) {
  const { words } = useRepositories();
  const trimmed = useDebouncedValue(term, delayMs).trim();
  return useQuery({
    queryKey: wordKeys.duplicates(dictionaryId ?? ('' as DictionaryId), trimmed),
    queryFn: () =>
      dictionaryId ? words.findDuplicates(dictionaryId, termKeys(trimmed)) : Promise.resolve([]),
    enabled: Boolean(dictionaryId) && trimmed !== '',
  });
}

export function useCreateWord() {
  const { words } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewWord) => words.create(input),
    onSuccess: () => invalidateWordData(queryClient),
  });
}

export function useUpdateWord() {
  const { words } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: WordId; patch: WordPatch }) => words.update(id, patch),
    onSuccess: () => invalidateWordData(queryClient),
  });
}

export function useDeleteWords() {
  const { words } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: readonly WordId[]) => words.softDelete(ids),
    onSuccess: () => invalidateWordData(queryClient),
  });
}

export function useRestoreWords() {
  const { words } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: readonly WordId[]) => words.restore(ids),
    onSuccess: () => invalidateWordData(queryClient),
  });
}
