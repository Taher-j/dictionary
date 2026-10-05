import type { AppDatabase } from '@/data/db/types';
import type { Clock } from '@/lib/clock';

export interface RepositoryDeps {
  db: AppDatabase;
  now: Clock;
  newId: () => string;
}

/** SQLite limits bound parameters per statement; write id lists in slices of this size. */
export const ID_CHUNK_SIZE = 500;

export function chunk<T>(items: readonly T[], size = ID_CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
