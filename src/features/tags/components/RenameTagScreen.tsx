import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import type { TagId } from '@/domain/models';
import { useMergeTag, useRenameTag, useTags } from '@/features/tags/hooks/useTags';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';
import { showToast } from '@/ui/toastStore';

/** Rename a tag. A name another tag already has offers a merge instead (08-decisions.md). */
export function RenameTagScreen({ id }: { id: TagId }) {
  const tags = useTags();
  const tag = tags.data?.find((item) => item.id === id);
  if (!tag) return null;
  return <RenameTagForm key={tag.id} id={tag.id} initialName={tag.name} />;
}

function RenameTagForm({ id, initialName }: { id: TagId; initialName: string }) {
  const { t } = useTranslation();
  const rename = useRenameTag();
  const merge = useMergeTag();
  const [name, setName] = useState(initialName);
  const busy = rename.isPending || merge.isPending;
  const canSave = name.trim() !== '' && !busy;

  const save = async () => {
    const result = await rename.mutateAsync({ id, name });
    if (result.ok) {
      router.back();
      return;
    }
    const target = result.conflict;
    Alert.alert(
      t('tags.conflictTitle', { name: target.name }),
      t('tags.conflictBody', { source: initialName, name: target.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('tags.merge'),
          onPress: async () => {
            await merge.mutateAsync({ sourceId: id, targetId: target.id });
            router.back();
            showToast(t('tags.merged', { source: initialName, target: target.name }));
          },
        },
      ],
    );
  };

  return (
    <Screen
      title={t('tags.renameTitle')}
      avoidKeyboard={false}
      footer={<Button label={t('common.save')} disabled={!canSave} onPress={() => void save()} />}
    >
      <TextField
        label={t('tags.name')}
        value={name}
        onChangeText={setName}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => {
          if (canSave) void save();
        }}
      />
    </Screen>
  );
}
