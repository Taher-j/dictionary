import * as Haptics from 'expo-haptics';

/** Light tap feedback (after saving, rating). Does nothing when haptics are turned off. */
export function lightImpact(enabled: boolean): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // Haptics are a nicety; devices without a vibrator reject quietly.
  });
}
