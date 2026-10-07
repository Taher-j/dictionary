import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, StyleSheet, View } from 'react-native';

import { BackupFormatError, type BackupError } from '@/domain/backup/format';
import {
  useCreateBackup,
  usePickBackup,
  useRestoreBackup,
  useRestoreSnapshot,
  useSnapshots,
  type PickResult,
  type Progress,
} from '@/features/backup/hooks/useBackup';
import { useSettings } from '@/features/settings/hooks/useSettings';
import { formatDate, formatDateTime, formatMegabytes, formatPercent } from '@/lib/format';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { showToast } from '@/ui/toastStore';
import { radius, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

const KNOWN_REASONS = new Set(['daily', 'pre-migrate', 'pre-restore']);

/** Settings → Backup and restore (docs/06-data-safety.md). */
export function BackupScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { lastBackupAt } = useSettings();
  const create = useCreateBackup(t('backup.shareTitle'));
  const pick = usePickBackup();
  const restore = useRestoreBackup();
  const snapshots = useSnapshots();
  const restoreSnapshot = useRestoreSnapshot();
  const [picked, setPicked] = useState<Extract<PickResult, { ok: true }> | null>(null);
  const [problem, setProblem] = useState<BackupError | 'readFailed' | null>(null);

  const backUp = async () => {
    try {
      await create.mutateAsync();
    } catch {
      Alert.alert(t('backup.error.backupFailed'));
    }
  };

  const choose = async () => {
    setProblem(null);
    setPicked(null);
    const result = await pick
      .mutateAsync()
      .catch(() => ({ ok: false, error: 'readFailed' }) as const);
    if (!result) return;
    if (result.ok) setPicked(result);
    else setProblem(result.error);
  };

  const confirmReplace = () => {
    if (!picked) return;
    Alert.alert(t('backup.replaceTitle'), t('backup.replaceBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('backup.replace'),
        style: 'destructive',
        onPress: async () => {
          try {
            await restore.mutateAsync({ file: picked.file, summary: picked.summary });
            setPicked(null);
            showToast(t('backup.restored'));
          } catch (error) {
            Alert.alert(
              error instanceof BackupFormatError
                ? t(`backup.error.${error.code}`)
                : t('backup.error.restoreFailed'),
            );
          }
        },
      },
    ]);
  };

  const confirmSnapshot = (path: string, createdAt: number) => {
    Alert.alert(
      t('backup.snapshotRestoreTitle'),
      t('backup.snapshotRestoreBody', { date: formatDateTime(createdAt, i18n.language) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.restore'),
          style: 'destructive',
          onPress: async () => {
            try {
              await restoreSnapshot.mutateAsync(path);
              setProblem(null);
              setPicked(null);
              void snapshots.refetch();
              showToast(t('backup.restored'));
            } catch {
              Alert.alert(t('backup.error.restoreFailed'));
            }
          },
        },
      ],
    );
  };

  // Writing shows progress; while the share sheet is open the screen stays usable underneath.
  const busy: { label: string; progress: Progress } | null =
    create.isPending && create.progress !== null
      ? { label: t('backup.writing'), progress: create.progress }
      : restore.isPending
        ? {
            label: t('backup.restoring', {
              percent: formatPercent(restore.progress ?? 0, i18n.language),
            }),
            progress: restore.progress,
          }
        : restoreSnapshot.isPending
          ? { label: t('backup.restoring', { percent: '' }), progress: null }
          : pick.isPending && pick.progress !== null
            ? {
                label: t('backup.reading', {
                  percent: formatPercent(pick.progress, i18n.language),
                }),
                progress: pick.progress,
              }
            : null;

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Text tone="muted">{t('backup.explain')}</Text>
      <Button
        label={t('backup.backUpNow')}
        onPress={() => void backUp()}
        disabled={busy !== null}
      />
      <Text variant="caption" tone="muted">
        {lastBackupAt === null
          ? t('backup.neverBackedUp')
          : t('backup.lastBackup', { date: formatDateTime(lastBackupAt, i18n.language) })}
      </Text>
      <Text variant="caption" tone="muted">
        {t('backup.notEncrypted')}
      </Text>

      <Text variant="heading" style={styles.section}>
        {t('backup.restoreTitle')}
      </Text>
      <Text tone="muted">{t('backup.restoreExplain')}</Text>
      <Button
        label={t('backup.chooseFile')}
        variant="secondary"
        onPress={() => void choose()}
        disabled={busy !== null}
      />
      {problem ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {t(`backup.error.${problem}`)}
        </Text>
      ) : null}
      {picked ? (
        <View
          style={[styles.preview, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text variant="label">
            {t('backup.previewTitle', {
              date: formatDate(Date.parse(picked.summary.exportedAt), i18n.language),
            })}
          </Text>
          <Text>{t('backup.previewDictionaries', { count: picked.summary.dictionaries })}</Text>
          <Text>{t('backup.previewWords', { count: picked.summary.words })}</Text>
          <Text>{t('backup.previewReviews', { count: picked.summary.reviews })}</Text>
          <Button label={t('backup.replace')} onPress={confirmReplace} disabled={busy !== null} />
        </View>
      ) : null}

      <Text variant="heading" style={styles.section}>
        {t('backup.snapshotsTitle')}
      </Text>
      <Text tone="muted">{t('backup.snapshotsExplain')}</Text>
      {snapshots.isSuccess && snapshots.data.length === 0 ? (
        <Text tone="muted">{t('backup.noSnapshots')}</Text>
      ) : null}
      <View style={styles.list}>
        {(snapshots.data ?? []).map((snapshot) => (
          <ListRow
            key={snapshot.path}
            title={formatDateTime(snapshot.createdAt, i18n.language)}
            subtitle={
              snapshot.restorable
                ? t('backup.snapshotRow', {
                    reason: t(
                      `backup.snapshotReason.${KNOWN_REASONS.has(snapshot.reason) ? (snapshot.reason as 'daily') : 'other'}`,
                    ),
                    size: formatMegabytes(snapshot.size ?? 0, i18n.language),
                  })
                : t('backup.snapshotOld')
            }
            onPress={
              snapshot.restorable && busy === null
                ? () => confirmSnapshot(snapshot.path, snapshot.createdAt)
                : undefined
            }
          />
        ))}
      </View>

      <Modal visible={busy !== null} transparent animationType="fade">
        <View style={[styles.busy, { backgroundColor: colors.backdrop }]}>
          <View style={[styles.busyCard, { backgroundColor: colors.background }]}>
            <ActivityIndicator color={colors.primary} />
            <Text accessibilityLiveRegion="polite">{busy?.label}</Text>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
  },
  preview: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  list: {
    marginHorizontal: -spacing.md,
  },
  busy: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
});
