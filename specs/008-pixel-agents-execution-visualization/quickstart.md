# Quickstart: Feature 008 validation

Prerequisites: Node ≥ 22.18, `npm ci`. The dependency `pixel-agents@1.4.1` is added only after the
Checkpoint C0 approval ([plan.md](plan.md)).
- Before C0, the L1 steps and the text-only view (C-text) run.
- After C0, `predev`/`prebuild` and every Playwright webServer command run
  `node scripts/copy-pixel-agents.mjs` first. That script copies the webview into the git-ignored
  and vercel-ignored `public/pixel-agents/`, and writes nothing when `VERCEL` is set.

## 1. Deterministic (L1): no model, no network

```bash
npm run typecheck
npm test
```

Expected:
- Synthetic traces reproduce their expected view-state sequences, including when replayed twice
  (SC-008).
- The adapter never emits a queued or inferring role (F008-O1).
- `not-run` appears only after `run-ended` (FR-007a), and no role is `working` after it.
- The 12 traces include failed-with-sibling-working, acquisition failure, and duplicate or
  out-of-order events.

## 2. Browser (L3): stand-in, controlled stub

```bash
npm run test:browser
```

Expected (see [contracts/](contracts/)). Pixel Agents is **off by default**, and the tests enable it with the
host-owned "Show Pixel Agents" control:
- **Default page**: the text view only, 0 iframes and 0 `/pixel-agents/*` requests.
- **SC-014b1 (gate)**: the default mode is within ≤ 2 percentage points of `?viz=off`.
- **SC-014b2**: the explicit Pixel mode cost is recorded as `KNOWN_UPSTREAM_COST`, with no threshold.
- **Toggle during a run**: enabling or disabling it changes nothing in the evidence.
- The iframe is actually mounted (`data-iframes` = 1, `webviewReady` received, 8 labeled
  characters), so a text-only fallback cannot pass US1.
- Clicking the webview's own controls ("+ Agent", Settings) causes 0 graph runs, 0 `/api/market`
  requests and 0 model requests.
- A fixture run with the default view, with Pixel Agents enabled, and with `?viz=off` produces equal evidence (apart from
  timings), 8/8 roles, 8 logical requests and the same digests (SC-002, SC-012).
- In the view, every role passes through working once and ends completed, and the run ends
  completed (SC-001).
- Cancel during acquisition (live stub): 0 roles ever working; the run is cancelled with stage
  acquisition (SC-005).
- Cancel during the graph: roles end cancelled or not run, no role changes after the run ends, and
  the lifecycle stays `{ready,0,0}` → settled → `{closed,0,0}` (SC-006).
- Fan-out: at most 1 inferring and at most 1 queued role, which is 0 of each here because there is
  no attribution; the runtime panel shows `active 1 · queued 1` (SC-003).
- 10 runs plus mount/unmount cycles: observer, listener and iframe counts return to baseline
  (SC-014a).
- SC-014b (original, always-on ≤ 10 pp): SUPERSEDED_BY_MAINTAINER_DECISION (it failed, and the failure is
  recorded in verification.md). It is replaced by SC-014b1 (the gate) and SC-014b2 (the disclosure) above.
- Off-origin requests: 0 (SC-016). Reduced motion: no iframe, and every state is readable as text
  (SC-015).

```bash
npm run test:browser:dev
```

Expected (Strict Mode): one click gives 1 graph run and 8 logical requests, with at most 1 observer
and 1 iframe (SC-007).

## 3. Native gate (manual, this Mac)

```bash
npm run test:prompt-api
```

Expected: native + fixture (the default text view, plus one run with Pixel Agents enabled) gives 8/8 roles, 8 logical requests and 0 fallbacks, and
the lifecycle invariants are unchanged (SC-009).

## 4. Protected scope

- The 78 protected hashes are unchanged.
- The `runGraph` section hash is `922db752…`, unchanged.
- AkariSP changes: 0.
- `src/graph/*` and `src/integration/*` are unchanged (SC-010, SC-011).
