import { useLocalSearchParams } from 'expo-router';

import type { WordId } from '@/domain/models';
import { WordDetailScreen } from '@/features/words/components/WordDetailScreen';

export default function WordRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WordDetailScreen id={id as WordId} />;
}
