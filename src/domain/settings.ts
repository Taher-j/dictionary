import type { EpochMs } from '@/domain/models';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Every setting with its type. Values are stored as JSON in the `settings` table. */
export interface Settings {
  theme: ThemePreference;
  dailyNewLimit: number;
  sessionSize: number;
  hapticsEnabled: boolean;
  lastBackupAt: EpochMs | null;
}

export type SettingKey = keyof Settings;

export const defaultSettings: Settings = {
  theme: 'system',
  dailyNewLimit: 10,
  sessionSize: 20,
  hapticsEnabled: true,
  lastBackupAt: null,
};
