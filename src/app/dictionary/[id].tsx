import { useLocalSearchParams } from 'expo-router';

import type { DictionaryId } from '@/domain/models';
import { DictionaryScreen } from '@/features/dictionaries/components/DictionaryScreen';

export default function DictionaryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DictionaryScreen id={id as DictionaryId} />;
}
