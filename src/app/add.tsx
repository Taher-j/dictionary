import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

// Placeholder for quick add. `/add?term=&context=` is the single entry for external capture.
export default function AddRoute() {
  const { term } = useLocalSearchParams<{ term?: string }>();
  const { t } = useTranslation();

  return (
    <Screen title={t('add.title')}>
      <Text>{term ? t('add.term', { term }) : t('add.noTerm')}</Text>
    </Screen>
  );
}
