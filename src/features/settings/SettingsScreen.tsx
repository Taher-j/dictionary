import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useSetSetting, useSettings } from '@/features/settings/hooks/useSettings';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { StepperRow } from '@/ui/StepperRow';

/** Settings: review limits, Tags, Trash (and developer tools in dev builds). */
export function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettings();
  const setSetting = useSetSetting();
  return (
    <Screen title={t('tabs.settings')} padded={false}>
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
      <ListRow title={t('settings.tags')} onPress={() => router.push('/tags')} />
      <ListRow title={t('trash.title')} onPress={() => router.push('/trash')} />
      {__DEV__ ? <ListRow title={t('dev.open')} onPress={() => router.push('/dev')} /> : null}
    </Screen>
  );
}
