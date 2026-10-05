import { eq } from 'drizzle-orm';

import { settings } from '@/data/db/schema';
import type { RepositoryDeps } from '@/data/repositories/deps';
import { defaultSettings, type SettingKey, type Settings } from '@/domain/settings';

export interface SettingsRepository {
  /** All settings, with defaults for keys that were never written. */
  getAll(): Promise<Settings>;
  get<K extends SettingKey>(key: K): Promise<Settings[K]>;
  set<K extends SettingKey>(key: K, value: Settings[K]): Promise<void>;
}

function parse<K extends SettingKey>(key: K, raw: string): Settings[K] {
  try {
    return JSON.parse(raw) as Settings[K];
  } catch {
    return defaultSettings[key];
  }
}

function isSettingKey(key: string): key is SettingKey {
  return key in defaultSettings;
}

export function createSettingsRepository({ db, now }: RepositoryDeps): SettingsRepository {
  return {
    async getAll() {
      const result: Settings = { ...defaultSettings };
      for (const row of db.select().from(settings).all()) {
        if (isSettingKey(row.key)) Object.assign(result, { [row.key]: parse(row.key, row.value) });
      }
      return result;
    },

    async get(key) {
      const row = db.select().from(settings).where(eq(settings.key, key)).get();
      return row ? parse(key, row.value) : defaultSettings[key];
    },

    async set(key, value) {
      const at = now();
      const json = JSON.stringify(value);
      db.insert(settings)
        .values({ key, value: json, updatedAt: at })
        .onConflictDoUpdate({ target: settings.key, set: { value: json, updatedAt: at } })
        .run();
    },
  };
}
