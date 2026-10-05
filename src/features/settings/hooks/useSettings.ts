import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { settingsKeys } from '@/data/queryKeys';
import { useRepositories } from '@/data/RepositoriesProvider';
import { defaultSettings, type SettingKey, type Settings } from '@/domain/settings';

export function useSettings(): Settings {
  const { settings } = useRepositories();
  const query = useQuery({ queryKey: settingsKeys.all, queryFn: () => settings.getAll() });
  return query.data ?? defaultSettings;
}

/** One setting change; the value type follows the key. */
export type SettingUpdate = { [K in SettingKey]: { key: K; value: Settings[K] } }[SettingKey];

export function useSetSetting() {
  const { settings } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    // SettingUpdate pairs key and value, but TypeScript cannot correlate them through the union.
    mutationFn: (update: SettingUpdate) => settings.set(update.key, update.value as never),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}
