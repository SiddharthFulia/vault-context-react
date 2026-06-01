import { createRoot } from 'react-dom/client';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { VaultProvider, withVaultRetry, useVault } from 'vault-context-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // withVaultRetry already handles 401; don't double-retry
      retry: false,
    },
  },
});

async function fetchSecretData(): Promise<{ message: string }> {
  const res = await withVaultRetry('/api/secret', {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function Dashboard() {
  const v = useVault();
  const { data, isLoading, error } = useQuery({
    queryKey: ['secret'],
    queryFn: fetchSecretData,
    // wait until hydration is done — avoids a stray 401 on first paint
    enabled: v.ready,
  });

  if (!v.ready) return null;
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {(error as Error).message}</p>;

  return (
    <div>
      <p>Status: {v.unlocked ? 'unlocked' : 'locked'}</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      {v.unlocked && <button onClick={() => v.lock()}>Log out</button>}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <VaultProvider>
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  </VaultProvider>,
);
