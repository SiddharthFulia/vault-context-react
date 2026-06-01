import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withVaultRetry } from '../src/withVaultRetry';
import { fetchWithVault } from '../src/fetchWithVault';
import { registerVaultBridge, __resetBridgeForTests } from '../src/bridge';
import type { VaultBridge } from '../src/types';

function makeBridge(overrides: Partial<VaultBridge> = {}): VaultBridge {
  return {
    requireUnlock: vi.fn().mockResolvedValue(true),
    getToken: vi.fn().mockReturnValue('initial.token'),
    lock: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
    ...overrides,
  };
}

function makeResponse(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('withVaultRetry', () => {
  beforeEach(() => {
    __resetBridgeForTests();
  });

  it('passes through a 200 response without retry', async () => {
    const bridge = makeBridge();
    registerVaultBridge(bridge);

    const fetchImpl = vi.fn().mockResolvedValue(makeResponse(200, { ok: true }));
    const res = await withVaultRetry('/api/x', {}, { fetchImpl });

    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(bridge.requireUnlock).not.toHaveBeenCalled();
  });

  it('attaches Authorization: Bearer <token> by default', async () => {
    registerVaultBridge(makeBridge({ getToken: () => 'my.access.token' }));

    const fetchImpl = vi.fn().mockResolvedValue(makeResponse(200));
    await withVaultRetry('/api/x', {}, { fetchImpl });

    const callInit = fetchImpl.mock.calls[0][1] as RequestInit;
    const headers = new Headers(callInit.headers ?? {});
    expect(headers.get('Authorization')).toBe('Bearer my.access.token');
  });

  it('skips auth attachment when attachAuth=false', async () => {
    registerVaultBridge(makeBridge());
    const fetchImpl = vi.fn().mockResolvedValue(makeResponse(200));
    await withVaultRetry('/api/x', {}, { fetchImpl, attachAuth: false });
    const callInit = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(callInit.headers).toBeUndefined();
  });

  it('on 401, opens the modal and retries with the new token', async () => {
    let currentToken = 'stale.token';
    const bridge = makeBridge({
      getToken: () => currentToken,
      requireUnlock: vi.fn().mockImplementation(async () => {
        currentToken = 'fresh.token';
        return true;
      }),
    });
    registerVaultBridge(bridge);

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(200, { ok: 1 }));

    const res = await withVaultRetry('/api/secret', {}, { fetchImpl });
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(bridge.requireUnlock).toHaveBeenCalledTimes(1);

    const firstHeaders = new Headers(
      (fetchImpl.mock.calls[0][1] as RequestInit).headers ?? {},
    );
    const secondHeaders = new Headers(
      (fetchImpl.mock.calls[1][1] as RequestInit).headers ?? {},
    );
    expect(firstHeaders.get('Authorization')).toBe('Bearer stale.token');
    expect(secondHeaders.get('Authorization')).toBe('Bearer fresh.token');
  });

  it('returns the original 401 when the user cancels the modal', async () => {
    const bridge = makeBridge({
      requireUnlock: vi.fn().mockResolvedValue(false),
    });
    registerVaultBridge(bridge);

    const fetchImpl = vi.fn().mockResolvedValueOnce(makeResponse(401, { error: 'auth' }));
    const res = await withVaultRetry('/api/x', {}, { fetchImpl });

    expect(res.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(bridge.requireUnlock).toHaveBeenCalledTimes(1);
  });

  it('retries exactly once — a second 401 propagates', async () => {
    registerVaultBridge(makeBridge());

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(401))
      .mockResolvedValueOnce(makeResponse(401));

    const res = await withVaultRetry('/api/x', {}, { fetchImpl });
    expect(res.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('honors a custom unauthorizedStatuses list (e.g. 403)', async () => {
    registerVaultBridge(makeBridge());

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(403))
      .mockResolvedValueOnce(makeResponse(200));

    const res = await withVaultRetry(
      '/api/x',
      {},
      { fetchImpl, unauthorizedStatuses: [403] },
    );
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not clobber caller-supplied Authorization header', async () => {
    registerVaultBridge(makeBridge({ getToken: () => 'vault.token' }));

    const fetchImpl = vi.fn().mockResolvedValue(makeResponse(200));
    await withVaultRetry(
      '/api/x',
      { headers: { Authorization: 'Custom abc' } },
      { fetchImpl },
    );

    const headers = new Headers(
      (fetchImpl.mock.calls[0][1] as RequestInit).headers ?? {},
    );
    expect(headers.get('Authorization')).toBe('Custom abc');
  });

  it('fetchWithVault alias points at the same implementation', async () => {
    registerVaultBridge(makeBridge());
    const fetchImpl = vi.fn().mockResolvedValue(makeResponse(200));
    const res = await fetchWithVault('/api/x', {}, { fetchImpl });
    expect(res.status).toBe(200);
  });

  it('uses custom authHeader and authScheme', async () => {
    registerVaultBridge(makeBridge({ getToken: () => 'raw.token' }));

    const fetchImpl = vi.fn().mockResolvedValue(makeResponse(200));
    await withVaultRetry(
      '/api/x',
      {},
      { fetchImpl, authHeader: 'X-Vault-Token', authScheme: '' },
    );

    const headers = new Headers(
      (fetchImpl.mock.calls[0][1] as RequestInit).headers ?? {},
    );
    expect(headers.get('X-Vault-Token')).toBe('raw.token');
    expect(headers.get('Authorization')).toBeNull();
  });
});
