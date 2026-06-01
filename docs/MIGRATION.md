# Migrating from per-component VaultGate to centralized

If your app currently has a `<VaultGate>` component wrapping each protected
page — and each instance has its own modal, its own state, its own
localStorage read — this guide walks you through consolidating to a single
top-level `<VaultProvider>`.

## Before

```tsx
// pages/Lab.tsx
function Lab() {
  return (
    <VaultGate name="lab">
      <LabContent />
    </VaultGate>
  );
}

// pages/Vision.tsx
function Vision() {
  return (
    <VaultGate name="vision">
      <VisionContent />
    </VaultGate>
  );
}
```

Problems with this shape:

1. Each `VaultGate` has its own modal mounted — opening / closing depends
   on which one is currently visible.
2. State has to be lifted through props or duplicated in localStorage
   under different keys.
3. There's no good place for the 401-retry fetch wrapper to call back
   into a modal — *which* modal would it call?
4. Cross-tab sync needs to be re-wired in every gate.

## After

```tsx
// App.tsx — mounted once
function App() {
  return (
    <VaultProvider>
      <Router>
        <Route path="/lab" element={<Lab />} />
        <Route path="/vision" element={<Vision />} />
      </Router>
    </VaultProvider>
  );
}

// pages/Lab.tsx — no wrapper
function Lab() {
  const v = useVault();

  useEffect(() => {
    if (!v.ready) return;
    if (!v.unlocked) v.requireUnlock({ title: 'Unlock the lab' });
  }, [v.ready, v.unlocked]);

  if (!v.unlocked) return <LockedPlaceholder />;
  return <LabContent />;
}
```

## Step-by-step

1. **Install.** `npm i vault-context-react`.
2. **Mount the Provider once** at the app root, above the router.
3. **Delete `<VaultGate>`** from every page. Replace with a small
   `useEffect` that calls `requireUnlock()` when needed.
4. **Migrate fetch calls.** Replace `fetch(...)` with `withVaultRetry(...)`
   in your API layer. The 401-retry will now Just Work.
5. **Pick a storage key.** If your old VaultGate used multiple keys
   (one per section), consolidate to one. Tokens grant access to the
   whole app now — that's the point.
6. **Test cross-tab.** Open two tabs, unlock in one, watch the other
   unlock. Log out in one, watch the other lock.

## Granular gating after consolidation

You might still want different parts of your app to require different
tokens (e.g. "admin" vs "user"). The pattern:

```tsx
function AdminGate({ children }) {
  const v = useVault();
  const isAdmin = v.payload?.role === 'admin';

  useEffect(() => {
    if (v.ready && !isAdmin) {
      v.requireUnlock({
        title: 'Admin token required',
        description: 'This area is restricted.',
      });
    }
  }, [v.ready, isAdmin]);

  if (!isAdmin) return <p>Admin only.</p>;
  return children;
}
```

The Provider still holds *one* token; the gate component just inspects
the JWT payload.

## Common gotchas

- **`requireUnlock` in `useEffect` without a guard fires every render.**
  Always wrap in an `if (!v.unlocked)` check.
- **Don't read `v.token` in render to decide whether to fetch** — use
  `withVaultRetry`. The wrapper handles the timing.
- **StrictMode double-mounts** trigger the bridge register/unregister
  cycle. This is harmless but means you'll see two `onChange` calls
  during development.
