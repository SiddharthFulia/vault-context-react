import { getVaultToken, requireVaultUnlock } from './bridge';
import type { LoginOptions } from './types';

export interface WithVaultRetryOptions {
  attachAuth?: boolean;
  authHeader?: string;
  authScheme?: string;
  unauthorizedStatuses?: number[];
  loginOptions?: LoginOptions;
  fetchImpl?: typeof fetch;
}

const DEFAULT_UNAUTH = [401];

function attachAuthHeader(
  init: RequestInit,
  token: string | null,
  headerName: string,
  scheme: string,
): RequestInit {
  if (!token) return init;

  const headers = new Headers(init.headers ?? {});
  // don't clobber a caller-supplied Authorization header
  if (headers.has(headerName)) return { ...init, headers };
  headers.set(headerName, scheme ? `${scheme} ${token}` : token);
  return { ...init, headers };
}

/** Fetch wrapper that opens the login modal on 401 and retries once. */
export async function withVaultRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: WithVaultRetryOptions = {},
): Promise<Response> {
  const {
    attachAuth = true,
    authHeader = 'Authorization',
    authScheme = 'Bearer',
    unauthorizedStatuses = DEFAULT_UNAUTH,
    loginOptions,
    fetchImpl = fetch,
  } = options;

  const isUnauthorized = (s: number) => unauthorizedStatuses.includes(s);

  const firstInit = attachAuth
    ? attachAuthHeader(init, getVaultToken(), authHeader, authScheme)
    : init;

  const firstResponse = await fetchImpl(input, firstInit);
  if (!isUnauthorized(firstResponse.status)) {
    return firstResponse;
  }

  const unlocked = await requireVaultUnlock(loginOptions);
  if (!unlocked) {
    // user cancelled — surface the original 401 to the caller
    return firstResponse;
  }

  const retryInit = attachAuth
    ? attachAuthHeader(init, getVaultToken(), authHeader, authScheme)
    : init;

  return fetchImpl(input, retryInit);
}
