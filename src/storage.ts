export const DEFAULT_STORAGE_KEY = 'sid_vault_token';

function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export function readToken(key: string = DEFAULT_STORAGE_KEY): string | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function writeToken(token: string, key: string = DEFAULT_STORAGE_KEY): boolean {
  if (!hasStorage()) return false;
  try {
    window.localStorage.setItem(key, token);
    return true;
  } catch {
    return false;
  }
}

export function clearToken(key: string = DEFAULT_STORAGE_KEY): boolean {
  if (!hasStorage()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getStorageKey(override?: string): string {
  return override ?? DEFAULT_STORAGE_KEY;
}
