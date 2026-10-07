import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useBackupReminder } from '@/features/backup/hooks/useBackup';
import { formatDate } from '@/lib/format';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { radius, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

/** Today's banner: 14+ days since the last backup and 20+ words changed (06-data-safety.md). */
export function BackupReminder() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { show, lastBackupAt } = useBackupReminder();
  if (!show) return null;
  return (
    <View
      accessibilityRole="summary"
      style={[styles.banner, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      <Text variant="label">{t('backup.reminderTitle')}</Text>
      <Text tone="muted">
        {lastBackupAt === null
          ? t('backup.reminderNever')
          : t('backup.reminderLast', { date: formatDate(lastBackupAt, i18n.language) })}
      </Text>
      <TextButton label={t('backup.reminderAction')} onPress={() => router.push('/backup')} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
});
