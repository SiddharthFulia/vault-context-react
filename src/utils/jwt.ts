function base64urlDecode(input: string): string {
  const pad = input.length % 4;
  const padded = pad ? input + '='.repeat(4 - pad) : input;
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');

  if (typeof atob === 'function') {
    return atob(b64);
  }
  // Node fallback for SSR / tests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  if (g.Buffer) return g.Buffer.from(b64, 'base64').toString('utf-8');
  throw new Error('No base64 decoder available');
}

/** Decode a JWT payload without verifying signature. Returns null on malformed input. */
export function decodeJwt(token: string): Record<string, unknown> | null {
  if (typeof token !== 'string' || token.length === 0) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const json = base64urlDecode(parts[1]);
    const payload = JSON.parse(json);
    if (typeof payload !== 'object' || payload === null) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Returns the `exp` claim as ms since epoch, or null. */
export function getJwtExpiryMs(token: string): number | null {
  const payload = decodeJwt(token);
  if (!payload) return null;
  const exp = payload.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return null;
  return exp * 1000;
}

/** True if `exp` is in the past. Malformed → true (safe default). No `exp` → false. */
export function isJwtExpired(token: string, skewMs: number = 0): boolean {
  const payload = decodeJwt(token);
  if (!payload) return true;
  const exp = payload.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return false;
  return exp * 1000 - skewMs <= Date.now();
}
