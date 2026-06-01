import type { LoginOptions, VaultBridge } from './types';

let bridge: VaultBridge | null = null;
let pendingQueue: Array<{
  opts: LoginOptions | undefined;
  resolve: (v: boolean) => void;
}> = [];

export function registerVaultBridge(impl: VaultBridge): void {
  bridge = impl;
  if (pendingQueue.length > 0) {
    const q = pendingQueue;
    pendingQueue = [];
    for (const item of q) {
      impl.requireUnlock(item.opts).then(item.resolve).catch(() => item.resolve(false));
    }
  }
}

export function unregisterVaultBridge(impl: VaultBridge): void {
  if (bridge === impl) bridge = null;
}

/** Trigger the global login modal from anywhere — including non-React code. */
export function requireVaultUnlock(opts?: LoginOptions): Promise<boolean> {
  if (bridge) return bridge.requireUnlock(opts);
  return new Promise<boolean>((resolve) => {
    pendingQueue.push({ opts, resolve });
  });
}

/** Current vault token, or null if locked / no provider mounted. */
export function getVaultToken(): string | null {
  return bridge ? bridge.getToken() : null;
}

/** Clear the vault from anywhere. */
export function lockVault(): void {
  if (bridge) bridge.lock();
}

export function isVaultReady(): boolean {
  return bridge ? bridge.isReady() : false;
}

/** @internal test-only */
export function __resetBridgeForTests(): void {
  bridge = null;
  pendingQueue = [];
}
