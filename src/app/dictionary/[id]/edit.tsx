import { useLocalSearchParams } from 'expo-router';

import type { DictionaryId } from '@/domain/models';
import { DictionaryFormScreen } from '@/features/dictionaries/components/DictionaryFormScreen';

export default function EditDictionaryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DictionaryFormScreen dictionaryId={id as DictionaryId} />;
}
