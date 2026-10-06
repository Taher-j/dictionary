export type IntervalUnit = 'minute' | 'hour' | 'day' | 'month' | 'year';

export interface IntervalParts {
  value: number;
  unit: IntervalUnit;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const roundTenth = (value: number) => Math.round(value * 10) / 10;

/**
 * Splits an interval into the value and unit shown on rating buttons ("3 d", "1.5 mo").
 * Minutes, hours and days are whole numbers; months and years keep one decimal.
 */
export function intervalParts(ms: number): IntervalParts {
  const interval = Math.max(0, ms);
  if (interval < HOUR_MS)
    return { value: Math.max(1, Math.round(interval / MINUTE_MS)), unit: 'minute' };
  if (interval < DAY_MS) return { value: Math.round(interval / HOUR_MS), unit: 'hour' };
  const days = Math.round(interval / DAY_MS);
  if (days < 31) return { value: days, unit: 'day' };
  if (days < 365) return { value: roundTenth(days / 30), unit: 'month' };
  return { value: roundTenth(days / 365), unit: 'year' };
}
