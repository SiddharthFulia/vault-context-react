import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { VaultProvider, useVault } from 'vault-context-react';

function App() {
  const vault = useVault();

  if (!vault.ready) return <p>Loading vault state...</p>;

  return (
    <main style={{ fontFamily: 'system-ui', padding: 32, maxWidth: 640 }}>
      <h1>Vault demo</h1>
      <p>
        Status: <strong>{vault.unlocked ? 'unlocked' : 'locked'}</strong>
      </p>
      {vault.unlocked ? (
        <>
          <pre
            style={{
              background: '#111',
              color: '#9f9',
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              overflow: 'auto',
            }}
          >
            {JSON.stringify(vault.payload, null, 2)}
          </pre>
          <button onClick={() => vault.lock()}>Log out</button>
        </>
      ) : (
        <button
          onClick={() =>
            vault.requireUnlock({
              title: 'Unlock the demo',
              description: 'Paste any non-empty value to continue.',
            })
          }
        >
          Unlock
        </button>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VaultProvider>
      <App />
    </VaultProvider>
  </StrictMode>,
);
