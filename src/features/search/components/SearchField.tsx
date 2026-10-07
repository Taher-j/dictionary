import { useTranslation } from 'react-i18next';

import { IconButton } from '@/ui/IconButton';
import { TextField } from '@/ui/TextField';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
}

/** Library search: searches terms and meanings in every dictionary while typing. */
export function SearchField({ value, onChangeText }: SearchFieldProps) {
  const { t } = useTranslation();
  return (
    <TextField
      label={t('library.searchLabel')}
      hideLabel
      placeholder={t('library.searchPlaceholder')}
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      accessory={
        value !== '' ? (
          <IconButton
            icon={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
            accessibilityLabel={t('library.clearSearch')}
            onPress={() => onChangeText('')}
          />
        ) : null
      }
    />
  );
}
