import type { LanguagePreference } from '@/domain/language';
import type { PracticeSetup } from '@/domain/practice/practice';
import type { DictionaryId, EpochMs } from '@/domain/models';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Every setting with its type. Values are stored as JSON in the `settings` table. */
export interface Settings {
  theme: ThemePreference;
  language: LanguagePreference;
  dailyNewLimit: number;
  sessionSize: number;
  hapticsEnabled: boolean;
  /** Review shows flashcards only: no typing or multiple choice. */
  flashcardsOnly: boolean;
  /** The practice setup screen opens with the last one used. */
  lastPracticeSetup: PracticeSetup | null;
  lastBackupAt: EpochMs | null;
  /** Preselected in quick add. */
  lastDictionaryId: DictionaryId | null;
}

export type SettingKey = keyof Settings;

export const defaultSettings: Settings = {
  theme: 'system',
  language: 'system',
  dailyNewLimit: 10,
  sessionSize: 20,
  hapticsEnabled: true,
  flashcardsOnly: false,
  lastPracticeSetup: null,
  lastBackupAt: null,
  lastDictionaryId: null,
};
