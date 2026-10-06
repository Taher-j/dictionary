import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, type TextInput } from 'react-native';

import type { DictionaryId, WordDetails } from '@/domain/models';
import { useDictionaries } from '@/features/dictionaries/hooks/useDictionaries';
import { useLightHaptic } from '@/features/settings/hooks/useHaptics';
import { useSetSetting, useSettings } from '@/features/settings/hooks/useSettings';
import { DictionaryChips } from '@/features/words/components/DictionaryChips';
import { DuplicateWarning } from '@/features/words/components/DuplicateWarning';
import { useCreateWord, useDuplicates } from '@/features/words/hooks/useWords';
import { readClipboardText } from '@/services/clipboard';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { TextField } from '@/ui/TextField';
import { showToast } from '@/ui/toastStore';

interface QuickAddScreenProps {
  initialTerm?: string;
  /** The sentence the word was met in (deep link / share); goes into Example. */
  context?: string;
  dictionaryId?: DictionaryId;
}

type ExtraField = Exclude<keyof WordDetails, 'translation'>;
const EXTRA_FIELDS: readonly ExtraField[] = [
  'definition',
  'example',
  'partOfSpeech',
  'forms',
  'pronunciation',
  'notes',
  'source',
];
const MULTILINE: ReadonlySet<ExtraField> = new Set(['definition', 'example', 'notes']);

/** Quick add (docs/05-ux.md): never saves on its own. */
export function QuickAddScreen({ initialTerm, context, dictionaryId }: QuickAddScreenProps) {
  const { t } = useTranslation();
  const settings = useSettings();
  const setSetting = useSetSetting();
  const dictionaries = useDictionaries();
  const create = useCreateWord();
  const haptic = useLightHaptic();
  const termRef = useRef<TextInput>(null);

  const list = dictionaries.data ?? [];
  const [chosen, setChosen] = useState<DictionaryId | null>(dictionaryId ?? null);
  const selected =
    chosen ?? list.find((d) => d.id === settings.lastDictionaryId)?.id ?? list[0]?.id ?? null;

  const [term, setTerm] = useState(initialTerm ?? '');
  const [meaning, setMeaning] = useState('');
  const [extra, setExtra] = useState<Partial<Record<ExtraField, string>>>(
    context ? { example: context } : {},
  );
  const [showMore, setShowMore] = useState(Boolean(context));
  const duplicates = useDuplicates(selected, term);

  useEffect(() => {
    // Keyboard up on open (the field also has autoFocus; this covers re-renders on Android).
    const timer = setTimeout(() => termRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  if (dictionaries.isSuccess && list.length === 0) {
    return (
      <Screen title={t('add.title')}>
        <Text>{t('add.noDictionary')}</Text>
        <Button
          label={t('library.newDictionary')}
          onPress={() => router.replace('/dictionary/new?first=1')}
        />
      </Screen>
    );
  }

  const canSave = term.trim() !== '' && selected !== null && !create.isPending;

  const save = async (addAnother: boolean) => {
    if (!canSave || !selected) return;
    const word = await create.mutateAsync({
      dictionaryId: selected,
      term,
      translation: meaning,
      ...extra,
    });
    setSetting.mutate({ key: 'lastDictionaryId', value: selected });
    haptic();
    showToast(t('add.saved', { term: word.term }), {
      label: t('add.addDetails'),
      onPress: () => router.push(`/word/${word.id}`),
    });
    if (addAnother) {
      setTerm('');
      setMeaning('');
      setExtra({});
      setShowMore(false);
      termRef.current?.focus();
    } else {
      Keyboard.dismiss();
      router.back();
    }
  };

  return (
    <Screen
      title={t('add.title')}
      footer={
        <>
          <Button label={t('add.save')} disabled={!canSave} onPress={() => void save(false)} />
          <Button
            label={t('add.saveAndAnother')}
            variant="secondary"
            disabled={!canSave}
            onPress={() => void save(true)}
          />
        </>
      }
    >
      <DictionaryChips dictionaries={list} selected={selected} onSelect={setChosen} />
      <TextField
        ref={termRef}
        label={t('add.term')}
        value={term}
        onChangeText={setTerm}
        autoFocus
        autoCapitalize="none"
        returnKeyType="next"
        submitBehavior="submit"
        accessory={
          <IconButton
            icon={{ ios: 'doc.on.clipboard', android: 'content_paste', web: 'content_paste' }}
            accessibilityLabel={t('add.paste')}
            onPress={async () => {
              const text = (await readClipboardText()).trim();
              if (text) setTerm(text);
            }}
          />
        }
        hint={
          <DuplicateWarning
            matches={term.trim() ? (duplicates.data ?? []) : []}
            dictionaries={list}
          />
        }
      />
      <TextField
        label={t('add.meaning')}
        value={meaning}
        onChangeText={setMeaning}
        returnKeyType="done"
        onSubmitEditing={() => void save(false)}
      />
      {showMore ? (
        EXTRA_FIELDS.map((field) => (
          <TextField
            key={field}
            label={t(`fields.${field}`)}
            value={extra[field] ?? ''}
            onChangeText={(text) => setExtra((e) => ({ ...e, [field]: text }))}
            multiline={MULTILINE.has(field)}
          />
        ))
      ) : (
        <TextButton label={t('add.moreFields')} onPress={() => setShowMore(true)} />
      )}
    </Screen>
  );
}
