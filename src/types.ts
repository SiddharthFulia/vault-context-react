export interface VaultState {
  unlocked: boolean;
  token: string | null;
  modalOpen: boolean;
  ready: boolean;
  payload: Record<string, unknown> | null;
  requireUnlock: (opts?: LoginOptions) => Promise<boolean>;
  unlock: (token: string) => void;
  lock: () => void;
  closeModal: () => void;
}

export interface LoginOptions {
  title?: string;
  description?: string;
  submitLabel?: string;
  storageKey?: string;
  blocking?: boolean;
}

export interface VaultProviderProps {
  storageKey?: string;
  validate?: (token: string) => boolean;
  renderModal?: (props: VaultModalRenderProps) => React.ReactNode;
  onChange?: (state: { unlocked: boolean; token: string | null }) => void;
  children: React.ReactNode;
}

export interface VaultModalRenderProps {
  open: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  blocking: boolean;
  onSubmit: (token: string) => void;
  onCancel: () => void;
}

export interface VaultBridge {
  requireUnlock: (opts?: LoginOptions) => Promise<boolean>;
  getToken: () => string | null;
  lock: () => void;
  isReady: () => boolean;
}
