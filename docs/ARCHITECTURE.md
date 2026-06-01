# Architecture

This doc explains how the moving parts fit together and why we made the
choices we did. If you only want to *use* the library, the top-level README
is enough — read this if you're contributing or debugging.

## Modules

| File                 | Responsibility                                            |
| -------------------- | --------------------------------------------------------- |
| `VaultContext.tsx`   | Provider + Context. State machine + modal rendering.      |
| `useVault.ts`        | Public hook with friendly error when used outside.        |
| `VaultModal.tsx`     | Default modal UI. Pure presentation, no logic.            |
| `bridge.ts`          | Module-level singleton for non-React callers.             |
| `storage.ts`         | localStorage wrappers that never throw.                   |
| `events.ts`          | Cross-tab `storage` + same-tab `sid-vault-change` plumbing. |
| `withVaultRetry.ts`  | Fetch wrapper that intercepts 401s.                       |
| `headers.ts`         | `vaultHeaders()` helper for manual fetch.                 |
| `utils/jwt.ts`       | Decode-without-verify JWT helpers.                        |
| `utils/timeout.ts`   | `AbortSignal.timeout` polyfill.                           |

## State machine

The Provider owns exactly four pieces of state:

```
{
  token:       string | null,   // current token, mirrored to localStorage
  ready:       boolean,         // hydration complete?
  pending:     PendingRequest | null,  // open modal request, if any
  // derived: unlocked = token !== null && validate(token)
  // derived: payload = decodeJwt(token)
}
```

Transitions:

```
locked --(unlock())-->        unlocked
unlocked --(lock())-->         locked
locked --(requireUnlock)-->   locked + modal open
modal open --(submit ok)-->   unlocked + modal closed
modal open --(cancel)-->      locked + modal closed
any --(storage event)-->      synced with new token
```

## The 401-retry flow

```
caller                  withVaultRetry              bridge        Provider
  |                          |                        |              |
  | fetch req -------------->|                        |              |
  |                          | --- fetch(req) ------> server         |
  |                          | <--- 401 -------------                |
  |                          | -- requireVaultUnlock-> |             |
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

Key invariants:

1. **At most one retry per call.** A second 401 propagates to the caller.
2. **Only one modal at a time.** If two requests fail concurrently, the
   first opens the modal and the second waits — both resolve when the
   modal closes.
3. **Cancellation returns the original 401.** Callers can decide whether
   to show a "please unlock to view" UI or re-throw.

## Bridge pattern

`requireVaultUnlock`, `getVaultToken`, `lockVault` are exposed as
*module-level functions* — not hooks — because they're called from API
clients and non-React code. They delegate to whichever `<VaultProvider>`
is currently mounted via a singleton.

If a non-React caller fires before the Provider mounts (rare; usually
happens during SSR-to-CSR transition), the call is queued and replayed
once a Provider registers.

## Cross-tab + same-tab sync

The browser only fires `storage` events in *other* tabs. To make
same-tab listeners work (`useVault` updating after a modal submit), we
dispatch a custom `sid-vault-change` event in the same tab.

The Provider subscribes to both and unifies them in one handler.

```
            +---------------+
            |   Tab A       |
            |               |
            | unlock("X") --|--> localStorage.setItem
            |               |    └─> tab B receives 'storage'
            |               |    └─> tab A dispatches 'sid-vault-change'
            +---------------+
```

This is identical to how `redux-persist` and some auth libraries do it —
proven pattern, no race conditions in practice.

## Why localStorage and not sessionStorage / cookies

Trade-offs (see SECURITY.md for the full discussion):

- **localStorage**: persists across tab close, vulnerable to XSS.
- **sessionStorage**: clears on tab close, vulnerable to XSS.
- **HttpOnly cookies**: immune to JS reads, but you can't introspect the
  token from React — defeats the whole point of this library.

For a token-gated demo site (which is our primary use case), localStorage
is the right pick: low setup, persists across sessions, the XSS surface
is already minimal because the token only grants access to a small set
of demo endpoints.

If you need stricter security, swap `storage.ts` for a cookie-based
implementation. The rest of the package is storage-agnostic.
