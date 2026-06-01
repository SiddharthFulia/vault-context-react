# Security notes

This doc covers the threat model and what `vault-context-react` does *not*
protect you from. Please read before shipping to production.

## What this library is for

A lightweight gate for **demo / preview / staging** apps where you want a
single shared token to unlock a section of the UI. Examples:

- A founder sharing their portfolio's "lab" pages with a recruiter.
- A SaaS team gating a beta dashboard behind a per-user invite token.
- Internal tools that don't yet justify a full auth system.

If you're building a banking app, a multi-tenant SaaS with sensitive data,
or anything involving PII, **use a real auth provider** (Auth0, Clerk,
WorkOS, Supabase Auth, NextAuth) and HTTP-only cookies.

## Token storage trade-offs

| Storage         | Survives reload? | Survives tab close? | Readable by JS? | XSS-exposed? |
| --------------- | ---------------- | ------------------- | --------------- | ------------ |
| localStorage    | yes              | yes                 | yes             | yes          |
| sessionStorage  | yes              | no                  | yes             | yes          |
| In-memory       | no               | no                  | yes             | yes (briefly) |
| HttpOnly cookie | yes              | yes                 | no              | no           |

We chose localStorage because:

1. The token is **already a shared secret** — multiple users use the same
   token. There's no per-user blast radius.
2. The Provider needs to **read** the token in React. HttpOnly cookies
   would block that.
3. Persistence across tabs is a feature, not a bug — users hate
   re-entering tokens.

## XSS is your responsibility

Any XSS vulnerability in your app gives the attacker the token. This
library cannot help — it's a fundamental limitation of `localStorage`.

Hardening checklist:

- [ ] Strict CSP (`script-src 'self'`, no `unsafe-inline`).
- [ ] All user-rendered content goes through React's default escaping
      (no `dangerouslySetInnerHTML` with user data).
- [ ] No `eval`, no `new Function`.
- [ ] Audit npm deps regularly (`npm audit`, Snyk, etc).
- [ ] Subresource Integrity (SRI) on any CDN-loaded scripts.

## Token rotation

This library has no opinion on rotation. Patterns that work:

1. **Server-issued short-lived JWTs.** Use `getJwtExpiryMs` / `isJwtExpired`
   to detect impending expiry and call `requireVaultUnlock()` proactively.
2. **Refresh endpoint.** Hit it on app boot in a `useEffect`; on success,
   call `unlock(newToken)`.
3. **Server-side blacklist.** When you revoke a token, the next request
   gets a 401 and `withVaultRetry` pops the modal.

## What the modal does NOT do

- Validate the token against your server. Submission is "optimistic" — we
  store whatever the user typed and let your API tell us if it's wrong
  (via a subsequent 401).
- Encrypt the token at rest. localStorage is plaintext.
- Rate-limit attempts. Add that yourself if needed.

## Logging

The library logs nothing by default. Tokens never appear in `console.*`
output. Don't add logging that includes the token without scrubbing.
