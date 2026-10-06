import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { dictionaryKeys, reviewKeys, trashKeys, wordKeys } from '@/data/queryKeys';
import { useRepositories } from '@/data/RepositoriesProvider';
import type { DictionaryId, DictionaryPatch, NewDictionary } from '@/domain/models';

/** Dictionary changes also change word lists, counts, review counts and the trash. */
export function invalidateDictionaryData(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: dictionaryKeys.all });
  void queryClient.invalidateQueries({ queryKey: wordKeys.all });
  void queryClient.invalidateQueries({ queryKey: trashKeys.all });
  void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
}

/** Library list with word counts, in display order. */
export function useDictionaries() {
  const { dictionaries } = useRepositories();
  return useQuery({
    queryKey: dictionaryKeys.lists(),
    queryFn: () => dictionaries.listWithCounts(),
  });
}

export function useDictionary(id: DictionaryId | undefined) {
  const { dictionaries } = useRepositories();
  return useQuery({
    queryKey: dictionaryKeys.detail(id ?? ('' as DictionaryId)),
    queryFn: () => (id ? dictionaries.getById(id) : null),
    enabled: Boolean(id),
  });
}

export function useCreateDictionary() {
  const { dictionaries } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewDictionary) => dictionaries.create(input),
    onSuccess: () => invalidateDictionaryData(queryClient),
  });
}

export function useUpdateDictionary() {
  const { dictionaries } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: DictionaryId; patch: DictionaryPatch }) =>
      dictionaries.update(id, patch),
    onSuccess: () => invalidateDictionaryData(queryClient),
  });
}

export function useDeleteDictionary() {
  const { dictionaries } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: DictionaryId) => dictionaries.softDelete(id),
    onSuccess: () => invalidateDictionaryData(queryClient),
  });
}

export function useRestoreDictionary() {
  const { dictionaries } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: DictionaryId) => dictionaries.restore(id),
    onSuccess: () => invalidateDictionaryData(queryClient),
  });
}

export function useMoveDictionary() {
  const { dictionaries } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, direction }: { id: DictionaryId; direction: 'up' | 'down' }) =>
      dictionaries.move(id, direction),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dictionaryKeys.all }),
  });
}
