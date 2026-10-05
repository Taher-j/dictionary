// Term keys for duplicate detection, sorting and prefix search. See docs/03-data-model.md.

export interface TermKeys {
  /** Exact-duplicate key. */
  norm: string;
  /** Accent-folded key: possible duplicates, A-Z sorting, prefix search. */
  fold: string;
}

export function termKeys(raw: string): TermKeys {
  const norm = raw
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^["'“”‘’«»„]+|["'“”‘’«»„.,;:!?]+$/g, '')
    .toLowerCase();

  const fold = norm.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

  return { norm, fold };
}
