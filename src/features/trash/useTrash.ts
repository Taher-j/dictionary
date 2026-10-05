import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { trashKeys } from '@/data/queryKeys';
import { useRepositories } from '@/data/RepositoriesProvider';
import type { TrashCursor } from '@/domain/models';

export function useTrashedWords() {
  const { trash } = useRepositories();
  return useInfiniteQuery({
    queryKey: trashKeys.words(),
    queryFn: ({ pageParam }) => trash.listWords(pageParam),
    initialPageParam: null as TrashCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useTrashedDictionaries() {
  const { dictionaries } = useRepositories();
  return useQuery({
    queryKey: trashKeys.dictionaries(),
    queryFn: () => dictionaries.listDeleted(),
  });
}
