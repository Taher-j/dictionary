import { useLocalSearchParams } from 'expo-router';

import type { DictionaryId } from '@/domain/models';
import { QuickAddScreen } from '@/features/words/components/QuickAddScreen';

// `/add?term=&context=` is the single entry for external capture (deep link, share).
export default function AddRoute() {
  const { term, context, dictionaryId } = useLocalSearchParams<{
    term?: string;
    context?: string;
    dictionaryId?: string;
  }>();
  return (
    <QuickAddScreen
      initialTerm={term}
      context={context}
      dictionaryId={dictionaryId as DictionaryId | undefined}
    />
  );
}
