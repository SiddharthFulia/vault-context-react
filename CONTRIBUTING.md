# Contributing

Thanks for taking a look. Issues and PRs are welcome.

## Setup

```bash
git clone https://github.com/SiddharthFulia/vault-context-react.git
cd vault-context-react
npm install
npm test
```

You'll need Node 18+.

## Scripts

| Command           | What it does                                |
| ----------------- | ------------------------------------------- |
| `npm test`        | Run the full vitest suite once.             |
| `npm run test:watch` | Vitest in watch mode.                    |
| `npm run lint`    | TypeScript no-emit type check.              |
| `npm run build`   | Build the library to `dist/`.               |
| `npm run dev`     | Vite dev server (rarely needed).            |

## PR checklist

- [ ] Tests pass: `npm test`.
- [ ] Types pass: `npm run lint`.
- [ ] Build works: `npm run build`.
- [ ] Public API changes are reflected in `src/index.ts` AND `README.md`.
- [ ] If you added a feature, add a test for it.
- [ ] If you changed behavior, update CHANGELOG.md under
      `## [Unreleased]`.

## Design principles

1. **Zero runtime deps.** Only `react` as a peerDep. Anything else is a no.
2. **No surprise side effects on import.** Bridge state initializes lazily.
3. **Hooks throw helpfully** when used outside the Provider.
4. **Storage helpers never throw.** Safari private mode is a first-class
   environment.
5. **Tests use real DOM events** (`dispatchEvent`), not mocks of
   `addEventListener`.

## Reporting bugs

Include:

- Browser + version.
- React version.
- A minimal repro (CodeSandbox or a snippet).
- What you expected vs what happened.

## Security issues

Please report security issues privately by email rather than opening a
public issue. See SECURITY.md in the docs folder for the threat model.
