import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function SettingsRoute() {
  const { t } = useTranslation();

  return (
    <Screen title={t('tabs.settings')}>
      <Text tone="muted">{t('placeholder.comingSoon')}</Text>
      {__DEV__ ? (
        <Button label={t('dev.open')} variant="secondary" onPress={() => router.push('/dev')} />
      ) : null}
    </Screen>
  );
}
