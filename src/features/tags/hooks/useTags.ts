import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { tagKeys, wordKeys } from '@/data/queryKeys';
import { useRepositories } from '@/data/RepositoriesProvider';
import type { TagId, WordId } from '@/domain/models';
import { useLibrarySearchStore } from '@/features/search/searchStore';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

/** Tag writes change tag lists, word tags and every list filtered by a tag. */
function invalidateTagData(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: tagKeys.all });
  void queryClient.invalidateQueries({ queryKey: wordKeys.all });
}

export function useTags() {
  const { tags } = useRepositories();
  return useQuery({ queryKey: tagKeys.lists(), queryFn: () => tags.list() });
}

export function useTagsWithCounts() {
  const { tags } = useRepositories();
  return useQuery({ queryKey: tagKeys.withCounts(), queryFn: () => tags.listWithCounts() });
}

/** Tags starting with the typed text (debounced). Empty text suggests nothing. */
export function useTagSuggestions(text: string) {
  const { tags } = useRepositories();
  const trimmed = useDebouncedValue(text, 150).trim();
  return useQuery({
    queryKey: tagKeys.suggestions(trimmed),
    queryFn: () => tags.suggest(trimmed),
    enabled: trimmed !== '',
  });
}

export function useWordTags(wordId: WordId) {
  const { tags } = useRepositories();
  return useQuery({ queryKey: tagKeys.forWord(wordId), queryFn: () => tags.listForWord(wordId) });
}

/** Adds a tag by name (created if new) to a word. */
export function useAddWordTag() {
  const { tags } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ wordId, name }: { wordId: WordId; name: string }) => {
      const tag = await tags.getOrCreate(name);
      const current = await tags.listForWord(wordId);
      await tags.setWordTags(wordId, [...current.map((t) => t.id), tag.id]);
      return tag;
    },
    onSuccess: () => invalidateTagData(queryClient),
  });
}

export function useRemoveWordTag() {
  const { tags } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ wordId, tagId }: { wordId: WordId; tagId: TagId }) => {
      const current = await tags.listForWord(wordId);
      await tags.setWordTags(
        wordId,
        current.map((t) => t.id).filter((id) => id !== tagId),
      );
    },
    onSuccess: () => invalidateTagData(queryClient),
  });
}

export function useRenameTag() {
  const { tags } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: TagId; name: string }) => tags.rename(id, name),
    onSuccess: () => invalidateTagData(queryClient),
  });
}

export function useMergeTag() {
  const { tags } = useRepositories();
  const queryClient = useQueryClient();
  const forgetTag = useLibrarySearchStore((s) => s.forgetTag);
  return useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: TagId; targetId: TagId }) =>
      tags.merge(sourceId, targetId),
    onSuccess: (_, { sourceId }) => {
      forgetTag(sourceId);
      invalidateTagData(queryClient);
    },
  });
}

export function useDeleteTag() {
  const { tags } = useRepositories();
  const queryClient = useQueryClient();
  const forgetTag = useLibrarySearchStore((s) => s.forgetTag);
  return useMutation({
    mutationFn: (id: TagId) => tags.softDelete(id),
    onSuccess: (_, id) => {
      forgetTag(id);
      invalidateTagData(queryClient);
    },
  });
}
