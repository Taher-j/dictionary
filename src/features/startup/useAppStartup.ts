import { useEffect, useState } from 'react';

import { openAppDatabase } from '@/data/db/client';
import { createDevTools } from '@/data/devTools';
import { createRepositories } from '@/data/repositories';
import type { DataServices } from '@/data/RepositoriesProvider';
import { purgeCutoff } from '@/domain/trash';
import { applyPreferences, promptRestart } from '@/features/settings/preferences';
import { systemClock } from '@/lib/clock';
import { createIdGenerator } from '@/lib/ids';
import { secureRandomBytes } from '@/services/random';
import { createSnapshotStore } from '@/services/snapshotStore';

export type StartupState =
  | { status: 'loading' }
  | { status: 'ready'; services: DataServices }
  | { status: 'error'; error: Error };

// Started once per app process, even if the root layout mounts twice (React strict mode).
let startup: Promise<{ services: DataServices; restartNeeded: boolean }> | null = null;

async function start(): Promise<{ services: DataServices; restartNeeded: boolean }> {
  const now = systemClock;
  const { db } = await openAppDatabase(createSnapshotStore(now));
  const deps = { db, now, newId: createIdGenerator({ now, randomBytes: secureRandomBytes }) };
  const repositories = createRepositories(deps);
  // Before the splash screen hides, so the first screen already has the right theme and language.
  // The direction is read at launch; if the device language changed since, it needs one restart.
  const { restartNeeded } = applyPreferences(await repositories.settings.getAll());
  // Trashed words and dictionaries are deleted for good after 30 days.
  await repositories.trash.purge(purgeCutoff(now()));
  const devTools = __DEV__ ? createDevTools(deps, repositories, () => performance.now()) : null;
  return { services: { repositories, devTools }, restartNeeded };
}

/** Opens and migrates the database, then creates the repositories. */
export function useAppStartup(): StartupState {
  const [state, setState] = useState<StartupState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    startup ??= start();
    startup.then(
      ({ services, restartNeeded }) => {
        if (!active) return;
        setState({ status: 'ready', services });
        // An alert raised before the first screen exists is dropped, so it waits until now.
        if (restartNeeded) promptRestart();
      },
      (error: unknown) =>
        active &&
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        }),
    );
    return () => {
      active = false;
    };
  }, []);

  return state;
}
