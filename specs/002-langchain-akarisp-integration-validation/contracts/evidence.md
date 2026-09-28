# Contract: evidence record (harness JSON output)

One JSON object per harness run, committed under `evidence/` as
`<layer>-<YYYY-MM-DD>.json` (e.g. `real-browser-2026-09-28.json`).

```json
{
  "evidenceClass": "REAL_BROWSER_PROMPT_API | BROWSER_AUTOMATED | BLOCKED",
  "provider": "native | standin",
  "environment": { "userAgent": "…", "browserLabel": "Chrome 153", "date": "YYYY-MM-DD",
                   "availability": "API_ABSENT | API_PRESENT_UNAVAILABLE | MODEL_DOWNLOADABLE | MODEL_DOWNLOADING | MODEL_AVAILABLE | UNKNOWN_AVAILABILITY" },
  "feature": "002-langchain-akarisp-integration-validation",
  "revision": { "browserTradingAgents": "<git sha>", "akarisp": "0.1.0-alpha.2",
                "langchainCore": "1.2.13" },
  "runtimeOptions": { "limit": 1, "queueCapacity": 32 },
  "scenarios": {
    "S1_single":      { "outcome": "PASS | FAIL | BLOCKED", "output": "…", "timing": {} },
    "S2_reuse":       { "outcome": "…", "runtimeConstructions": 1, "requests": 2 },
    "S3_concurrent2": { "outcome": "…", "snapshotWhileRunning": { "active": 1, "queued": 1 }, "timings": [] },
    "S4_cancel":      { "outcome": "…", "target": "queued", "callerError": "…", "taskErrorCode": "cancelled", "snapshotAfter": { "active": 0, "queued": 0 }, "requestAfter": "PASS" },
    "S5_structured":  { "outcome": "…", "kind": "structured | freetext", "logicalRequests": 1, "fallbacks": 0 },
    "S6_systemRole":  { "outcome": "OBSERVED | BLOCKED", "observation": "supported | rejected | transformed | unavailable", "note": "observation only (research R8); never decides Feature PASS/FAIL" },
    "S7_cleanup":     { "outcome": "…", "snapshotAfterShutdown": { "state": "closed", "active": 0, "queued": 0 }, "secondShutdown": "resolved", "requestAfterShutdown": "TaskError:closed" }
  },
  "counts": { "workflowOperations": 0, "logicalRequests": 0, "fallbackRequests": 0,
              "providerInvocations": "NOT EXPOSED | <number for standin>" },
  "blocked": { "reason": "…", "stillVerified": [], "unverified": [] }
}
```

Rules: `provider: "standin"` can never have `evidenceClass: "REAL_BROWSER_PROMPT_API"`. A
`BLOCKED` record fills `blocked`. Skipped scenarios are `BLOCKED`, never `PASS`.
