import { getVaultToken } from './bridge';

export interface VaultHeadersOptions {
  header?: string;
  scheme?: string;
  token?: string | null;
}

/** Build headers with the vault token attached, if present. */
export function vaultHeaders(
  base?: HeadersInit,
  options: VaultHeadersOptions = {},
): Record<string, string> {
  const out: Record<string, string> = {};

  if (base) {
    if (base instanceof Headers) {
      base.forEach((value, key) => {
        out[key] = value;
      });
    } else if (Array.isArray(base)) {
      for (const [k, v] of base) out[k] = v;
    } else {
      Object.assign(out, base);
    }
  }

  const token = options.token !== undefined ? options.token : getVaultToken();
  if (!token) return out;

  const headerName = options.header ?? 'Authorization';
  const scheme = options.scheme === undefined ? 'Bearer' : options.scheme;
  out[headerName] = scheme ? `${scheme} ${token}` : token;
  return out;
}
