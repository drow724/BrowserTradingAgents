# Quickstart: Feature 012 validation

## Scenarios

1. **Reuse** — `npm run dev`, open `/?provider=standin&reuse=on`, load the example portfolio, run
   "전체 점검": the first record has `prepared: true`, the other five `prepared: false`, same `runtimeId`.
2. **Per-run** — same with `reuse=off`: six `prepared: true`, each with `snapshotAfterShutdown` closed.
3. **Cancel** — with `reuse=on`, Cancel mid-run, then run again: same `runtimeId`, `prepared: false`.
4. **Replacement** — in DevTools, `dispatchEvent(new PageTransitionEvent('pagehide'))`, then run: new
   `runtimeId`, `replaced.reason: "closed"`.
5. **Native** (Chrome with the Prompt API) — scenarios 1–2 without `provider=standin`; compare
   `runtimeCreateMs` and totals.

## Automated

```bash
npm run typecheck && npm run build && npm test
npm run test:browser                                        # includes e2e/reuse.spec.ts
BTA_REUSE_COMPARE=1 npm run test:prompt-api -- -g reuse     # opt-in native comparison
```
