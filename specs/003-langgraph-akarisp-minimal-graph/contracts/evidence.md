# Contract: Feature 003 evidence record (canonical app JSON output)

One JSON object per graph run, printed in `#evidence` by the canonical page (`index.html`). Test
owners in Node assert the same facts but do not emit this record. Committed deliberately under
`specs/003-langgraph-akarisp-minimal-graph/evidence/` as `<layer>-<YYYY-MM-DD>[-<suffix>].json`;
routine test runs write only to `test-results/`.

```json
{
  "feature": "003-langgraph-akarisp-minimal-graph",
  "evidenceClass": "REAL_BROWSER_PROMPT_API | BROWSER_AUTOMATED | BLOCKED",
  "provider": "native | standin",
  "runner": "manual | playwright",
  "environment": { "userAgent": "…", "date": "YYYY-MM-DD",
                   "availability": "API_ABSENT | API_PRESENT_UNAVAILABLE | MODEL_DOWNLOADABLE | MODEL_DOWNLOADING | MODEL_AVAILABLE | UNKNOWN_AVAILABILITY" },
  "revision": { "browserTradingAgents": "<git sha>[+dirty]", "akarisp": "0.1.0-alpha.2",
                "langchainCore": "1.2.13", "langgraph": "1.4.18" },
  "fixture": "minimal-graph-fixture@1",
  "prompts": "src/graph/minimal-graph.ts",
  "graph": { "topology": "START→{branchA,branchB}; [branchA,branchB]→synthesize; synthesize→decide; decide→END",
             "entry": "@langchain/langgraph/web" },
  "runtimeOptions": { "limit": 1, "queueCapacity": 32 },
  "outcome": "success | cancelled | failed | not-run",
  "error": "null | <description, e.g. 'TaskError:failed (…)' or the abort reason>",
  "nodes": {
    "branchA":    { "status": "waiting | running | done | error", "executions": 1, "modelRequests": 1 },
    "branchB":    { "…": "…" },
    "synthesize": { "…": "…" },
    "decide":     { "…": "…" }
  },
  "nodeEvents": [ { "seq": 1, "node": "branchA", "event": "start" } ],
  "modelRequests": [ { "logicalRequestId": 1, "event": "done", "errorKind": null, "timing": {} } ],
  "counts": { "graphRuns": 1, "nodeExecutions": 4, "logicalRequests": 4, "fallbackRequests": 0,
              "providerInvocations": "NOT EXPOSED" },
  "concurrency": {
    "graph": "branch requests submitted before either completed: 2",
    "akarisp": { "fanOutSnapshot": { "snapshot": { "state": "ready", "active": 1, "queued": 1, "limit": 1, "queueCapacity": 32 }, "pollMs": 0 } },
    "nativeProvider": "not observed (out of scope)"
  },
  "lifecycle": {
    "settledBeforeShutdown": true,
    "snapshotBeforeShutdown": { "state": "ready", "active": 0, "queued": 0 },
    "snapshotAfterShutdown": { "state": "closed", "active": 0, "queued": 0 }
  },
  "result": { "decision": "…", "synthesis": "…" },
  "blocked": { "reason": "…", "stillVerified": [], "unverified": [] }
}
```

## Rules

- `provider: "standin"` ⇒ `evidenceClass: "BROWSER_AUTOMATED"`, never `REAL_BROWSER_PROMPT_API`.
- `provider: "native"` ⇒ the graph runs only if `environment.availability` is `MODEL_AVAILABLE`;
  then `evidenceClass: "REAL_BROWSER_PROMPT_API"`. Otherwise `evidenceClass: "BLOCKED"`,
  `outcome: "not-run"`, `blocked` filled, nodes all `waiting`. The page never starts a model
  download (it only calls `availability()`).
- SC-011 is met only by a record with `evidenceClass: "REAL_BROWSER_PROMPT_API"` **and**
  `outcome: "success"`. A native cancelled/failed record is kept as an observation.
- `environment.availability` always describes the browser's native Prompt API, classified before
  the stand-in is installed.
- `counts.logicalRequests` is the bridge's `model.logicalRequests` for this run's fresh model;
  `nodes.*.modelRequests` are counted by the node wrapper; both are measured values and are never
  edited to match an expectation (SC-021). `fallbackRequests`: the graph has no fallback path;
  the observed value (expected 0) is recorded. `providerInvocations` is `"NOT EXPOSED"` for both providers — stand-in
  counters are not reported here.
- `concurrency.akarisp.fanOutSnapshot` is `runtime.snapshot()` taken after bridge `start` events
  == 2 **and** `active + queued === 2`, polled for at most 1 s (polling also stops when the graph run
  ends). Bridge event #2 alone is not the
  trigger: `AkariChatModel` emits `start` before it calls `runtime.run()`, so at that instant the
  second request is not yet in AkariSP. If the condition is not reached, the last snapshot is
  recorded as measured (never adjusted). It shows AkariSP backpressure only; it is
  never described as native parallel inference.
- `lifecycle.settledBeforeShutdown` is `true` only if `active 0, queued 0` was observed **before**
  `runtime.shutdown()` (bounded wait, 10 s). `snapshotAfterShutdown` alone is not settlement
  evidence, because `shutdown()` cancels remaining work itself.
- `result` is present only for `outcome: "success"`; for `cancelled`/`failed` no synthesis or
  decision is presented as a result.
- `revision.browserTradingAgents` carries `+dirty` when bundled code differs from `HEAD`.
