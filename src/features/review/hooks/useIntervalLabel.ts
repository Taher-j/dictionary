import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { intervalParts } from '@/domain/intervals';

/** Short ("3 d") and spoken ("3 days") labels for a scheduling interval. */
export function useIntervalLabel() {
  const { t } = useTranslation();
  return useCallback(
    (ms: number) => {
      const { value, unit } = intervalParts(ms);
      return {
        short: t(`review.interval.${unit}`, { count: value }),
        long: t(`review.intervalLong.${unit}`, { count: value }),
      };
    },
    [t],
  );
}
