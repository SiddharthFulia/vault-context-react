export { VaultProvider, VaultContext, DEFAULT_STORAGE_KEY } from './VaultContext';
export { useVault } from './useVault';

export { VaultModal } from './VaultModal';

export { withVaultRetry } from './withVaultRetry';
export type { WithVaultRetryOptions } from './withVaultRetry';
export { fetchWithVault } from './fetchWithVault';

export {
  requireVaultUnlock,
  getVaultToken,
  lockVault,
  isVaultReady,
} from './bridge';

export { vaultHeaders } from './headers';
export type { VaultHeadersOptions } from './headers';

export { decodeJwt, getJwtExpiryMs, isJwtExpired } from './utils/jwt';

export { CHANGE_EVENT, subscribeVaultChange, dispatchVaultChange } from './events';
export type { VaultChangeDetail } from './events';

export type {
  VaultState,
  LoginOptions,
  VaultProviderProps,
  VaultModalRenderProps,
  VaultBridge,
} from './types';
