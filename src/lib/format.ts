/** Formats an epoch-ms date for display, e.g. "12 Sep 2026". */
export function formatDate(epochMs: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(epochMs);
}
