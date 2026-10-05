import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';

/** Settings. Only Trash (and developer tools in dev builds) exist so far. */
export function SettingsScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('tabs.settings')} padded={false}>
      <ListRow title={t('trash.title')} onPress={() => router.push('/trash')} />
      {__DEV__ ? <ListRow title={t('dev.open')} onPress={() => router.push('/dev')} /> : null}
    </Screen>
  );
}
