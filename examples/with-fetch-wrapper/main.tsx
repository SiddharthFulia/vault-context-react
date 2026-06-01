import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VaultProvider, useVault, withVaultRetry } from 'vault-context-react';

const api = {
  async getThings(): Promise<{ items: string[] }> {
    const res = await withVaultRetry('/api/things');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async createThing(name: string): Promise<{ id: string }> {
    const res = await withVaultRetry('/api/things', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};

function ThingsPanel() {
  const v = useVault();
  const [items, setItems] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!v.ready) return;
    api
      .getThings()
      .then((r) => setItems(r.items))
      .catch((e) => setErr(e.message));
  }, [v.ready, v.unlocked]);

  return (
    <main style={{ padding: 32 }}>
      <h1>Things ({v.unlocked ? 'unlocked' : 'locked'})</h1>
      {err && <p style={{ color: 'crimson' }}>{err}</p>}
      <ul>
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <button
        onClick={async () => {
          try {
            await api.createThing(`new-${Date.now()}`);
            const next = await api.getThings();
            setItems(next.items);
          } catch (e) {
            setErr((e as Error).message);
          }
        }}
      >
        Create
      </button>
      {v.unlocked && <button onClick={() => v.lock()}>Log out</button>}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <VaultProvider>
    <ThingsPanel />
  </VaultProvider>,
);
