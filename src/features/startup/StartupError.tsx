import { useTranslation } from 'react-i18next';

import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

interface StartupErrorProps {
  error: Error;
}

/** Shown when the database cannot be opened or migrated. */
export function StartupError({ error }: StartupErrorProps) {
  const { t } = useTranslation();
  return (
    <Screen title={t('startup.errorTitle')}>
      <Text>{t('startup.errorBody')}</Text>
      <Text tone="muted" variant="caption" selectable>
        {error.message}
      </Text>
    </Screen>
  );
}
