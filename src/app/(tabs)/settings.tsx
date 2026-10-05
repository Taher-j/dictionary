import { useTranslation } from 'react-i18next';

import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function SettingsRoute() {
  const { t } = useTranslation();

  return (
    <Screen title={t('tabs.settings')}>
      <Text tone="muted">{t('placeholder.comingSoon')}</Text>
    </Screen>
  );
}
