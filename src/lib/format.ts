/** Formats an epoch-ms date for display, e.g. "12 Sep 2026". */
export function formatDate(epochMs: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(epochMs);
}

/** Date with time, e.g. "12 Sep 2026, 14:30" (when the next review is due). */
export function formatDateTime(epochMs: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    epochMs,
  );
}

/** Share as a percentage, e.g. 0.85 -> "85%". */
export function formatPercent(share: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(
    share,
  );
}
