import { Directory, File, Paths } from 'expo-file-system';

import type { EpochMs } from '@/domain/models';
import type { Clock } from '@/lib/clock';

/** Snapshots kept on the device; older ones are deleted (docs/06-data-safety.md). */
export const SNAPSHOTS_TO_KEEP = 5;

const PREFIX = 'snapshot-';

function snapshotDirectory(): Directory {
  return new Directory(Paths.document, 'snapshots');
}

/** SQLite needs a plain path; expo-file-system works with file:// URIs. */
function uriToPath(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, ''));
}

export interface SnapshotInfo {
  /** Plain path, for SQLite (ATTACH). */
  path: string;
  createdAt: EpochMs;
  /** `daily`, `pre-migrate`, `pre-restore`, ... */
  reason: string;
  size: number | null;
}

const NAME = /^snapshot-(\d+)-(.+)\.db$/;

function listSnapshotFiles(): File[] {
  const dir = snapshotDirectory();
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((entry): entry is File => entry instanceof File && NAME.test(entry.name))
    .sort((a, b) => b.name.localeCompare(a.name));
}

export type SnapshotStore = ReturnType<typeof createSnapshotStore>;

/** Snapshot files named `snapshot-<epoch ms>-<reason>.db`, so names sort by age. */
export function createSnapshotStore(now: Clock) {
  return {
    newSnapshotPath(reason: string): string {
      const dir = snapshotDirectory();
      dir.create({ idempotent: true, intermediates: true });
      const stamp = String(now()).padStart(15, '0');
      return uriToPath(new File(dir, `${PREFIX}${stamp}-${reason}.db`).uri);
    },

    prune(): void {
      for (const old of listSnapshotFiles().slice(SNAPSHOTS_TO_KEEP)) old.delete();
    },

    /** Newest first. */
    list(): SnapshotInfo[] {
      return listSnapshotFiles().flatMap((file) => {
        const match = NAME.exec(file.name);
        if (!match?.[1] || !match[2]) return [];
        return [
          {
            path: uriToPath(file.uri),
            createdAt: Number(match[1]),
            reason: match[2],
            size: file.size,
          },
        ];
      });
    },
  };
}
