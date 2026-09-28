# Quickstart: validating Feature 002

## Prerequisites

- Node ≥ 22.18 (tests load TypeScript directly; validated on 23.9.0).
- For browser automated runs: `npx playwright install chromium` once (browser binary, not a model).
- For real Prompt API evidence: Google Chrome with the Prompt API and an **available** on-device
  model (validated target: Chrome 153 on macOS). The harness never starts a download.

## Commands

```bash
npm ci
```

```bash
npm run typecheck
```

```bash
npm run build
```

```bash
npm test
```

```bash
npm run test:browser
```

```bash
npm run harness
```

## Expected outcomes

| Step | Expect |
|---|---|
| `npm ci` | `akarisp@0.1.0-alpha.2`, `@langchain/core@1.2.13` installed from the lockfile |
| typecheck / build | exit 0 |
| `npm test` | unit + structured + node-integration pass (`DETERMINISTIC_TEST`, `NODE_INTEGRATION` stand-in) |
| `npm run test:browser` | harness scenarios S1–S5 and S7 pass (S6 observed) in Chromium with `?provider=standin` (`BROWSER_AUTOMATED`) |
| `npm run harness` | dev server on `http://localhost:5173/`; open it in Chrome, click **Run**, copy the JSON into `specs/002-langchain-akarisp-integration-validation/evidence/real-browser-<date>.json` |

Real-browser record: `evidenceClass: REAL_BROWSER_PROMPT_API` only when availability is
`MODEL_AVAILABLE` and S1 passed with `provider: native`; otherwise `BLOCKED` with reason
(see [contracts/evidence.md](contracts/evidence.md)).

## Scope checks

- `import` of AkariSP only as `from 'akarisp'`; no `akarisp/` subpaths, no `../akariSP`.
- `package-lock.json` contains no `@langchain/langgraph`.
