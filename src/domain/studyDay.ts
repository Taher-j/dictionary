import type { EpochMs } from '@/domain/models';

/** The study day rolls over at 04:00 local time (docs/04-learning-system.md). */
export const ROLLOVER_HOUR = 4;

/** Start of the study day that contains `now`, in local time. */
export function studyDayStart(now: EpochMs): EpochMs {
  const date = new Date(now);
  if (date.getHours() < ROLLOVER_HOUR) date.setDate(date.getDate() - 1);
  date.setHours(ROLLOVER_HOUR, 0, 0, 0);
  return date.getTime();
}

/** Start of the next study day. Uses calendar arithmetic, so DST days stay correct. */
export function nextStudyDayStart(now: EpochMs): EpochMs {
  const date = new Date(studyDayStart(now));
  date.setDate(date.getDate() + 1);
  return date.getTime();
}
