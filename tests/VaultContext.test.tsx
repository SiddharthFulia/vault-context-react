import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VaultProvider } from '../src/VaultContext';
import { useVault } from '../src/useVault';
import { CHANGE_EVENT, dispatchVaultChange } from '../src/events';
import { DEFAULT_STORAGE_KEY } from '../src/storage';

function Probe() {
  const v = useVault();
  return (
    <div>
      <span data-testid="ready">{String(v.ready)}</span>
      <span data-testid="unlocked">{String(v.unlocked)}</span>
      <span data-testid="token">{v.token ?? 'null'}</span>
      <button data-testid="trigger" onClick={() => v.requireUnlock({ title: 'Need it' })}>
        trigger
      </button>
      <button data-testid="logout" onClick={() => v.lock()}>
        logout
      </button>
      <button data-testid="manual-unlock" onClick={() => v.unlock('manual.tok.en')}>
        manual
      </button>
    </div>
  );
}

describe('VaultProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('hydrates from localStorage on mount', async () => {
    window.localStorage.setItem(DEFAULT_STORAGE_KEY, 'pre.existing.token');

    render(
      <VaultProvider>
        <Probe />
      </VaultProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('ready')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('unlocked')).toHaveTextContent('true');
    expect(screen.getByTestId('token')).toHaveTextContent('pre.existing.token');
  });

  it('renders locked when storage is empty', async () => {
    render(
      <VaultProvider>
        <Probe />
      </VaultProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('ready')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('unlocked')).toHaveTextContent('false');
  });

  it('opens the default modal on requireUnlock and unlocks on submit', async () => {
    const user = userEvent.setup();
    render(
      <VaultProvider>
        <Probe />
      </VaultProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));

    await user.click(screen.getByTestId('trigger'));
    const modal = await screen.findByTestId('vault-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent('Need it');

    await user.type(screen.getByTestId('vault-modal-input'), 'fresh.tok.en');
    await user.click(screen.getByTestId('vault-modal-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('unlocked')).toHaveTextContent('true');
      expect(screen.getByTestId('token')).toHaveTextContent('fresh.tok.en');
    });
    expect(screen.queryByTestId('vault-modal')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(DEFAULT_STORAGE_KEY)).toBe('fresh.tok.en');
  });

  it('cancel closes the modal and leaves vault locked', async () => {
    const user = userEvent.setup();
    render(
      <VaultProvider>
        <Probe />
      </VaultProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));

    await user.click(screen.getByTestId('trigger'));
    await screen.findByTestId('vault-modal');
    await user.click(screen.getByTestId('vault-modal-cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('vault-modal')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('unlocked')).toHaveTextContent('false');
  });

  it('lock() clears the token and storage', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(DEFAULT_STORAGE_KEY, 'pre.tok.en');
    render(
      <VaultProvider>
        <Probe />
      </VaultProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('unlocked')).toHaveTextContent('true'));

    await user.click(screen.getByTestId('logout'));

    await waitFor(() => {
      expect(screen.getByTestId('unlocked')).toHaveTextContent('false');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
    });
    expect(window.localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();
  });

  it('cross-tab sync via storage event locks the current tab', async () => {
    window.localStorage.setItem(DEFAULT_STORAGE_KEY, 'remote.tok.en');
    render(
      <VaultProvider>
        <Probe />
      </VaultProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('unlocked')).toHaveTextContent('true'));

    // jsdom doesn't auto-fire storage events for same-window writes
    act(() => {
      window.localStorage.removeItem(DEFAULT_STORAGE_KEY);
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: DEFAULT_STORAGE_KEY,
          oldValue: 'remote.tok.en',
          newValue: null,
          storageArea: window.localStorage,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('unlocked')).toHaveTextContent('false');
    });
  });

  it('cross-tab sync via storage event unlocks the current tab', async () => {
    render(
      <VaultProvider>
        <Probe />
      </VaultProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
    expect(screen.getByTestId('unlocked')).toHaveTextContent('false');

    act(() => {
      window.localStorage.setItem(DEFAULT_STORAGE_KEY, 'arrived.tok.en');
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: DEFAULT_STORAGE_KEY,
          oldValue: null,
          newValue: 'arrived.tok.en',
          storageArea: window.localStorage,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('unlocked')).toHaveTextContent('true');
      expect(screen.getByTestId('token')).toHaveTextContent('arrived.tok.en');
    });
  });

  it('onChange fires only when unlocked flips', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <VaultProvider onChange={onChange}>
        <Probe />
      </VaultProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));

    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('manual-unlock'));
    await waitFor(() => expect(screen.getByTestId('unlocked')).toHaveTextContent('true'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].unlocked).toBe(true);

    await user.click(screen.getByTestId('logout'));
    await waitFor(() => expect(screen.getByTestId('unlocked')).toHaveTextContent('false'));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0].unlocked).toBe(false);
  });

  it('requireUnlock resolves immediately when already unlocked', async () => {
    window.localStorage.setItem(DEFAULT_STORAGE_KEY, 'have.it.already');

    let resolved = false;
    function Trigger() {
      const v = useVault();
      return (
        <button
          data-testid="rq"
          onClick={async () => {
            const ok = await v.requireUnlock();
            resolved = ok;
          }}
        >
          go
        </button>
      );
    }

    const user = userEvent.setup();
    render(
      <VaultProvider>
        <Trigger />
      </VaultProvider>,
    );

    await user.click(screen.getByTestId('rq'));
    await waitFor(() => expect(resolved).toBe(true));
    expect(screen.queryByTestId('vault-modal')).not.toBeInTheDocument();
  });

  it('respects a custom storage key', async () => {
    window.localStorage.setItem('alt_key', 'alt.value');
    render(
      <VaultProvider storageKey="alt_key">
        <Probe />
      </VaultProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('unlocked')).toHaveTextContent('true'));
    expect(screen.getByTestId('token')).toHaveTextContent('alt.value');
  });

  it('CHANGE_EVENT name is stable', () => {
    expect(CHANGE_EVENT).toBe('sid-vault-change');
    let received: string | null = 'untouched';
    const handler = (e: Event) => {
      received = (e as CustomEvent).detail.token;
    };
    window.addEventListener(CHANGE_EVENT, handler);
    dispatchVaultChange({ token: 'hi', key: DEFAULT_STORAGE_KEY, source: 'self' });
    window.removeEventListener(CHANGE_EVENT, handler);
    expect(received).toBe('hi');
  });

  it('useVault throws when no Provider is mounted', () => {
    const orig = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow(/useVault\(\) called outside/);
    console.error = orig;
  });
});
