import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { DictionaryId } from '@/domain/models';
import {
  useCreateDictionary,
  useDictionary,
  useUpdateDictionary,
} from '@/features/dictionaries/hooks/useDictionaries';
import { useSetSetting } from '@/features/settings/hooks/useSettings';
import { DictionaryForm } from '@/features/dictionaries/components/DictionaryForm';

interface DictionaryFormScreenProps {
  /** Edit this dictionary; without it a new one is created. */
  dictionaryId?: DictionaryId;
  /** First launch: after creating, open quick add. */
  firstLaunch?: boolean;
}

/** Name plus term and meaning languages; only the name is required. */
export function DictionaryFormScreen({ dictionaryId, firstLaunch }: DictionaryFormScreenProps) {
  const { t } = useTranslation();
  const existing = useDictionary(dictionaryId);
  const create = useCreateDictionary();
  const update = useUpdateDictionary();
  const setSetting = useSetSetting();

  if (dictionaryId && !existing.data) return null;
  return (
    <DictionaryForm
      key={existing.data?.id ?? 'new'}
      title={dictionaryId ? t('dictionaryForm.editTitle') : t('dictionaryForm.newTitle')}
      intro={firstLaunch ? t('dictionaryForm.firstLaunchIntro') : undefined}
      initial={{
        name: existing.data?.name ?? '',
        termLang: existing.data?.termLang ?? '',
        meaningLang: existing.data?.meaningLang ?? '',
      }}
      busy={create.isPending || update.isPending}
      onSubmit={async (values) => {
        const fields = {
          name: values.name,
          termLang: values.termLang.trim() || null,
          meaningLang: values.meaningLang.trim() || null,
        };
        if (dictionaryId) {
          await update.mutateAsync({ id: dictionaryId, patch: fields });
          router.back();
          return;
        }
        const created = await create.mutateAsync(fields);
        await setSetting.mutateAsync({ key: 'lastDictionaryId', value: created.id });
        if (firstLaunch) router.replace({ pathname: '/add', params: { dictionaryId: created.id } });
        else router.back();
      }}
    />
  );
}
