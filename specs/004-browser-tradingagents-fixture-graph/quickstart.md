# Quickstart: validate Feature 004

Prerequisites: Node ≥ 22.18, npm; for the native gate, Google Chrome with the Prompt API model
(see `docs/testing.md`, `npm run prepare:prompt-api` once).

```bash
npm ci
npm run typecheck
npm run build              # dist/index.html — the canonical app with the role graph
npm test                   # DETERMINISTIC_TEST (test/trading-graph.test.ts) + NODE_INTEGRATION (stand-in)
npm run test:browser       # BROWSER_AUTOMATED: canonical page with the stand-in + Feature 002 harness
npm run test:prompt-api    # REAL_BROWSER_PROMPT_API: canonical page on the native model (+ F002 harness)
```

Expected: all pass. Guarantees G1–G16 / L1–L6: [contracts/graph.md](contracts/graph.md).

## Manual run

```bash
npm run dev                # http://localhost:5173/
```

- `/` — native Prompt API (default); unavailable model → `BLOCKED`, no download started.
- `/?provider=standin` — stand-in, `BROWSER_AUTOMATED`, never Prompt API evidence.
- Run Graph (enabled once availability is known) shows the eight role statuses, the final decision,
  runtime state and the evidence record ([contracts/evidence.md](contracts/evidence.md)).

## Native gate (SC-016)

Accept only a record with `REAL_BROWSER_PROMPT_API`, `provider: native`, `MODEL_AVAILABLE`,
`outcome: success`, eight nodes `done`, `settledBeforeShutdown: true`, a clean revision; logical /
fallback requests as measured (expected 8 / 0). Save as
`specs/004-browser-tradingagents-fixture-graph/evidence/real-browser-<date>-<sha>.json`. Model
unavailable → `BLOCKED`; stand-in records never substitute. Output wording is not evaluated.

| Class | Provider | Proves | Never claims |
|---|---|---|---|
| DETERMINISTIC_TEST | fake Runtime + real AkariChatModel | topology, provenance, ordering, counts, cancel, failure | runtime/browser behavior |
| NODE_INTEGRATION | real akarisp + stand-in | backpressure, settlement, shutdown | browser behavior |
| BROWSER_AUTOMATED | stand-in in Chromium | canonical page wiring, cancel, repeated run | Prompt API behavior |
| REAL_BROWSER_PROMPT_API | native | full role graph on the real model | native parallelism, answer quality |
