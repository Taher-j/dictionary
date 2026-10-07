import * as Speech from 'expo-speech';

let voices: Promise<Speech.Voice[]> | null = null;

/** Installed voices, read once per app run. */
function installedVoices(): Promise<Speech.Voice[]> {
  voices ??= Speech.getAvailableVoicesAsync().catch(() => []);
  return voices;
}

function primary(language: string): string {
  return language.toLowerCase().split(/[-_]/)[0] ?? '';
}

/** Voices for a language code ("de", "de-DE"), matched on the primary subtag. */
export async function voicesFor(language: string): Promise<Speech.Voice[]> {
  const wanted = primary(language);
  return (await installedVoices()).filter((v) => primary(v.language) === wanted);
}

/** Whether the device can speak this language; the speak button is hidden otherwise. */
export async function canSpeak(language: string | null): Promise<boolean> {
  if (!language) return false;
  return (await voicesFor(language)).length > 0;
}

/** Speaks `text` in the language, interrupting anything already being spoken. */
export function speak(text: string, language: string): void {
  void Speech.stop();
  Speech.speak(text, { language });
}
