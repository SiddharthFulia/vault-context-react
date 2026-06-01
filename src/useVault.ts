import { useContext } from 'react';
import { VaultContext } from './VaultContext';
import type { VaultState } from './types';

export function useVault(): VaultState {
  const ctx = useContext(VaultContext);
  if (!ctx) {
    throw new Error(
      'useVault() called outside of <VaultProvider>. Wrap your app with <VaultProvider> ' +
        'at the root (typically in main.tsx or App.tsx).',
    );
  }
  return ctx;
}
