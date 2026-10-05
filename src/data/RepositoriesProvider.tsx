import { createContext, useContext, type ReactNode } from 'react';

import type { DevTools } from '@/data/devTools';
import type { Repositories } from '@/data/repositories';

export interface DataServices {
  repositories: Repositories;
  /** Only in development builds. */
  devTools: DevTools | null;
}

const DataContext = createContext<DataServices | null>(null);

interface RepositoriesProviderProps {
  value: DataServices;
  children: ReactNode;
}

/** Provides the repositories created once at startup. */
export function RepositoriesProvider({ value, children }: RepositoriesProviderProps) {
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function useDataServices(): DataServices {
  const value = useContext(DataContext);
  if (!value) throw new Error('useRepositories must be used inside RepositoriesProvider.');
  return value;
}

export function useRepositories(): Repositories {
  return useDataServices().repositories;
}

export function useDevToolsService(): DevTools | null {
  return useDataServices().devTools;
}
