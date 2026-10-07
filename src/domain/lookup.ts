/** The placeholder a dictionary's lookup URL template uses for the word. */
export const TERM_PLACEHOLDER = '{term}';

/** Whether a lookup template is usable: an https URL with the {term} placeholder. */
export function isValidLookupTemplate(template: string): boolean {
  const trimmed = template.trim();
  return /^https:\/\/[^\s]+$/i.test(trimmed) && trimmed.includes(TERM_PLACEHOLDER);
}

/**
 * The lookup URL for a word, or null for an unusable template. Opened in the system browser:
 * the only outbound path in the app, always started by the user (docs/06-data-safety.md).
 */
export function lookupUrl(template: string | null, term: string): string | null {
  if (!template || !isValidLookupTemplate(template)) return null;
  return template.trim().split(TERM_PLACEHOLDER).join(encodeURIComponent(term.trim()));
}
