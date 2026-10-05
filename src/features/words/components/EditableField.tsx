import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Text, type TextVariant } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { minTouchTarget } from '@/ui/tokens';

interface EditableFieldProps {
  label: string;
  value: string | null;
  /** Called with the new value (blank becomes null) when editing ends with a change. */
  onSave: (value: string | null) => void;
  variant?: TextVariant;
  multiline?: boolean;
  /** Field cannot be emptied (the term). */
  required?: boolean;
  /** Start in edit mode (fields opened through "Add details"). */
  startEditing?: boolean;
}

/** Shows a value; tap to edit in place. Saves on blur or the return key. */
export function EditableField({
  label,
  value,
  onSave,
  variant = 'body',
  multiline,
  required,
  startEditing,
}: EditableFieldProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(Boolean(startEditing));
  const [draft, setDraft] = useState(value ?? '');

  const finish = () => {
    setEditing(false);
    const next = draft.trim() === '' ? null : draft.trim();
    if (required && next === null) {
      setDraft(value ?? '');
      return;
    }
    if (next !== (value ?? null)) onSave(next);
  };

  if (editing) {
    return (
      <TextField
        label={label}
        value={draft}
        onChangeText={setDraft}
        onBlur={finish}
        onSubmitEditing={multiline ? undefined : finish}
        multiline={multiline}
        autoFocus
        returnKeyType={multiline ? 'default' : 'done'}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('word.editField', { field: label, value: value ?? t('word.empty') })}
      onPress={() => {
        setDraft(value ?? '');
        setEditing(true);
      }}
      style={styles.display}
    >
      {variant === 'title' || variant === 'meaning' ? null : (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      )}
      <Text variant={variant} tone={value ? 'default' : 'muted'}>
        {value ?? t('word.tapToAdd', { field: label })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  display: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
  },
});
