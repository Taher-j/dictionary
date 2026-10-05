import { useCallback } from 'react';

import { useSettings } from '@/features/settings/hooks/useSettings';
import { lightImpact } from '@/services/haptics';

/** Light haptic that respects the "haptics" setting. */
export function useLightHaptic(): () => void {
  const { hapticsEnabled } = useSettings();
  return useCallback(() => lightImpact(hapticsEnabled), [hapticsEnabled]);
}
