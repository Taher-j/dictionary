import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { LANGUAGE_PREFERENCES, type LanguagePreference } from '@/domain/language';
import type { ThemePreference } from '@/domain/settings';
import { useSetSetting, useSettings } from '@/features/settings/hooks/useSettings';
import { applyPreferences, promptRestart } from '@/features/settings/preferences';
import { ActionSheet } from '@/ui/ActionSheet';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { StepperRow } from '@/ui/StepperRow';
import { SwitchRow } from '@/ui/SwitchRow';
import { Text } from '@/ui/Text';
import { spacing } from '@/ui/tokens';

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];

/** Settings: appearance, review limits, Tags, Trash (and developer tools in dev builds). */
export function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettings();
  const setSetting = useSetSetting();
  const [picker, setPicker] = useState<'none' | 'theme' | 'language'>('none');

  const setTheme = async (theme: ThemePreference) => {
    await setSetting.mutateAsync({ key: 'theme', value: theme });
    applyPreferences({ theme, language: settings.language });
  };

  const setLanguage = async (language: LanguagePreference) => {
    await setSetting.mutateAsync({ key: 'language', value: language });
    const { restartNeeded } = applyPreferences({ theme: settings.theme, language });
    if (restartNeeded) promptRestart();
  };

  return (
    <Screen title={t('tabs.settings')} padded={false}>
      <Text variant="label" tone="muted" accessibilityRole="header" style={styles.section}>
        {t('settings.appearance')}
      </Text>
      <ListRow
        title={t('settings.theme')}
        subtitle={t(`settings.themeOption.${settings.theme}`)}
        onPress={() => setPicker('theme')}
      />
      <ListRow
        title={t('settings.language')}
        subtitle={t(`settings.languageOption.${settings.language}`)}
        onPress={() => setPicker('language')}
      />

      <StepperRow
        label={t('settings.dailyNewLimit')}
        value={settings.dailyNewLimit}
        min={0}
        max={100}
        onChange={(value) => setSetting.mutate({ key: 'dailyNewLimit', value })}
      />
      <StepperRow
        label={t('settings.sessionSize')}
        value={settings.sessionSize}
        min={5}
        max={200}
        step={5}
        onChange={(value) => setSetting.mutate({ key: 'sessionSize', value })}
      />
      <SwitchRow
        label={t('settings.flashcardsOnly')}
        hint={t('settings.flashcardsOnlyHint')}
        value={settings.flashcardsOnly}
        onChange={(value) => setSetting.mutate({ key: 'flashcardsOnly', value })}
      />
      <ListRow title={t('backup.title')} onPress={() => router.push('/backup')} />
      <ListRow title={t('settings.tags')} onPress={() => router.push('/tags')} />
      <ListRow title={t('trash.title')} onPress={() => router.push('/trash')} />
      {__DEV__ ? <ListRow title={t('dev.open')} onPress={() => router.push('/dev')} /> : null}

      <ActionSheet
        visible={picker === 'theme'}
        title={t('settings.theme')}
        onClose={() => setPicker('none')}
        actions={THEMES.map((theme) => ({
          key: theme,
          label: t(`settings.themeOption.${theme}`),
          selected: theme === settings.theme,
          onPress: () => void setTheme(theme),
        }))}
      />
      <ActionSheet
        visible={picker === 'language'}
        title={t('settings.language')}
        onClose={() => setPicker('none')}
        actions={LANGUAGE_PREFERENCES.map((language) => ({
          key: language,
          label: t(`settings.languageOption.${language}`),
          selected: language === settings.language,
          onPress: () => void setLanguage(language),
        }))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
