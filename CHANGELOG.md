# Changelog

All notable changes to this project are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-01

### Added

- `VaultProvider`, `useVault`, and `VaultContext`.
- Default `VaultModal` (passwordless input + submit + cancel).
- Module-level bridge: `requireVaultUnlock`, `getVaultToken`,
  `lockVault`, `isVaultReady` — usable from non-React code.
- `withVaultRetry` / `fetchWithVault` — fetch wrapper that intercepts
  configurable unauthorized statuses (default 401), opens the global
  modal, and retries exactly once.
- `vaultHeaders()` helper for manual fetches.
- Cross-tab sync via `storage` events + same-tab sync via
  `sid-vault-change` custom event.
- `decodeJwt`, `getJwtExpiryMs`, `isJwtExpired` — signature-free JWT
  helpers.
- `AbortSignal.timeout` polyfill helper for older Safari targets.
- Type definitions for every public export.
- Test suite covering storage, JWT, bridge, Provider, and retry flow.
- Examples: basic, custom modal, Tanstack Query, plain fetch.
- Docs: architecture, security, migration.

### Notes

- Initial public release.
- Replaces per-component `<VaultGate>` patterns with a single root
  Provider + on-demand modal.
