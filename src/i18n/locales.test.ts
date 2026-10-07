import { APP_LANGUAGES } from '@/domain/language';
import { resources } from '@/i18n';

type Tree = { [key: string]: string | Tree };

const PLURAL = /_(zero|one|two|few|many|other)$/;

/** Flattened keys, with plural suffixes removed: "today.inbox", "common.save", ... */
function keys(tree: Tree, prefix = ''): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string') {
      const base = prefix + key.replace(PLURAL, '');
      const forms = out.get(base) ?? new Set<string>();
      const match = PLURAL.exec(key);
      if (match?.[1]) forms.add(match[1]);
      out.set(base, forms);
    } else {
      for (const [k, v] of keys(value, `${prefix}${key}.`)) out.set(k, v);
    }
  }
  return out;
}

/** {{name}} and {{name, format}} placeholders in a string. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)/g)].map((m) => m[1] ?? '').sort();
}

function strings(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string') out.set(prefix + key, value);
    else for (const [k, v] of strings(value, `${prefix}${key}.`)) out.set(k, v);
  }
  return out;
}

const english = resources.en.translation as Tree;

describe.each(APP_LANGUAGES.filter((l) => l !== 'en'))('%s translation', (language) => {
  const translation = resources[language].translation as Tree;
  const categories = new Intl.PluralRules(language).resolvedOptions().pluralCategories;

  it('has every English key, and no others', () => {
    expect([...keys(translation).keys()].sort()).toEqual([...keys(english).keys()].sort());
  });

  it("has every plural form the language's grammar needs", () => {
    for (const [key, forms] of keys(english)) {
      if (forms.size === 0) continue;
      expect({ key, forms: [...(keys(translation).get(key) ?? [])].sort() }).toEqual({
        key,
        forms: [...categories].sort(),
      });
    }
  });

  it('uses the same placeholders as English', () => {
    const englishStrings = strings(english);
    for (const [key, text] of strings(translation)) {
      const base = key.replace(PLURAL, '');
      const source = englishStrings.get(key) ?? englishStrings.get(`${base}_other`) ?? '';
      // A form for one item may spell the number out ("one word") instead of {{count}}.
      const want = placeholders(source).filter((p) => p !== 'count' || !/_(one|two)$/.test(key));
      const got = placeholders(text).filter((p) => p !== 'count' || !/_(one|two)$/.test(key));
      expect({ key, got }).toEqual({ key, got: want });
    }
  });
});
