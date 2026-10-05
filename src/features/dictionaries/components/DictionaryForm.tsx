import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';

interface FormValues {
  name: string;
  termLang: string;
  meaningLang: string;
}

export interface DictionaryFormProps {
  title: string;
  intro?: string;
  initial: FormValues;
  busy: boolean;
  onSubmit: (values: FormValues) => Promise<void>;
}

export function DictionaryForm({ title, intro, initial, busy, onSubmit }: DictionaryFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState(initial);
  const canSave = values.name.trim() !== '' && !busy;
  const set = (key: keyof FormValues) => (text: string) =>
    setValues((v) => ({ ...v, [key]: text }));

  return (
    <Screen
      title={title}
      footer={
        <Button
          label={t('common.save')}
          disabled={!canSave}
          onPress={() => void onSubmit(values)}
        />
      }
    >
      {intro ? <Text tone="muted">{intro}</Text> : null}
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
    </Screen>
  );
}
