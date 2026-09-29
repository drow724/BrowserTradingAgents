# Contract: evidence equivalence and migration matrix

Evidence records keep the Feature 005 contract (`specs/005-…/contracts/evidence.md`) unchanged. This
Feature adds no field. It compares records produced by the Vite shell (baseline) with records
produced by the Next.js shell.

## Baseline (Checkpoint A, Vite, committed as Feature 006 evidence)

- `evidence/baseline-vite-standin-fixture-<date>-<sha>.json`: stand-in + fixture record from
  app test (a)
- `evidence/baseline-vite-harness-standin-<date>-<sha>.json`: harness stand-in record
- the Feature 005 T044 native record (`specs/005-…/evidence/real-browser-fixture-2026-09-28-0543a69.json`)
  is the native baseline and is read, never copied or changed

## Comparison rule (Checkpoint C; Next production server, same tests)

- **Structural**: the key sets of the two records are identical at every depth, with arrays compared
  by element shape.
- **Identical values**:
  - identities: `feature`, `provider`, `runner`, `evidenceClass`, `fixture`, `input`, `dataSource`,
    `graph`, `runtimeOptions`, `prompts`
  - outcome: `outcome`, `error`, `failure`
  - lifecycle: `nodes` (status/executions/modelRequests/reads), `nodeEvents` (node/event order),
    `counts`
  - concurrency: `concurrency.graph`, `concurrency.akarisp.fanOutSnapshot.snapshot`,
    `concurrency.nativeProvider`
  - settlement: `lifecycle`
  - result: `result`, which is deterministic under the stand-in
- **Allowed to differ**: `revision.browserTradingAgents`, `environment.date`, `timing.*`,
  `concurrency.akarisp.fanOutSnapshot.pollMs`, `modelRequests[].timing`.
- **Format**:
  - `revision.browserTradingAgents` matches `^[0-9a-f]{40}(\+dirty)?$`
  - the three version fields equal the installed versions
- **Harness**: scenario outcomes are equal (S1–S5, S7 `PASS`; S6 `OBSERVED`) and the snapshots
  asserted by `harness.spec.ts` are equal.
- The comparison is done by a script in the implementation, in two explicit modes:
  - **app mode**: the structural + value rules above, applied to the application record, with only
    the listed allowed differences.
  - **harness mode**: only the harness rule: scenario `outcome`s, plus the snapshot fields that
    `e2e/harness.spec.ts` asserts:
    - `S3_concurrent2.snapshotWhileRunning` (`active`, `queued`)
    - `S4_cancel.snapshotAfter`, `S4_cancel.taskErrorCode`, `S4_cancel.active.callerError` prefix,
      `S4_cancel.active.snapshotAfter`, `S4_cancel.active.requestAfter`
    - `S5_structured.fallbacks` bound
    - `S6_systemRole.observation` suffix
    - `S7_cleanup.snapshotAfterShutdown`
    - `evidenceClass`, `provider`, `environment.availability` (asserted not `MODEL_AVAILABLE` for the
      stand-in; added after the final analyze, L3)

    Per-scenario timings are not compared.
  - The result of each mode is recorded in `verification.md`.

## Migration matrix (every prior guarantee has a Next proof before retirement)

| # | Guarantee | Vite proof | Next proof (test / evidence) | Gate |
|---|---|---|---|---|
| 1 | eight-role success, order, 8/0 | app (a) | app (a) + equivalence | C |
| 2 | fan-out reaches the AkariSP queue `{ready,1,1}` | app (a) | app (a) | C |
| 3 | native unavailable → BLOCKED before work | app (c) | app (c) | D |
| 4 | runtime-create failure → failed, Run usable | app (d) | app (d) | D |
| 5 | analyst cancel; caller vs settlement; `{ready,0,0}` before shutdown | app (b); Feature 004 T051 | app (b); M3 | D, E |
| 6 | consecutive runs own new runtime/model | app (e) | app (e) | D |
| 7 | Feature 005 live success, provenance, digests, redaction, replay | T026 | T026 | D |
| 8 | acquisition failure kinds, no runtime, no fallback | T027 | T027 | D |
| 9 | acquisition timeout / cancel | T028, T029 | T028, T029 | D |
| 10 | live graph-stage cancel, settlement | T030 | T030 | D |
| 11 | native + live BLOCKED before request; four mode URLs | T031, T032 | T031, T032 | D |
| 12 | credential appears only in the outgoing header | T033 | T033 | D |
| 13 | harness S1–S7 (stand-in); native-unavailable BLOCKED | harness.spec | harness.spec (`/harness`) | D |
| 14 | deterministic + Node suites | `npm test` 62 | `npm test` 62 (unchanged) | A–H |
| 15 | revision clean vs `+dirty` | Feature 004/005 records | revision assertion; E demo; native records | E, F |
| 16 | installed-Chrome native + fixture 8/8 at a clean revision | Feature 005 T044 | gate F (pre-retirement), gate H (final) | F, H |
| 17 | no browser-API evaluation on the server | n/a | `next build` prerender + M1 | E |
| 18 | one runtime per click under Strict Mode (dev) | n/a | `@dev` smoke | D |

A guarantee without a passing Next proof blocks Checkpoint G.
