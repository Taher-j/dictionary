import { useTranslation } from 'react-i18next';

import { useCanSpeak } from '@/features/speech/useSpeech';
import { speak } from '@/services/speech';
import { IconButton } from '@/ui/IconButton';

/** Speaks a word with the device voice for its language; renders nothing without a voice. */
export function SpeakButton({
  text,
  language,
}: {
  text: string;
  language: string | null | undefined;
}) {
  const { t } = useTranslation();
  const available = useCanSpeak(language);
  if (!available || !language) return null;
  return (
    <IconButton
      icon={{ ios: 'speaker.wave.2', android: 'volume_up', web: 'volume_up' }}
      accessibilityLabel={t('word.speak', { term: text })}
      onPress={() => speak(text, language)}
    />
  );
}
