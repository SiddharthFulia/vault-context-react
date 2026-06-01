import { getStorageKey } from './storage';

export const CHANGE_EVENT = 'sid-vault-change';

export interface VaultChangeDetail {
  token: string | null;
  key: string;
  source: 'self' | 'remote';
}

export function dispatchVaultChange(detail: VaultChangeDetail): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent<VaultChangeDetail>(CHANGE_EVENT, { detail }));
  } catch {
    // CustomEvent ctor unavailable — degrade silently
  }
}

export function subscribeVaultChange(
  storageKey: string | undefined,
  cb: (detail: VaultChangeDetail) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const key = getStorageKey(storageKey);

  const onStorage = (e: StorageEvent) => {
    if (e.storageArea !== window.localStorage) return;
    if (e.key !== null && e.key !== key) return;
    // e.key === null happens on clear() — treat as logout
    cb({
      token: e.newValue,
      key,
      source: 'remote',
    });
  };

  const onCustom = (e: Event) => {
    const ce = e as CustomEvent<VaultChangeDetail>;
    if (!ce.detail) return;
    if (ce.detail.key !== key) return;
    cb(ce.detail);
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onCustom as EventListener);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onCustom as EventListener);
  };
}
