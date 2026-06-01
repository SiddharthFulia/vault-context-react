# vault-context-react

> Drop-in React auth context for token-gated apps. One Provider, one global
> login modal, cross-tab sync, and a `fetch` wrapper that auto-retries 401s.

```bash
npm i vault-context-react
```

`vault-context-react` is what you reach for when:

- You have a side project / portfolio / staging app behind a shared token.
- You're tired of mounting a `<VaultGate>` modal in every page.
- You want a `withVaultRetry()` fetch wrapper that "just works" — silently
  pops the login modal on 401 and retries the original request.
- You want all open tabs to lock the moment any tab logs out.

Zero runtime deps. ~3 KB gzipped. TypeScript-first.

---

## Why this exists

The typical "I need a token gate" code on a portfolio app drifts to this
shape over time:

```tsx
<Page><VaultGate><LabContent/></VaultGate></Page>
<Page><VaultGate><VisionContent/></VaultGate></Page>
<Page><VaultGate><ScienceContent/></VaultGate></Page>
```

Each `VaultGate` has its own modal, its own state, its own localStorage
read. Cross-tab sync is broken. The fetch layer can't trigger a modal
because there's no single modal to trigger. Tokens leak between sections.

This package collapses all of that to:

```tsx
<VaultProvider>
  <App />
</VaultProvider>
```

One Provider. One modal. One token. One bridge that any non-React code can
call into.

---

## Quick start

### 1. Mount the Provider at the root

```tsx
// main.tsx
import { createRoot } from 'react-dom/client';
import { VaultProvider } from 'vault-context-react';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <VaultProvider>
    <App />
  </VaultProvider>
);
```

### 2. Read state with `useVault()`

```tsx
import { useVault } from 'vault-context-react';

function LabPage() {
  const v = useVault();

  if (!v.ready) return null;          // hydrating from localStorage
  if (!v.unlocked) {
    return (
      <button onClick={() => v.requireUnlock({ title: 'Unlock the Lab' })}>
        Unlock
      </button>
    );
  }

  return <LabContent />;
}
```

### 3. Open the modal from non-React code

```ts
import { requireVaultUnlock } from 'vault-context-react';

// In your API client, a Zustand store, a vanilla module — anywhere.
const ok = await requireVaultUnlock({ title: 'Please log in' });
if (ok) {
  // user submitted a token; vault is now unlocked
}
```

### 4. Wrap your fetches

```ts
import { withVaultRetry } from 'vault-context-react';

const res = await withVaultRetry('/api/secret-data');
const json = await res.json();
// If /api/secret-data returned 401:
//   1. Login modal opens automatically
//   2. User pastes token + submits
//   3. Request is retried with the new token
//   4. You get the 200 response back
```

That's it. No per-page modals, no manual 401 handling.

---

## The 401-retry flow

```
caller                  withVaultRetry              bridge        Provider
  |                          |                        |              |
  | fetch req -------------->|                        |              |
  |                          | --- fetch(req) ------> server         |
  |                          | <--- 401 ---------------               |
  |                          | -- requireVaultUnlock-> |              |
  |                          |                        | requireUnlock-> setPending
  |                          |                        |               | (modal renders)
  |                          |                        |               | user submits
  |                          |                        |               | unlock(token)
  |                          |                        |  <- true ----|
  |                          | <--- true -------------|              |
  |                          | --- fetch(req w/ new token) -> server  |
  |                          | <--- 200 -------------|              |
  | <--- 200 ----------------|                        |              |
```

Invariants:

1. **Exactly one retry.** A second 401 propagates — no runaway loops.
2. **Modal cancel returns the original 401.** The caller decides.
3. **Concurrent 401s share one modal.** Both calls resolve together.

---

## API reference

### `<VaultProvider>`

| Prop          | Type                                  | Default              | Description                                 |
| ------------- | ------------------------------------- | -------------------- | ------------------------------------------- |
| `storageKey`  | `string`                              | `"sid_vault_token"`  | localStorage key.                           |
| `validate`    | `(token: string) => boolean`          | non-empty check      | Custom validator (e.g. expiry, prefix).     |
| `renderModal` | `(props) => ReactNode`                | default `VaultModal` | Swap in your own modal UI.                  |
| `onChange`    | `(state) => void`                     | `undefined`          | Fires when `unlocked` flips.                |

### `useVault(): VaultState`

```ts
interface VaultState {
  unlocked: boolean;
  token: string | null;
  modalOpen: boolean;
  ready: boolean;
  payload: Record<string, unknown> | null;  // decoded JWT
  requireUnlock: (opts?: LoginOptions) => Promise<boolean>;
  unlock: (token: string) => void;
  lock: () => void;
  closeModal: () => void;
}
```

### `withVaultRetry(input, init?, options?)`

Drop-in for `fetch` that auto-retries 401s.

```ts
interface WithVaultRetryOptions {
  attachAuth?: boolean;              // default true
  authHeader?: string;               // default "Authorization"
  authScheme?: string;               // default "Bearer"
  unauthorizedStatuses?: number[];   // default [401]
  loginOptions?: LoginOptions;
  fetchImpl?: typeof fetch;
}
```

Aliased as `fetchWithVault` if you prefer that name.

### Bridge functions (work outside React)

```ts
import {
  requireVaultUnlock,  // open the modal; returns Promise<boolean>
  getVaultToken,       // current token, or null
  lockVault,           // clear the token
  isVaultReady,        // has the Provider hydrated yet?
} from 'vault-context-react';
```

### JWT helpers

```ts
import { decodeJwt, getJwtExpiryMs, isJwtExpired } from 'vault-context-react';

decodeJwt(token);             // payload (no signature check) or null
getJwtExpiryMs(token);        // ms since epoch, or null
isJwtExpired(token, skewMs);  // boolean; uses skew for proactive refresh
```

### Manual header helper

```ts
import { vaultHeaders } from 'vault-context-react';

fetch('/api/x', {
  headers: vaultHeaders({ 'Content-Type': 'application/json' })
});
// → { 'Content-Type': 'application/json', Authorization: 'Bearer <token>' }
```

### Events

```ts
import { CHANGE_EVENT, subscribeVaultChange } from 'vault-context-react';

const unsub = subscribeVaultChange(undefined, (detail) => {
  console.log('vault changed', detail.token, detail.source);
});
```

---

## Custom modal

The default modal is intentionally bare. Pass `renderModal` to swap it for
an Ant Design Modal, a shadcn Dialog, framer-motion sheets — whatever.

```tsx
<VaultProvider
  renderModal={(props) => (
    <MyDialog
      open={props.open}
      title={props.title}
      description={props.description}
      onSubmit={props.onSubmit}
      onCancel={props.onCancel}
      submitLabel={props.submitLabel}
      blocking={props.blocking}
    />
  )}
>
  <App />
</VaultProvider>
```

See `examples/custom-modal/` for a complete demo.

---

## Cross-tab sync

Open the same site in two tabs. Log in on tab A. Tab B immediately
unlocks. Log out on tab A. Tab B locks.

This is built on the browser's native `storage` event (fires in *other*
tabs on any `localStorage` change) plus a custom `sid-vault-change` event
for same-tab listeners. You don't have to configure anything.

---

## TypeScript

Everything is typed. The library ships its own `.d.ts` bundle. No
`@types/...` package needed.

```ts
import type {
  VaultState,
  LoginOptions,
  VaultProviderProps,
  VaultModalRenderProps,
} from 'vault-context-react';
```

---

## Examples

Live runnable examples in `examples/`:

- `examples/basic` — minimum-viable setup.
- `examples/custom-modal` — replacing the default UI.
- `examples/with-tanstack-query` — query layer integration.
- `examples/with-fetch-wrapper` — plain `fetch` API client.

---

## Docs

- [Architecture](./docs/ARCHITECTURE.md) — how the pieces fit together.
- [Security](./docs/SECURITY.md) — token storage trade-offs, XSS notes,
  what this library does *not* protect you from.
- [Migration](./docs/MIGRATION.md) — moving from per-page `<VaultGate>`
  to a centralized Provider.

---

## License

MIT © Siddharth Fulia
