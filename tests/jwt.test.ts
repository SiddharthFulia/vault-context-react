import { describe, it, expect } from 'vitest';
import { decodeJwt, getJwtExpiryMs, isJwtExpired } from '../src/utils/jwt';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const body = btoa(JSON.stringify(payload))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.sig`;
}

describe('decodeJwt', () => {
  it('returns null for empty / non-string input', () => {
    expect(decodeJwt('')).toBeNull();
    // @ts-expect-error testing runtime guard
    expect(decodeJwt(null)).toBeNull();
    // @ts-expect-error testing runtime guard
    expect(decodeJwt(undefined)).toBeNull();
  });

  it('returns null for a non-3-segment token', () => {
    expect(decodeJwt('not.a.jwt.too.many')).toBeNull();
    expect(decodeJwt('only.two')).toBeNull();
  });

  it('decodes a valid payload', () => {
    const token = makeJwt({ sub: 'user123', email: 'a@b.com', exp: 1893456000 });
    const payload = decodeJwt(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('user123');
    expect(payload?.email).toBe('a@b.com');
  });

  it('handles base64url chars correctly', () => {
    const token = makeJwt({ data: '???>>>' });
    const payload = decodeJwt(token);
    expect(payload?.data).toBe('???>>>');
  });

  it('returns null on garbage payload', () => {
    expect(decodeJwt('aaa.!!!.zzz')).toBeNull();
  });
});

describe('getJwtExpiryMs', () => {
  it('returns ms-since-epoch when exp present', () => {
    const token = makeJwt({ exp: 1893456000 });
    expect(getJwtExpiryMs(token)).toBe(1893456000 * 1000);
  });

  it('returns null when exp missing or non-numeric', () => {
    expect(getJwtExpiryMs(makeJwt({}))).toBeNull();
    expect(getJwtExpiryMs(makeJwt({ exp: 'soon' }))).toBeNull();
  });
});

describe('isJwtExpired', () => {
  it('returns true for malformed tokens (safe default)', () => {
    expect(isJwtExpired('garbage')).toBe(true);
  });

  it('returns false when exp is far in the future', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(isJwtExpired(makeJwt({ exp: future }))).toBe(false);
  });

  it('returns true when exp is in the past', () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    expect(isJwtExpired(makeJwt({ exp: past }))).toBe(true);
  });

  it('treats missing exp as never-expiring', () => {
    expect(isJwtExpired(makeJwt({ sub: 'u' }))).toBe(false);
  });

  it('respects skewMs for proactive refresh', () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = makeJwt({ exp });
    expect(isJwtExpired(token, 120_000)).toBe(true);
    expect(isJwtExpired(token, 30_000)).toBe(false);
  });
});
