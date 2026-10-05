import { useLocalSearchParams } from 'expo-router';

import { DictionaryFormScreen } from '@/features/dictionaries/components/DictionaryFormScreen';

export default function NewDictionaryRoute() {
  const { first } = useLocalSearchParams<{ first?: string }>();
  return <DictionaryFormScreen firstLaunch={first === '1'} />;
}
