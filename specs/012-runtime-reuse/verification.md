# Verification: Feature 012 — Runtime Reuse Across Runs

## T001 — Baseline (2026-09-30)

| Item | Value |
|---|---|
| Base | `main` `3086528` (merge of PR #13; PR #12 merged before), worktree `../BrowserTradingAgents-012`, branch `012-runtime-reuse`; node_modules cloned from the main checkout (APFS, no download) |
| sha256 `src/main.ts` | `7a11e846b0b0abec01f168dd16b8c257a81b9f2e98d6fa966f94ee61c77279ac` |
| sha256 `runGraph` section | `643f604a9695d1f8977a17ec2c688f993de803af5b7106c8ad325bc0a4f0e01a` |
| AkariSP | `0.1.0-alpha.2`; public API used: `createRuntime`, `run` (via AkariChatModel), `snapshot`, `shutdown`, `TaskError` |
| `npm run typecheck` / `npm test` | 0 / 166 tests: 165 pass, 1 skipped |
| `npm run test:browser` | 76 passed, 1 skipped (same code as the Feature 011 final run) |

## Implementation (T003–T014)

- `src/main.ts` only (+ `e2e/measure.ts` `loadExample(page, url)`): `?reuse=on|off` (default off, R1); a page-level
  kept runtime and `acquireRuntime()` (reuse only on `{ready,0,0}`, else shut down + `replaced`); after a run, a
  kept runtime stays only if it settled, else it is shut down and recorded as `discarded`; `pagehide` requests
  shutdown (not recorded). Graph, prompts, AkariChatModel, AkariSP: unchanged.
- Deviation from T006's wording: the after-run discard is recorded as `discarded` (not `replaced.reason:
  'unsettled'`), so a run that both found a replaced runtime and discarded its own keeps both facts; the contract
  and data model were updated accordingly.
- T002 (pin existing per-run assertions to `reuse=off`) is **conditional on T018**: with the default off, every
  existing check already runs per-run; pinning is needed only if the default changes.

## Regression

| Check | Result |
|---|---|
| `npm run typecheck` | 0 |
| `npm test` | 166 tests: 165 pass, 1 skipped |
| `npm run test:browser` | **80 passed, 1 skipped** (+4: `e2e/reuse.spec.ts`); SC-008 office overhead +0.95 pp |
| `npm run test:prompt-api` (native gate, default `reuse=off`) | 2 passed, 3 skipped (opt-in); eight-role fixture graph in installed Chrome: PASS |
| sha256 `src/main.ts` (new, by design) | `87a361f9b360018476063f62873ae64672fe44b32422eb0b1ae794822f432639` |
| sha256 `runGraph` section (new, by design) | `eec660c27b84e85c19c68b059c15ee71f478333b69f2908a6e0c71d626045118` |
| AkariSP / graph topology / prompts | 0 changes |

| SC | Evidence | Class | Result |
|---|---|---|---|
| SC-001 prepare once in a session | `e2e/reuse.spec.ts` T004: overview of 6 → prepared `[true, false×5]`, one `runtimeId`; off → 6 × prepared, 6 ids | BROWSER_AUTOMATED | PASS |
| SC-002 identical results | T008: per-run `result`, grounding counts, 8 logical requests identical on/off | BROWSER_AUTOMATED | PASS |
| SC-003 idle after every run | T009: `settledAfterRun` true, `{ready,0,0}`, no `replaced`/`discarded` | BROWSER_AUTOMATED | PASS |
| SC-004 recovery | T011: cancel → same runtime reused; `pagehide` → new runtime, `replaced.reason: closed`; T012: model failure → same runtime reused; live acquisition failure → no runtime, `lifecycle: null` (a *cancelled* acquisition is not re-tested with reuse: it returns before `acquireRuntime()` on the same code path, covered per-run by `e2e/app.spec.ts`) | BROWSER_AUTOMATED | PASS |
| SC-005 native saving | T014/T015 native comparison (below) | REAL_BROWSER_PROMPT_API | reported: overview −8 % to −11 %; per-run preparation saving ≈ 0 after the first load |
| SC-006 existing checks | table above | all | PASS |

- Stand-in comparison report: `evidence/measurement-reuse-standin-2026-09-30.json` (timings operational only; the
  stand-in's runtime creation takes ~1 ms, so the saving is a native-model question).
- **F012-1 (LOW, AkariSP observation)**: no public runtime identity or creation time; the page numbers runtimes
  itself. No core change (Constitution V).

## T015 — Native comparison (REAL_BROWSER_PROMPT_API, 2026-09-29/30)

- `BTA_REUSE_COMPARE=1 npm run test:prompt-api -- -g reuse` on `3086528` + this Feature's changes; installed Chrome
  154, Gemini Nano; example-portfolio overview (6 holdings), 2 repetitions per mode, order on→off then off→on,
  a fresh page per overview; 22.6 min; exit 0. Report: `evidence/measurement-reuse-native-2026-09-29-3086528.json`.

| | reuse on | reuse off (per run) |
|---|---|---|
| runs / success / replacements | 12 / 12 / 0 | 12 / 12 / 0 |
| runtimes prepared | 2 (one per page) | 12 |
| `runtimeCreateMs` | 13,631 (first page, first load) and 57; 0 for the 10 reused runs | 2–118 (every run) |
| `graphMs` mean / median (min–max) | 52.2 s / 52.5 s (48.4–56.3) | 58.5 s / 60.2 s (50.2–64.7) |
| `graphMs` mean per repetition | 51.8 s (1st, ran first), 52.5 s (2nd, ran second) | 60.6 s (1st, ran second), 56.4 s (2nd, ran first) |
| overview total | 324.5 s, 318.2 s | 364.4 s, 339.1 s |

### What this shows

- **The premise of this Feature was mostly wrong.** Feature 010's "runtime create 14.7 s" was the **first model
  load** in a fresh browser, not a per-runtime cost: once Gemini Nano is loaded, creating a runtime (the warm base
  session) takes 2–118 ms. Reuse therefore saves almost nothing in preparation after the first run.
- **Graph time was shorter with reuse** in both orders (−6.3 s per run on average, ≈ −11 %; overview −8 % to
  −11 %). The cause is not known from this data (candidates: task sessions cloned from a base that has served
  earlier clones; system state). n = 2 overviews per mode on one machine — an observation, not an established
  effect.
- No failure, replacement or discard in 24 native runs; isolation was verified with the stand-in (SC-002).
- **F012-2 (LOW, observation)**: first `LanguageModel.create` in a fresh browser ≈ 13.6 s (model load); later
  creates ≈ 0.1 s. Correction to Feature 010's reading of 14.7 s as a per-run cost.

## T018 — Default

- **Pending maintainer decision.** Evidence for `on`: 24/24 native runs clean, stand-in isolation proven, ≈ 8–11 %
  faster overviews (small n, unexplained). Evidence against changing now: the premised saving (≈ 15 s per run) does
  not exist; the observed gain is small and its cause unknown; long-lived session memory use was not measured.
