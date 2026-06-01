import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  LoginOptions,
  VaultBridge,
  VaultProviderProps,
  VaultState,
} from './types';
import {
  DEFAULT_STORAGE_KEY,
  clearToken,
  getStorageKey,
  readToken,
  writeToken,
} from './storage';
import { dispatchVaultChange, subscribeVaultChange } from './events';
import { registerVaultBridge, unregisterVaultBridge } from './bridge';
import { decodeJwt } from './utils/jwt';
import { VaultModal } from './VaultModal';

export const VaultContext = createContext<VaultState | null>(null);

const DEFAULT_TITLE = 'Enter your access token';
const DEFAULT_SUBMIT = 'Unlock';

const defaultValidate = (t: string) => typeof t === 'string' && t.length > 0;

interface PendingRequest {
  opts: LoginOptions;
  resolve: (success: boolean) => void;
}

export function VaultProvider({
  storageKey,
  validate = defaultValidate,
  renderModal,
  onChange,
  children,
}: VaultProviderProps) {
  const key = getStorageKey(storageKey);

  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<PendingRequest | null>(null);

  // refs so listeners + bridge methods see fresh values without re-subscribing
  const tokenRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const validateRef = useRef(validate);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    validateRef.current = validate;
  }, [validate]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const unlocked = token !== null && validate(token);
  const payload = useMemo(() => (token ? decodeJwt(token) : null), [token]);

  const lastUnlockedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (lastUnlockedRef.current === null) {
      // first ready tick — seed without firing so consumers only see real flips
      lastUnlockedRef.current = unlocked;
      return;
    }
    if (lastUnlockedRef.current === unlocked) return;
    lastUnlockedRef.current = unlocked;
    onChangeRef.current?.({ unlocked, token });
  }, [unlocked, token, ready]);

  useEffect(() => {
    const stored = readToken(key);
    if (stored && validateRef.current(stored)) {
      tokenRef.current = stored;
      setToken(stored);
    } else if (stored) {
      // stored but invalid — clean it so we don't surprise next load
      clearToken(key);
    }
    readyRef.current = true;
    setReady(true);
  }, [key]);

  useEffect(() => {
    return subscribeVaultChange(key, (detail) => {
      if (detail.source === 'remote') {
        const next = detail.token;
        if (next && validateRef.current(next)) {
          tokenRef.current = next;
          setToken(next);
        } else {
          tokenRef.current = null;
          setToken(null);
        }
      }
      // 'self' events: state already updated synchronously in unlock()/lock()
    });
  }, [key]);

  const unlock = useCallback(
    (next: string) => {
      if (!validateRef.current(next)) return;
      tokenRef.current = next;
      setToken(next);
      writeToken(next, key);
      dispatchVaultChange({ token: next, key, source: 'self' });
    },
    [key],
  );

  const lock = useCallback(() => {
    tokenRef.current = null;
    setToken(null);
    clearToken(key);
    dispatchVaultChange({ token: null, key, source: 'self' });
  }, [key]);

  const closeModal = useCallback(() => {
    setPending((p) => {
      if (p) p.resolve(false);
      return null;
    });
  }, []);

  const requireUnlock = useCallback(
    (opts?: LoginOptions): Promise<boolean> => {
      if (tokenRef.current && validateRef.current(tokenRef.current)) {
        return Promise.resolve(true);
      }
      return new Promise<boolean>((resolve) => {
        setPending((prev) => {
          // chain resolves if a request is already in-flight
          if (prev) {
            const chainedResolve = (v: boolean) => {
              prev.resolve(v);
              resolve(v);
            };
            return { opts: opts ?? prev.opts, resolve: chainedResolve };
          }
          return { opts: opts ?? {}, resolve };
        });
      });
    },
    [],
  );

  const bridgeRef = useRef<VaultBridge | null>(null);
  if (bridgeRef.current === null) {
    bridgeRef.current = {
      requireUnlock: (opts) => requireUnlockRef.current(opts),
      getToken: () => tokenRef.current,
      lock: () => lockRef.current(),
      isReady: () => readyRef.current,
    };
  }
  const requireUnlockRef = useRef(requireUnlock);
  const lockRef = useRef(lock);
  useEffect(() => {
    requireUnlockRef.current = requireUnlock;
    lockRef.current = lock;
  }, [requireUnlock, lock]);

  useEffect(() => {
    const impl = bridgeRef.current!;
    registerVaultBridge(impl);
    return () => unregisterVaultBridge(impl);
  }, []);

  const handleModalSubmit = useCallback(
    (submittedToken: string) => {
      if (!validateRef.current(submittedToken)) {
        // keep modal open on invalid input; consumers wanting an error UI should pass renderModal
        return;
      }
      unlock(submittedToken);
      setPending((p) => {
        if (p) p.resolve(true);
        return null;
      });
    },
    [unlock],
  );

  const handleModalCancel = useCallback(() => {
    setPending((p) => {
      if (p) p.resolve(false);
      return null;
    });
  }, []);

  const value = useMemo<VaultState>(
    () => ({
      unlocked,
      token,
      modalOpen: pending !== null,
      ready,
      payload,
      requireUnlock,
      unlock,
      lock,
      closeModal,
    }),
    [unlocked, token, pending, ready, payload, requireUnlock, unlock, lock, closeModal],
  );

  const modalProps = {
    open: pending !== null,
    title: pending?.opts.title ?? DEFAULT_TITLE,
    description: pending?.opts.description,
    submitLabel: pending?.opts.submitLabel ?? DEFAULT_SUBMIT,
    blocking: pending?.opts.blocking ?? false,
    onSubmit: handleModalSubmit,
    onCancel: handleModalCancel,
  };

  return (
    <VaultContext.Provider value={value}>
      {children}
      {renderModal ? renderModal(modalProps) : <VaultModal {...modalProps} />}
    </VaultContext.Provider>
  );
}

export { DEFAULT_STORAGE_KEY };
