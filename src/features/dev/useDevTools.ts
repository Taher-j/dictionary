import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { BenchmarkResult, SeedProgress } from '@/data/devTools';
import { useDevToolsService } from '@/data/RepositoriesProvider';

const SEED = { words: 50_000, reviewLogs: 200_000 };
const countsKey = ['dev', 'counts'] as const;

export function useDevTools() {
  const devTools = useDevToolsService();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<SeedProgress | null>(null);
  const [results, setResults] = useState<BenchmarkResult[] | null>(null);

  const counts = useQuery({
    queryKey: countsKey,
    queryFn: () => {
      if (!devTools) throw new Error('Dev tools are only available in development builds.');
      return devTools.counts();
    },
    enabled: devTools !== null,
  });

  const afterChange = () => queryClient.invalidateQueries();

  const seed = useMutation({
    mutationFn: async () => {
      await devTools?.seed(SEED, setProgress);
    },
    onSettled: () => {
      setProgress(null);
      void afterChange();
    },
  });

  const wipe = useMutation({
    mutationFn: async () => {
      await devTools?.wipe();
      setResults(null);
    },
    onSettled: () => void afterChange(),
  });

  const benchmark = useMutation({
    mutationFn: async () => (devTools ? devTools.benchmark() : []),
    onSuccess: setResults,
  });

  return {
    available: devTools !== null,
    counts: counts.data,
    progress,
    results,
    busy: seed.isPending || wipe.isPending || benchmark.isPending,
    error: seed.error ?? wipe.error ?? benchmark.error,
    seed: () => seed.mutate(),
    wipe: () => wipe.mutate(),
    benchmark: () => benchmark.mutate(),
  };
}
