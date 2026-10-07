import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { BackupProgress } from '@/data/backup';
import { backupKeys, wordKeys } from '@/data/queryKeys';
import { useBackupService, useRepositories } from '@/data/RepositoriesProvider';
import { BACKUP_TABLES, backupFileName, type BackupError } from '@/domain/backup/format';
import { scanBackup, summaryOf, type BackupSummary } from '@/domain/backup/parse';
import { needsBackupReminder } from '@/domain/backup/reminder';
import { useLibrarySearchStore } from '@/features/search/searchStore';
import { useSettings, useSetSetting } from '@/features/settings/hooks/useSettings';
import { applyPreferences, promptRestart } from '@/features/settings/preferences';
import { systemClock } from '@/lib/clock';
import { appInfo } from '@/services/appInfo';
import {
  createCacheFile,
  pickFile,
  readTextPieces,
  shareFile,
  type PickedFile,
} from '@/services/files';

/** Share of a long job done, 0..1, for the progress line. */
export type Progress = number | null;

function share(progress: BackupProgress, tables: number, index: number): number {
  const withinTable = progress.total === 0 ? 1 : progress.done / progress.total;
  return (index + withinTable) / tables;
}

/** Whether Today shows the backup banner (docs/06-data-safety.md). */
export function useBackupReminder() {
  const { words } = useRepositories();
  const { lastBackupAt } = useSettings();
  const changed = useQuery({
    queryKey: [...wordKeys.all, 'changedSince', lastBackupAt],
    queryFn: () => words.countChangedSince(lastBackupAt),
  });
  return {
    lastBackupAt,
    show: changed.isSuccess && needsBackupReminder(lastBackupAt, changed.data, systemClock()),
  };
}

/** Writes a backup to the cache directory, opens the share sheet, records `lastBackupAt`. */
export function useCreateBackup(shareTitle: string) {
  const backup = useBackupService();
  const setSetting = useSetSetting();
  const [progress, setProgress] = useState<Progress>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const at = systemClock();
      const file = createCacheFile(backupFileName(new Date(at)));
      const order: string[] = [];
      setProgress(0);
      await backup.write(
        (chunk) => file.append(chunk),
        { appVersion: appInfo.version, platform: appInfo.platform },
        (p) => {
          if (!order.includes(p.table)) order.push(p.table);
          setProgress(share(p, BACKUP_TABLES.length, order.indexOf(p.table)));
        },
      );
      setProgress(null);
      await shareFile(file.uri, 'application/json', shareTitle);
      // The file was written and offered; whether it was saved is up to the share target.
      await setSetting.mutateAsync({ key: 'lastBackupAt', value: at });
    },
    onSettled: () => setProgress(null),
  });
  return { ...mutation, progress };
}

export type PickResult =
  | { ok: true; file: PickedFile; summary: BackupSummary }
  | { ok: false; error: BackupError | 'readFailed' };

/** Lets the user pick a file and checks every row of it. Null when the picker was cancelled. */
export function usePickBackup() {
  const [progress, setProgress] = useState<Progress>(null);
  const mutation = useMutation({
    mutationFn: async (): Promise<PickResult | null> => {
      const file = await pickFile();
      if (!file) return null;
      setProgress(0);
      try {
        const result = await scanBackup(
          readTextPieces(file.uri, (bytes) => file.size && setProgress(bytes / file.size)),
        );
        return result.ok ? { ok: true, file, summary: summaryOf(result) } : result;
      } catch (error) {
        if (__DEV__) console.warn('Reading the backup failed', error);
        return { ok: false, error: 'readFailed' };
      }
    },
    onSettled: () => setProgress(null),
  });
  return { ...mutation, progress };
}

/**
 * A restore must not forget that a backup exists: keeps the latest of the last-backup time before
 * the restore, the restored one and (for a backup file) the file's own date.
 */
async function keepLastBackupAt(
  settings: ReturnType<typeof useRepositories>['settings'],
  ...candidates: (number | null)[]
) {
  const restored = await settings.get('lastBackupAt');
  const latest = Math.max(restored ?? 0, ...candidates.map((c) => c ?? 0));
  if (latest > 0 && latest !== restored) await settings.set('lastBackupAt', latest);
}

/** After a restore everything on screen is stale, and the restored settings apply. */
function useAfterRestore() {
  const queryClient = useQueryClient();
  const repositories = useRepositories();
  return async () => {
    useLibrarySearchStore.getState().setText('');
    useLibrarySearchStore.getState().clearFilter();
    await queryClient.invalidateQueries();
    if (applyPreferences(await repositories.settings.getAll()).restartNeeded) promptRestart();
  };
}

/** Replace restore: everything in the app becomes the backup, read again piece by piece. */
export function useRestoreBackup() {
  const backup = useBackupService();
  const { settings } = useRepositories();
  const afterRestore = useAfterRestore();
  const [progress, setProgress] = useState<Progress>(null);
  const mutation = useMutation({
    mutationFn: async ({ file, summary }: { file: PickedFile; summary: BackupSummary }) => {
      setProgress(0);
      const before = await settings.get('lastBackupAt');
      await backup.restore(
        readTextPieces(file.uri, (bytes) => file.size && setProgress(bytes / file.size)),
      );
      const exportedAt = Date.parse(summary.exportedAt);
      await keepLastBackupAt(settings, before, Number.isFinite(exportedAt) ? exportedAt : null);
    },
    onSuccess: afterRestore,
    onSettled: () => setProgress(null),
  });
  return { ...mutation, progress };
}

export function useSnapshots() {
  const backup = useBackupService();
  return useQuery({ queryKey: backupKeys.snapshots(), queryFn: () => backup.listSnapshots() });
}

export function useRestoreSnapshot() {
  const backup = useBackupService();
  const { settings } = useRepositories();
  const afterRestore = useAfterRestore();
  return useMutation({
    mutationFn: async (path: string) => {
      const before = await settings.get('lastBackupAt');
      await backup.restoreSnapshot(path);
      await keepLastBackupAt(settings, before);
    },
    onSuccess: afterRestore,
  });
}
