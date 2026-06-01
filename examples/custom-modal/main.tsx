import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VaultProvider, useVault, type VaultModalRenderProps } from 'vault-context-react';

function FancyModal(props: VaultModalRenderProps) {
  const [value, setValue] = useState('');
  if (!props.open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20, 0, 40, 0.6)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#1a0f2e',
          color: '#fff',
          padding: 32,
          borderRadius: 16,
          width: 360,
          border: '2px solid #7c3aed',
        }}
      >
        <h2 style={{ marginTop: 0 }}>{props.title}</h2>
        {props.description && <p style={{ opacity: 0.7 }}>{props.description}</p>}
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          style={{ width: '100%', padding: 10, marginBottom: 16 }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {!props.blocking && <button onClick={props.onCancel}>Cancel</button>}
          <button
            onClick={() => value.trim() && props.onSubmit(value.trim())}
            disabled={!value.trim()}
          >
            {props.submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const v = useVault();
  return (
    <main style={{ padding: 32 }}>
      <h1>Custom modal demo</h1>
      <p>Status: {v.unlocked ? 'unlocked' : 'locked'}</p>
      <button
        onClick={() =>
          v.requireUnlock({
            title: 'Fancy unlock',
            description: 'Custom modal with custom styling.',
          })
        }
      >
        Trigger
      </button>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <VaultProvider renderModal={(props) => <FancyModal {...props} />}>
    <App />
  </VaultProvider>,
);
