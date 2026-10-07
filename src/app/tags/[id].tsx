import { useLocalSearchParams } from 'expo-router';

import type { TagId } from '@/domain/models';
import { RenameTagScreen } from '@/features/tags/components/RenameTagScreen';

export default function RenameTagRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RenameTagScreen id={id as TagId} />;
}
