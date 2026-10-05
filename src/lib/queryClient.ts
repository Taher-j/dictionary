import { QueryClient } from '@tanstack/react-query';

// All data is local (SQLite), so there is nothing to refetch on focus or reconnect.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
      },
    },
  });
}
