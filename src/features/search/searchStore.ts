import { create } from 'zustand';

import type { TagId, WordFilter } from '@/domain/models';

interface LibrarySearchStore {
  text: string;
  filter: WordFilter;
  setText: (text: string) => void;
  /** Merges into the filter; `undefined` clears a field. */
  setFilter: (patch: Partial<WordFilter>) => void;
  /** Drops a tag that was deleted or merged away. */
  forgetTag: (tagId: TagId) => void;
  clearFilter: () => void;
}

/** Library search text and filter chips (interaction state; results come from TanStack Query). */
export const useLibrarySearchStore = create<LibrarySearchStore>((set) => ({
  text: '',
  filter: {},
  setText: (text) => set({ text }),
  setFilter: (patch) => set((state) => ({ filter: { ...state.filter, ...patch } })),
  forgetTag: (tagId) =>
    set((state) =>
      state.filter.tagId === tagId ? { filter: { ...state.filter, tagId: undefined } } : state,
    ),
  clearFilter: () => set({ filter: {} }),
}));

export function hasActiveFilter(filter: WordFilter): boolean {
  return Boolean(
    filter.dictionaryId || filter.tagId || filter.status || filter.starred || filter.incomplete,
  );
}
