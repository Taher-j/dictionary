import { Directory, File, Paths } from 'expo-file-system';

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
      const dir = snapshotDirectory();
      if (!dir.exists) return;
      const snapshots = dir
        .list()
        .filter((entry): entry is File => entry instanceof File && entry.name.startsWith(PREFIX))
        .sort((a, b) => b.name.localeCompare(a.name));
      for (const old of snapshots.slice(SNAPSHOTS_TO_KEEP)) old.delete();
    },
  };
}
