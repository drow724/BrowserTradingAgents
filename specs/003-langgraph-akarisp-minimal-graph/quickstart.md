# Quickstart: validate Feature 003

Prerequisites: Node ≥ 22.18 (type stripping for `node --test`), npm; for the real-provider step,
Google Chrome with the Prompt API and its on-device model already downloaded (see
`docs/testing.md`).

```bash
npm ci
npm run typecheck          # tsc --noEmit
npm run build              # vite build → dist/index.html (canonical app only)
npm test                   # DETERMINISTIC_TEST + NODE_INTEGRATION (stand-in)
npm run test:browser       # BROWSER_AUTOMATED: canonical page with the stand-in (+ Feature 002 harness regression)
```

Expected: all pass. `npm test` includes `test/minimal-graph.test.ts` (G1–G10 in
[contracts/graph.md](contracts/graph.md)) and `test/graph-integration.test.ts` (L1–L5).

## Run the canonical app

```bash
npm run dev                # http://localhost:5173/
```

- `/` — native Prompt API (default). If the model is not available the page shows it and records
  `BLOCKED`; it never starts a download.
- `/?provider=standin` — stand-in `LanguageModel`, records `BROWSER_AUTOMATED`. Never Prompt API
  evidence.
- Press **Run Graph** (it is disabled until availability is classified); **Cancel** aborts the run. The page shows the four node statuses, the
  result, AkariSP state/active/queued, and the evidence JSON
  ([contracts/evidence.md](contracts/evidence.md)).
- Feature 002's historical harness is still served at `/harness/` (unchanged).

## Real Chrome Prompt API (feature gate, SC-011)

Either runner, same page:

```bash
npm run prepare:prompt-api # once; reuses your Chrome's model (docs/testing.md)
npm run test:prompt-api    # runner: playwright — installed Chrome, headless
```

or open `http://localhost:5173/` from `npm run dev` in your own Chrome and press Run Graph
(`runner: manual`).

Accept as feature evidence only a record with `evidenceClass: "REAL_BROWSER_PROMPT_API"`,
`provider: "native"`, `environment.availability: "MODEL_AVAILABLE"`, `outcome: "success"`, all four
nodes `done`, `counts.logicalRequests` as measured (expected 4), `lifecycle.settledBeforeShutdown:
true`. Copy it to `specs/003-langgraph-akarisp-minimal-graph/evidence/real-browser-<date>.json`.
If the model is unavailable the record is `BLOCKED` and the Feature is reported BLOCKED /
INCOMPLETE — stand-in records never substitute.

## Evidence classes at a glance

| Layer | Provider | Proves | Never claims |
|---|---|---|---|
| `DETERMINISTIC_TEST` | fake `Runtime` behind the real `AkariChatModel` | topology, fan-out/fan-in, ordering, counts, signal forwarding, failure | runtime or browser behavior |
| `NODE_INTEGRATION` | real `akarisp` + stand-in | active/queued, cancel/failure settlement, shutdown | browser behavior |
| `BROWSER_AUTOMATED` | real `akarisp` + stand-in in Chromium | canonical page works in a browser bundle; success + cancel | Prompt API behavior |
| `REAL_BROWSER_PROMPT_API` | native Prompt API | full graph on the real model | native parallel inference |
