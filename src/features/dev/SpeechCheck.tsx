import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { APP_LANGUAGES } from '@/domain/language';
import { speak, voicesFor } from '@/services/speech';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { spacing } from '@/ui/tokens';

const SAMPLES: Record<(typeof APP_LANGUAGES)[number], string> = {
  en: 'Hello, this is a test.',
  de: 'Grüße aus München, schön!',
  ar: 'مرحبا، هذا اختبار.',
};

/** Development-only: installed text-to-speech voices per UI language, with a test phrase. */
export function SpeechCheck() {
  const { t } = useTranslation();
  const voices = useQuery({
    queryKey: ['dev', 'voices'],
    queryFn: async () =>
      Promise.all(
        APP_LANGUAGES.map(async (lang) => ({ lang, count: (await voicesFor(lang)).length })),
      ),
  });
  return (
    <View style={styles.root}>
      <Text variant="label">{t('dev.voicesTitle')}</Text>
      {(voices.data ?? []).map(({ lang, count }) => (
        <View key={lang} style={styles.row}>
          <Text>{t('dev.voices', { lang, count })}</Text>
          <TextButton
            label={t('dev.speakTest', { lang })}
            disabled={count === 0}
            onPress={() => speak(SAMPLES[lang], lang)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
