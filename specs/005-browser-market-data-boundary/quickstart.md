# Quickstart: Feature 005 validation

## Mode URLs (dev server `npm run dev`, or the Playwright base URL)

| Provider \ data | fixture | live |
|---|---|---|
| stand-in | `/?provider=standin` | `/?provider=standin&data=live` |
| native | `/` | `/?data=live` |

"live" = market data fetched at run time. With the Massive Basic tier it is **end-of-day**, not
real-time. The provider and data axes are independent. Stand-in + live runs in a browser without
the Prompt API, because the native availability check applies only to provider = native.

In live mode, a password field appears. The key is typed by its owner and is never saved.

## Layers

| Layer | Command | Expected |
|---|---|---|
| R0 browser CORS (before implementation, no credential) | Playwright one-off: page at the app origin → `fetch` the endpoint with a dummy bearer | resolves with 401 and a JSON body (not `Failed to fetch`). Proves preflight + error response only; otherwise record F005-001 and stop |
| L1 | `npm test` | `test/market-data.test.ts` + Feature 004 suites pass |
| L2 | `npm test`, `npm run test:browser` (fixture cases) | Feature 004 results unchanged |
| L3 | `npm run test:browser` (Playwright Chromium, no Prompt API model) | stand-in + live cases with `page.route` bodies: success (8 roles, 8/0, digest, no values in record); `unauthorized`, `rate-limited`, `network`, `invalid-data`, `unavailable`, `credential-missing`; cancel during acquisition (0 requests, no runtime); dummy key absent from `#evidence` and console |
| native + fixture gate (after the implementation commit, before P-1) | `npm run test:prompt-api -- -g "eight-role"` at the clean revision (installed Chrome, no credential) | `REAL_BROWSER_PROMPT_API`, `dataSource.mode: fixture`, eight nodes `done`, clean revision |
| P-1 (owner) | resolve F005-P1 (Massive written confirmation or licence) | recorded before any authenticated request; otherwise L4/L5 = `BLOCKED` |
| L4 (owner) | `npm run dev` → `/?provider=standin&data=live`, enter key, Run | `BROWSER_AUTOMATED`, `httpStatus 200`, `providerStatus OK`, 8 roles done; first proof of **authenticated success-response** CORS |
| L5 (owner, clean revision) | installed Chrome → `/?data=live`, enter key, Run; save `#evidence` unedited | SC-016 gate record ([contracts/evidence.md](contracts/evidence.md)) |

If L4 or L5 cannot run (no key, source down, model unavailable), record `BLOCKED` with the reason.
The Feature then stays incomplete.

## Owner key entry for the Playwright L5 runner

The security invariant is that the key never appears in shell history, a process's argv, a file,
storage, evidence or test output. The syntax below is one way to meet it (verified with a dummy value
in zsh 5.9 and bash 3.2 on 2026-09-28): a silent read inside a subshell, exported only to the child
process, and gone when the subshell exits.

```bash
# zsh
( read -rs "BTA_MASSIVE_KEY?Massive key: " && export BTA_MASSIVE_KEY && npm run test:prompt-api -- -g "live market data" )
```

```bash
# bash
( read -rsp "Massive key: " BTA_MASSIVE_KEY && export BTA_MASSIVE_KEY && npm run test:prompt-api -- -g "live market data" )
```

- Never write the key on the command line, in `.env*` files, or as a `VITE_*` variable.
- Do not run with `DEBUG=pw:api`, which would print `fill` values.
- The environment of a running process is readable by the same OS user until the subshell exits.
- Chrome may offer to save the key typed into the password field. Decline it: that store is outside
  the application.

## Checks on every live record

- A successful live record contains: `dataSource.source`, `symbol`, `requestedAt`, `receivedAt`,
  `asOf`, `ageHours`, `snapshotDigest` and `marketFactsDigest`. Failed or BLOCKED records carry
  `dataSource.mode` and only the provenance that was reached.
- Evidence does not contain: the key, prices, or `marketFacts` text.
- `input.news` is `neutral-news@1`, and `nodes.newsAnalyst.status` is `done`.
- The local replay artifact (`#replay`, if saved to `.local/replay/`) passes the L1 replay check. It
  is never committed.
