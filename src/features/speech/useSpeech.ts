import { useQuery } from '@tanstack/react-query';

import { canSpeak } from '@/services/speech';

/** Whether a voice exists for the language; the speak button is hidden otherwise. */
export function useCanSpeak(language: string | null | undefined) {
  const query = useQuery({
    queryKey: ['speech', 'canSpeak', language ?? ''],
    queryFn: () => canSpeak(language ?? null),
    enabled: Boolean(language),
    staleTime: Infinity,
  });
  return Boolean(language) && query.data === true;
}
