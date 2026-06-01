import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerVaultBridge,
  unregisterVaultBridge,
  requireVaultUnlock,
  getVaultToken,
  lockVault,
  isVaultReady,
  __resetBridgeForTests,
} from '../src/bridge';
import type { VaultBridge } from '../src/types';

function makeBridge(): VaultBridge {
  return {
    requireUnlock: vi.fn().mockResolvedValue(true),
    getToken: vi.fn().mockReturnValue('current.tok.en'),
    lock: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  };
}

describe('bridge singleton', () => {
  beforeEach(() => {
    __resetBridgeForTests();
  });

  it('returns null token and not-ready when no provider registered', () => {
    expect(getVaultToken()).toBeNull();
    expect(isVaultReady()).toBe(false);
    expect(() => lockVault()).not.toThrow();
  });

  it('queues requireVaultUnlock calls made before mount', async () => {
    const p = requireVaultUnlock({ title: 'pls' });

    const bridge = makeBridge();
    registerVaultBridge(bridge);

    const result = await p;
    expect(result).toBe(true);
    expect(bridge.requireUnlock).toHaveBeenCalledWith({ title: 'pls' });
  });

  it('delegates to the registered bridge when present', async () => {
    const bridge = makeBridge();
    registerVaultBridge(bridge);

    expect(getVaultToken()).toBe('current.tok.en');
    expect(isVaultReady()).toBe(true);

    const result = await requireVaultUnlock();
    expect(result).toBe(true);
    expect(bridge.requireUnlock).toHaveBeenCalledTimes(1);

    lockVault();
    expect(bridge.lock).toHaveBeenCalledTimes(1);
  });

  it('unregister disconnects the bridge', () => {
    const bridge = makeBridge();
    registerVaultBridge(bridge);
    expect(getVaultToken()).toBe('current.tok.en');

    unregisterVaultBridge(bridge);
    expect(getVaultToken()).toBeNull();
    expect(isVaultReady()).toBe(false);
  });

  it('unregister of a different bridge does not affect the current one', () => {
    const a = makeBridge();
    const b = makeBridge();
    registerVaultBridge(a);
    unregisterVaultBridge(b);
    expect(getVaultToken()).toBe('current.tok.en');
  });

  it('replaces the bridge on a second register (HMR / Provider remount)', async () => {
    const a = makeBridge();
    const b: VaultBridge = {
      requireUnlock: vi.fn().mockResolvedValue(false),
      getToken: vi.fn().mockReturnValue('newer.tok.en'),
      lock: vi.fn(),
      isReady: vi.fn().mockReturnValue(true),
    };
    registerVaultBridge(a);
    registerVaultBridge(b);

    expect(getVaultToken()).toBe('newer.tok.en');
    const r = await requireVaultUnlock();
    expect(r).toBe(false);
    expect(a.requireUnlock).not.toHaveBeenCalled();
    expect(b.requireUnlock).toHaveBeenCalled();
  });
});
