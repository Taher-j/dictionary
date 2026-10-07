import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { isValidLookupTemplate } from '@/domain/lookup';

interface FormValues {
  name: string;
  termLang: string;
  meaningLang: string;
  lookupUrl: string;
}

export interface DictionaryFormProps {
  title: string;
  intro?: string;
  /** Rendered under the intro, e.g. "Restore a backup" on first launch. */
  extra?: ReactNode;
  initial: FormValues;
  busy: boolean;
  onSubmit: (values: FormValues) => Promise<void>;
}

export function DictionaryForm({
  title,
  intro,
  extra,
  initial,
  busy,
  onSubmit,
}: DictionaryFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState(initial);
  const lookupValid = values.lookupUrl.trim() === '' || isValidLookupTemplate(values.lookupUrl);
  const canSave = values.name.trim() !== '' && lookupValid && !busy;
  const set = (key: keyof FormValues) => (text: string) =>
    setValues((v) => ({ ...v, [key]: text }));

  return (
    <Screen
      title={title}
      avoidKeyboard={false}
      footer={
        <Button
          label={t('common.save')}
          disabled={!canSave}
          onPress={() => void onSubmit(values)}
        />
      }
    >
      {intro ? <Text tone="muted">{intro}</Text> : null}
      {extra}
      <TextField
        label={t('dictionaryForm.name')}
        value={values.name}
        onChangeText={set('name')}
        autoFocus
        returnKeyType="done"
      />
      <TextField
        label={t('dictionaryForm.termLang')}
        value={values.termLang}
        onChangeText={set('termLang')}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={t('dictionaryForm.langPlaceholder')}
      />
      <TextField
        label={t('dictionaryForm.meaningLang')}
        value={values.meaningLang}
        onChangeText={set('meaningLang')}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={t('dictionaryForm.langPlaceholder')}
      />
      <TextField
        label={t('dictionaryForm.lookupUrl')}
        value={values.lookupUrl}
        onChangeText={set('lookupUrl')}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://en.wiktionary.org/wiki/{term}"
        hint={
          <Text variant="caption" tone={lookupValid ? 'muted' : 'danger'}>
            {t('dictionaryForm.lookupUrlHint', { placeholder: '{term}' })}
          </Text>
        }
      />
    </Screen>
  );
}
