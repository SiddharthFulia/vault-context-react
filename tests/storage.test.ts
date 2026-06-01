import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  readToken,
  writeToken,
  clearToken,
  getStorageKey,
  DEFAULT_STORAGE_KEY,
} from '../src/storage';

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('exports a default storage key', () => {
    expect(DEFAULT_STORAGE_KEY).toBe('sid_vault_token');
  });

  it('returns the override when provided', () => {
    expect(getStorageKey('my_key')).toBe('my_key');
    expect(getStorageKey()).toBe(DEFAULT_STORAGE_KEY);
  });

  it('reads null when no token stored', () => {
    expect(readToken()).toBeNull();
  });

  it('writes and reads back a token under the default key', () => {
    const ok = writeToken('abc.def.ghi');
    expect(ok).toBe(true);
    expect(readToken()).toBe('abc.def.ghi');
    expect(window.localStorage.getItem(DEFAULT_STORAGE_KEY)).toBe('abc.def.ghi');
  });

  it('respects a custom key', () => {
    writeToken('value', 'custom_key');
    expect(readToken('custom_key')).toBe('value');
    expect(readToken()).toBeNull();
  });

  it('rejects empty-string tokens on read', () => {
    window.localStorage.setItem(DEFAULT_STORAGE_KEY, '');
    expect(readToken()).toBeNull();
  });

  it('clearToken removes the entry', () => {
    writeToken('xxx');
    expect(readToken()).toBe('xxx');
    expect(clearToken()).toBe(true);
    expect(readToken()).toBeNull();
  });

  it('survives localStorage throwing on setItem (quota)', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    expect(writeToken('x')).toBe(false);
    spy.mockRestore();
  });

  it('survives localStorage throwing on getItem', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(readToken()).toBeNull();
    spy.mockRestore();
  });
});
