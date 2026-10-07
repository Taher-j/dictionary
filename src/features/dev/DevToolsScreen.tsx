import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useDevTools } from '@/features/dev/useDevTools';
import { SpeechCheck } from '@/features/dev/SpeechCheck';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { spacing } from '@/ui/tokens';

const ms = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

/** Development-only: seed, wipe and time queries (Milestone 1 performance check). */
export function DevToolsScreen() {
  const { t } = useTranslation();
  const dev = useDevTools();

  if (!dev.available) {
    return (
      <Screen title={t('dev.title')}>
        <Text>{t('dev.unavailable')}</Text>
      </Screen>
    );
  }

  return (
    <Screen title={t('dev.title')}>
      {dev.counts ? (
        <Text tone="muted">
          {t('dev.counts', {
            words: dev.counts.words,
            cards: dev.counts.cards,
            reviewLogs: dev.counts.reviewLogs,
          })}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button label={t('dev.seed')} onPress={dev.seed} disabled={dev.busy} />
        <Button label={t('dev.benchmark')} onPress={dev.benchmark} disabled={dev.busy} />
        <Button
          label={t('dev.createGermanEnglish')}
          variant="secondary"
          onPress={dev.createGermanEnglish}
          disabled={dev.busy}
        />
        <Button
          label={t('dev.removeSeed')}
          variant="secondary"
          onPress={dev.removeSeed}
          disabled={dev.busy}
        />
        <Button label={t('dev.wipe')} variant="secondary" onPress={dev.wipe} disabled={dev.busy} />
      </View>

      {dev.progress ? (
        <Text accessibilityLiveRegion="polite">
          {t(`dev.progress.${dev.progress.phase}`, {
            done: dev.progress.done,
            total: dev.progress.total,
          })}
        </Text>
      ) : null}
      {dev.busy && !dev.progress ? <Text>{t('dev.working')}</Text> : null}
      {dev.error ? <Text tone="danger">{dev.error.message}</Text> : null}

      <SpeechCheck />

      {dev.results?.map((result) => (
        <View key={result.name} style={styles.result}>
          <Text variant="label">{result.name}</Text>
          <Text tone={result.medianMs < 100 ? 'default' : 'danger'}>
            {t('dev.timing', {
              median: ms.format(result.medianMs),
              max: ms.format(result.maxMs),
              rows: result.rows,
            })}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  result: {
    gap: spacing.xs,
  },
});
