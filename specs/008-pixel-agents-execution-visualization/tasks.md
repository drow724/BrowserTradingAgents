---

description: "Task list for Feature 008 — Pixel Agents Execution Visualization"
---

# Tasks: Feature 008 — Pixel Agents Execution Visualization

**Input**: `specs/008-pixel-agents-execution-visualization/`: spec.md, plan.md, research.md (R1–R8,
findings F008-001…006, L1, O1, O2; analyze repairs H1–H2, M1–M9, L1–L7), data-model.md, contracts/execution-events.md,
contracts/pixel-host-protocol.md, quickstart.md.

**Baseline**: branch `008-pixel-agents-execution-visualization` @ `07f8f34` (the merge of PR #8).
Untracked: this feature directory and unrelated Spec Kit/Claude tooling (leave untouched; never
stage `.specify/*`, `.claude/`, `CLAUDE.md`).

**Frozen decisions** (plan; not reopened here):

| Item | Decision |
|---|---|
| Upstream | `pixel-agents-hq/pixel-agents` @ `3537e140c2094761beae748592aeb92ece8edfdd` (v1.4.1, MIT) |
| D1 | `pixel-agents@1.4.1` as an **exact devDependency** only. Used only as the source of `dist/webview` and the required `dist/assets`. Its CLI/Fastify server is never run and nothing from it is imported. Upstream JS/CSS are served byte-identical after SHA-256 verification |
| Embedding | an iframe of the copied `dist/webview/index.html`, preferably `sandbox="allow-scripts"` (opaque origin) if the C0 spike shows it works, else same-origin with the C0 grep evidence. The only edit is one inserted `<script src="./bta-host-shim.js">` tag in the copy (contract) |
| D2 | E1: read-only `MutationObserver` → DOM execution adapter → `ExecutionEvent` → `ViewState` → text panel + Pixel adapter. The DOM observer is an event-source adapter for this Feature, not a canonical execution API. Pixel code never reads the DOM |
| Attribution | none. Role-level `queued`/`inferring` are never produced. Both analysts show `working (graph)`; the runtime panel shows the true `active`/`queued` (F008-O1, FR-011) |
| D3 | SC-014b = the median main-thread busy-ratio increase ≤ 10 percentage points. Measured over a fixed synthetic replay (same trace, same 10 s interval, same browser process), view OFF vs ON alternating, ≥ 5 repetitions each. No native inference, setup or build |
| D4 | LOCAL ONLY. The copy step is a no-op when `VERCEL` is set; `.gitignore` and `.vercelignore` exclude the generated files. With no webview present, the view stays text-only. No public deployment serves upstream character sprites while F008-L1 is open |
| DOM reading (H1) | transitions of `#status` and `#node-*` come only from `MutationRecord.addedNodes` Text data. `#runtime` uses latest-value semantics. `data-state` is never used for transitions |
| D5 (F008-011) | Pixel Agents is an **explicit on-demand** visualizer. The text view is default and canonical; the canvas is OFF by default, enabled only by the host-owned "Show Pixel Agents" control, as session state with no storage and unavailable under reduced motion. The iframe exists only when enabled, the run is running and the area is visible. The original SC-014b is SUPERSEDED (it FAILED); **SC-014b1** (default mode ≤ 2 pp against `?viz=off`) is the gate, and **SC-014b2** records the Pixel cost as `KNOWN_UPSTREAM_COST` |
| Completion (M5) | text-only = `IMPLEMENTATION_PARTIAL`. `FEATURE_COMPLETE` needs C0 PASS and the Pixel iframe verified for US1 |
| Off switch | `?viz=off` (no observer, no iframe). Removing `<ExecutionView />` from `app/page.tsx` removes the Feature |
| Not added | event bus, visualizer registry, emitter inside `runGraph`, role↔request map, AkariSP `roleId`, persistent event store, telemetry, upstream patch, fork |

**Tests**: required (spec FR-026–FR-028, SC-001–SC-017).
- `npm test` starts at the T001 baseline and grows by the Feature 008 L1 tests.
- The browser suite keeps every existing test unchanged and adds Feature 008 tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: a different file, with no dependency on an incomplete task.
- **[USn]**: the spec's user stories:

  | Story | Title |
  |---|---|
  | US1 | see agents working |
  | US2 | understand flow |
  | US3 | waiting vs working |
  | US4 | completion, failure and cancellation |
  | US5 | preserve trading behavior |
  | US6 | same visualizer across modes |
  | US7 | test without inference |

- **APPROVAL REQUIRED / MANUAL**: ask in chat and wait for an explicit yes; never run automatically.

## Invariants

> **INV-1**: Feature 001–007 specs, verification and evidence stay byte-identical to their T002
> hashes.
>
> **INV-2**: unchanged, byte for byte (T002):
> - `src/main.ts` (the whole file, including the `runGraph` section, hash `922db752…`)
> - `src/graph/*`, `src/integration/*`, `src/market-bundle.ts`, `src/server/*`, `app/api/*`
> - `harness/*`, `test/standin.ts`, `app/harness/page.tsx`, `components/Boot.tsx`
> - AkariSP and every existing dependency version
>
> **INV-3**: the visualization only reads. It never writes, clicks or dispatches on elements
> outside its own container. It never calls `snapshot()` or `shutdown()`, and never imports
> `src/main.ts`, `src/integration/*` or `akarisp`. The one exception is a read-only import of the
> `ROLES` constant from `src/graph/trading-graph.ts` for labels and order; no graph is built or run.
>
> **INV-4**: with the view on (default text view, and with Pixel Agents explicitly enabled), off, absent or failing, the evidence record is deep-equal after
> removing exactly these fields:
> - every key named `timing`, at any depth
> - `pollMs`
> - `environment.date` and `environment.userAgent`
> - `dataSource.acquiredAt`, `dataSource.receivedAt` and `dataSource.usedAt`
> - **live mode only** (F008-010, maintainer decision): `dataSource.snapshotDigest`. It hashes the
>   bundle including `acquiredAt`, so two acquisitions of the same data differ. The live test also
>   proves that this is the only cause, and checks the normalized payload, `marketFacts`, the facts
>   digest, `marketAsOf`, the session counts, the outputs and the lifecycle directly. The fixture
>   comparison keeps `snapshotDigest`.
>
> One click still yields 1 graph run and 8 logical requests. The lifecycle is
> unchanged: `{ready,0,0}`, then `settledBeforeShutdown` true, then `{closed,0,0}`.
>
> **INV-5**: 0 off-origin requests. The upstream CLI/server is never started.
>
> **INV-6**: build, test and dev commands never modify tracked files. The pre/post
> `git diff -- <code paths> | shasum` must be equal. Code paths: `src test harness e2e app
> components scripts public package.json package-lock.json next.config.ts tsconfig.json
> playwright.config.ts .gitignore .vercelignore`. The generated `public/pixel-agents/*` (except the
> committed `public/pixel-agents/bta-host-shim.js`) and the one copied font file are git-ignored and
> vercel-ignored. The copy step never deletes or overwrites the shim.

## Stop conditions (finding first, no workaround)

- an INV-2 file appears to need a change
- the webview needs any edit beyond the one inserted shim tag, or a copied built file differs from
  its `node_modules` source
- the webview does not run in an iframe through the shim (C0 spike)
- any off-origin request, remote asset, install script, or the upstream server appears to be required
- the view changes an evidence field other than timings, or the graph-run or logical-request count
- Strict Mode shows 2 graph runs, or more than 1 observer or iframe
- a path would serve upstream character sprites publicly while F008-L1 is open (D4)
- a fork appears necessary (FR-035)
- a webview control leads to a graph run, a market request or a model request
- the `ROLES` import breaks the `next build` prerender, or cannot be isolated without moving
  production graph files
- the package shape differs from research R1/R2, or the asset/license assumption changes
- a protected hash changes

---

## Checkpoint A — Baseline and protection (Phase 1: Setup)

- [X] T001 Create `specs/008-pixel-agents-execution-visualization/verification.md` with the baseline:
  - branch, HEAD `07f8f34`, and `git status`
  - raw results of:
    - `npm run typecheck`
    - `npm run build`, with the `/` route's first-load JS and the list of `.next/static/chunks` files
      and sizes (the M1 baseline)
    - `npm test` (expected 107: 106 pass, 1 skip)
    - `npm run test:browser` (expected 32 passed, 1 skipped)
    - `npm run test:browser:dev`
  - the pre/post INV-6 digest
  If `next dev` is already running in this checkout, record `test:browser:dev` as BLOCKED and do not
  kill the process.
- [X] T002 Record protected hashes in `verification.md`:
  - the SHA-256 of every file in `specs/001-*` … `specs/007-*`, plus every INV-2 file
    (`git ls-files … | xargs shasum -a 256`), with the file count
  - the `runGraph` section: `awk '/^async function runGraph/,0' src/main.ts | shasum -a 256` =
    `922db7527716b5f318776e6aea9fdc4c076c3385b65add03089cc72b89f38ec8`
  - `package.json` and `package-lock.json` hashes (the pre-C0 dependency baseline)

## Checkpoint B — View model, offline (Phase 2: Foundational; US7, US3, US4)

- [X] T003 [P] [US7] Create `src/view/execution-events.ts` per contracts/execution-events.md. It has
  no DOM library and no Pixel type.
  - **`type ExecutionEvent`** (data-model):
    - `seq`: "integer ≥ 1, strictly increasing within a run; restarts at 1 at `run-started`"
    - `type`: `run-started` · `role-started` · `role-completed` · `role-failed` · `run-ended` · `runtime`
    - `role`: node name, only on `role-*`
    - `outcome`: `success` · `failed` · `cancelled` · `not-run`, only on `run-ended`
    - `stage`: `acquisition` · `graph` · `preflight`, only on `run-ended`
    - `runtime`: `{state, active, queued}`
  - **A pure `mapRecords(facts, ctx)`** over record-level facts. Facts are
    `{ el: 'status' | 'node', node?, addedText }` for childList records, taken from
    `record.addedNodes[0].data` and never from the element's current value (H1), plus
    `{ el: 'runtime', data }` and the `#evidence` text.
  - **Mapping**:
    - `#status` added text starting with `running` → `run-started`
    - `#status` added text starting with `done:` → `run-ended`, from the `#evidence` record
    - `#node-*` `running` / `done` / `error` → `role-started` / `role-completed` / `role-failed`
    - `#node-*` `waiting` → no event
    - `#runtime` → `runtime`, only on change
  - **`stage`**:
    - `failure.boundary` `market-data` → `acquisition`
    - `inference` → `graph`
    - `evidenceClass` `BLOCKED` → `preflight`
    - success → `graph`
  - **Edge cases (M8)**:
    - An unknown text is an anomaly and emits no event.
    - An unparseable record is an anomaly and emits `run-ended{failed, graph}`.
  - **A pure `snapshotPrefix(snapshot)`** turns the mount-time DOM snapshot into the synthetic event
    prefix of the contract.
- [X] T004 [P] [US3] Create `src/view/view-state.ts`: a pure `reduce(state, event)` and
  `initialViewState()` per data-model.
  - **Types**:
    - `RoleView.state` ∈ `idle`, `waiting`, `working`, `completed`, `failed`, `cancelled`, `not-run`
    - `queued` and `inferring` are reserved in the type and never produced
    - `RunView`: `idle` → `running` → `completed` | `failed` | `cancelled` | `not-run`, plus `stage`
    - `RuntimeView` = the latest `runtime` event, verbatim
  - **Rules, verbatim**:
    - "after `completed`, `failed`, `cancelled` or `not-run`, no later event changes the role in
      that run"
    - "every event after `run-ended` except `runtime` counts as an anomaly"
    - "`run-started` resets every role to `waiting`"
  - **At `run-ended`**:
    - `{cancelled}`: roles in `working` or errored → `cancelled`
    - `{failed}`: errored → `failed`, and **still `working` → `cancelled`** (M9)
    - `{failed | cancelled | not-run}`: still `waiting` → `not-run` (FR-007a)
    - "No role is ever left in `working` or `waiting` after `run-ended`"
  - **Illegal transitions**: they increment `anomalies` and are otherwise ignored.
- [X] T005 [P] [US7] Create the 12 traces of data-model as
  `test/fixtures/execution-traces/<name>.json`, each `{ name, events, expected }`:
  - `success`
  - `fanout-active1-queued1`
  - `role-failure-bull`
  - `failed-with-sibling-working`
  - `acquisition-cancel`
  - `acquisition-failure`
  - `graph-cancel-analysts`
  - `late-event-after-cancel`
  - `duplicate-and-out-of-order`
  - `second-run`
  - `blocked-preflight`
  - `runtime-create-failure`
  Write the expected sequences by hand from the spec and data-model rules, not by running the reducer.
- [X] T006 [US7] Create `test/execution-view.test.ts` (L1, node:test). All tests run with 0 model and
  0 network.
  - **Traces**: each trace reproduces its `expected` sequence, and so does a second replay (SC-008).
  - **Attribution**: no trace ever produces `queued` or `inferring` (SC-003, F008-O1).
  - **Run end**:
    - `not-run` appears only at or after `run-ended` (FR-007a).
    - No role is `working` or `waiting` after `run-ended` (M9).
  - **Failure and cancellation**:
    - Downstream roles are never `completed` after a failure (SC-004).
    - `acquisition-cancel` and `acquisition-failure` never show a working role (SC-005).
  - **Anomalies**: monotonicity and anomaly counts, including the late, duplicate and out-of-order
    traces (FR-009, FR-017).
  - **Mapper cases**:
    - same-record-batch transitions, e.g. `running…` then `done: …` in one batch → two events (H1)
    - unknown text
    - unparseable record
    - `snapshotPrefix` for a mid-run snapshot
- [X] T007 [P] [US1] Create `src/view/pixel-adapter.ts`. It is pure, has no DOM or `window`, and
  declares local types for the contract's message subset. No upstream file is imported or copied.
  - **`ROLE_IDENTITY`** follows the `ROLES` order:
    - `pixelId = i + 1`
    - palette `i % 6`
    - hueShift `0` for i < 6, `180` for i ≥ 6
    - a fixed `seatId` per role (placeholder until T016)
  - **`startSequence(assets, layout)`**, in contract order:
    - `settingsLoaded` with `soundEnabled: false`
    - `providerCapabilities{[], []}`
    - the asset messages
    - `layoutLoaded`
    - `existingAgents`
    - 8 × `agentTeamInfo`
  - **`messagesFor(prev, next)`**: follows the contract's mapping table. Only `working` sends
    `agentStatus{active}`.
- [X] T008 [US1] Extend `test/execution-view.test.ts` with adapter tests:
  - identical output for identical input
  - 8 distinct (palette, hueShift, seat) triples
  - labels equal to the `ROLES` labels
  - no message implying queued or inferring
  - `agentStatus{active}` only for `working`
  - the `success` trace ends with every role in the "Done" state
- [X] T009 [US7] `ROLES` import weight (M1), recorded in `verification.md`:
  - the top-level statements of `src/graph/trading-graph.ts` (`grep -n '^[a-z]' …`). Expected:
    imports, `const State = Annotation.Root(…)`, type aliases, `export const ROLES`, `const LABELS`,
    and function declarations only. Nothing builds or compiles a graph at module load.
  - an L1 test in `test/execution-view.test.ts`: importing `src/view/pixel-adapter.ts` loads
    `ROLES` with 8 entries. Loading it performs no runtime creation: the module does not import
    `akarisp`, which is checked with `grep`.
  Prerender and chunk evidence is taken at T013, after the component exists.
- [X] T010 **Checkpoint B gate** in `verification.md`:
  - typecheck and build
  - `npm test` raw output: baseline, new and total counts
  - INV-6 digest
  - protected hashes unchanged
  - dependency changes 0
  - State: **VIEW_MODEL_DEFINED**.

## Checkpoint C-text — Text observability (US2, US3, US4)

- [X] T011 [US2] Create `components/ExecutionView.tsx` (`'use client'`), **text only, no iframe yet**.
  One `useEffect` with full cleanup:
  - **Off switch**: `?viz=off` means render nothing and observe nothing.
  - **Mount**:
    - If any of `#status`, `#evidence`, `#runtime` or the 8 `#node-*` elements is missing, show
      "status unavailable" and do not observe (M8).
    - Otherwise take the DOM snapshot, apply `snapshotPrefix`, then start a read-only
      `MutationObserver`:
      - `childList` on `#status`, each `#node-*` and `#evidence`
      - `attributes` on `#runtime`
  - **Callback**: walk the records in order and build record-level facts from `addedNodes` Text data
    (H1). Read `#runtime` attributes once per batch.
  - **Text panel (canonical, FR-025, FR-029)**:
    - 8 roles, each with a text state and an icon
    - the run state with its stage
    - the runtime `state · active · queued`, verbatim
    - the mode `provider · data` from `#mode`
    - an `aria-live="polite"` region for run transitions
  - **Errors**: wrap everything in try/catch. On the first error, log once, keep the last good text,
    and never rethrow (FR-019).
  - **Test visibility**: expose `data-observers` and `data-anomalies` on the container.
  - **No timers**: no `setInterval`, `setTimeout` or `requestAnimationFrame` in this component (L3).
  - **Cleanup**: disconnect the observer.
  - If T009 or T013 shows a problem with the `ROLES` import, import `src/view/*` with a dynamic
    `import()` inside the effect, as `Boot` does. Production graph files are never moved.
- [X] T012 [US2] Add `<ExecutionView />` to `app/page.tsx` after the existing status table. It is the
  only edit to that file. Keep the existing table and every id.
- [X] T013 **Checkpoint C-text gate** in `verification.md`:
  - typecheck
  - `next build` with prerender PASS
  - the `/` first-load JS and chunk list compared with the T001 baseline (M1). If LangGraph moved
    into an eagerly loaded chunk, apply the T011 dynamic-import fallback and re-measure.
  - `npm test`
  - `npm run test:browser`: the existing tests unchanged and passing
  - a stand-in fixture run observed in the text panel
  - `git diff --stat` shows no INV-2 file
  - protected hashes
  - State: **TEXT_VIEW_INTEGRATED**, the `IMPLEMENTATION_PARTIAL` floor. Next: T014 (APPROVAL
    REQUIRED).

## Checkpoint C0 — Upstream consumable (MANUAL, APPROVAL REQUIRED)

- [X] T014 **APPROVAL REQUIRED** (D1 approved in principle; confirm before running):
  `npm install --save-dev --save-exact pixel-agents@1.4.1`. Then record in `verification.md`:
  - **Lockfile pin**: devDependencies has exactly `"pixel-agents": "1.4.1"`; the lockfile has version,
    `resolved` and `integrity`.
  - **Dependency tree**: `npm ls pixel-agents` output; the transitive additions listed. Any other
    new top-level dependency → STOP.
  - **Install scripts**: none (`npm view pixel-agents@1.4.1 scripts` and the install log). The
    CLI/Fastify server is never run.
  - **Webview entry**: `dist/webview/index.html` exists; record its module script and asset paths.
  - **Font path**: the built CSS font URL and whether the file exists in `dist/webview`. This
    resolves F008-005 and gives the exact font path for `.gitignore` and `.vercelignore`.
  - **Asset inventory**: characters, floor, walls, furniture, carpet, pets, default layout.
  - **Hashes**: the SHA-256 of every file to be served.
  - **Parent-access grep (M6)**: grep the built JS for `parent.`, `top.`, `opener` and
    `document.domain`. Record every match with context.
  - **External references**: grep the built JS/CSS for `http://` and `https://` URLs and classify
    each. Any runtime off-origin load → STOP.
  - **Unmodified package**: nothing under `node_modules/pixel-agents` is modified.
  - **D4**: restated as local only.
  Any surprise → STOP → finding.
- [X] T015 Create `scripts/copy-pixel-agents.mjs` and the serving setup:
  - **Copy script**:
    - If `VERCEL` is set, print one line and write nothing.
    - Otherwise copy `dist/webview/**` and the T014 asset inventory into `public/pixel-agents/`.
      Copy the font to its exact absolute path under `public/` if T014 found one.
    - Never delete or overwrite `public/pixel-agents/bta-host-shim.js`.
    - Insert exactly one `<script src="./bta-host-shim.js"></script>` before the first module
      script of the copied `index.html`.
    - Verify that every other copied file's SHA-256 equals its source, and that `index.html` differs
      from its source by exactly that one inserted line (L4). Exit non-zero otherwise.
  - **Shim**: create `public/pixel-agents/bta-host-shim.js` (ours, committed) per the contract,
    posting to `location.origin` or `'*'` per the sandbox mode.
  - **`.gitignore` and `.vercelignore`**: add `public/pixel-agents/*`,
    `!public/pixel-agents/bta-host-shim.js`, and the exact font file path from T014, never
    `public/fonts/` (M7).
  - **`package.json`**: add `"predev"` and `"prebuild"` running `node scripts/copy-pixel-agents.mjs`.
  - **`playwright.config.ts`**: prefix every webServer command (`next build && next start`, and
    `next dev`) with `node scripts/copy-pixel-agents.mjs && ` (H2).
- [X] T016 Create `src/view/pixel-assets.ts` (browser only):
  - Decode the PNGs under `/pixel-agents/assets/…` with `createImageBitmap` + canvas
    `getImageData` into the hex arrays of `core/src/messages.ts` at the pinned SHA. Read that file
    with `gh api`; do not copy it.
  - Load the default layout.
  - Replace the placeholder seats in `src/view/pixel-adapter.ts` with 8 real seat ids from that
    layout.
- [X] T017 **Spike** (throwaway `e2e/pixel-spike.spec.ts`, deleted after recording):
  - **Setup**: on a blank same-origin page, mount the iframe **twice**:
    - (a) `sandbox="allow-scripts"`, validated by `event.source`
    - (b) same-origin, unsandboxed
  - **Drive**: answer `webviewReady` with `startSequence`, then send `working` for Market Analyst.
  - **Record for each mode**:
    - a screenshot showing 8 labeled characters at their seats
    - console errors
    - the ignored-request count
    - off-origin requests (expected 0)
  - **Decision**: adopt (a) if it renders correctly. Otherwise record the finding, and use (b) with
    the T014 grep as evidence (M6).
  - **Record**: save the raw output in `verification.md`. If neither mode boots → STOP → finding.
- [X] T018 **Checkpoint C0 gate** in `verification.md`:
  - every T014 item
  - the copy script's hash and one-line checks pass
  - `VERCEL=1 node scripts/copy-pixel-agents.mjs` writes nothing
  - `git status` shows no generated file
  - the `.vercelignore` entries
  - the spike result and the sandbox decision
  - INV-6
  - protected hashes
  - State: **UPSTREAM_CONSUMABLE**.

## Checkpoint C-pixel — Pixel iframe (US1)

- [X] T019 [US1] **(D5 rework: add the host-owned "Show Pixel Agents" toggle, off by default, as `useState` only; it is disabled under reduced motion; the lifecycle mounts the iframe iff enabled ∧ running ∧ visible.)** **(C0 result F008-007: if the maintainer confirms the sandbox mode, this task also adds
  `headers()` for `/pixel-agents/:path*` → `Access-Control-Allow-Origin: *` to `next.config.ts`;
  nothing else in that file changes.)** Add the iframe host to `components/ExecutionView.tsx`, per
  contracts/pixel-host-protocol.md and the T017 sandbox decision.
  - **When to create the iframe**: only if all of these hold at mount:
    - `matchMedia('(prefers-reduced-motion: reduce)')` is false. The iframe is never created and
      then hidden (L5 limit documented).
    - a same-origin `HEAD /pixel-agents/index.html` returns 200 (D4 fallback: text-only)
    - no earlier view error occurred
  - **Message acceptance**:
    - `event.source === iframe.contentWindow`
    - `data.source === 'pixel-agents'`
    - `data.message.type` is a string
    - plus `event.origin === location.origin` in same-origin mode
  - **On `webviewReady`**: send `startSequence` and the current state. Ignore everything else,
    counting it in `data-ignored-requests`.
  - **Adapter errors**: on an adapter or `postMessage` error, remove the iframe and keep the text
    panel.
  - **Test visibility**: expose `data-iframes`.
  - **Cleanup**: remove the listener and the iframe.
- [X] T020 **Checkpoint C-pixel gate** in `verification.md`:
  - typecheck and build
  - `npm test`
  - `npm run test:browser`: the existing tests unchanged
  - a stand-in fixture run with the canvas observed
  - no INV-2 diff
  - protected hashes
  - State: **VIEW_INTEGRATED**.

## Checkpoint D — Browser validation (US1–US6, stand-in and controlled stub)

All tests below go in `e2e/execution-view.spec.ts` unless noted.

- [X] T021 [US1] **(D5 rework: default page → 0 iframes and 0 `/pixel-agents` requests; after the user enables the toggle and a run is running and visible → the iframe is mounted; turning it off during the run unmounts it, and a later run remounts it while it is still enabled.)** **Iframe actually mounted** (H2 guard): with the view on, assert all of these, so a
  text-only fallback cannot pass US1:
  - `data-iframes` = 1
  - the iframe document loaded from `/pixel-agents/index.html`
  - `webviewReady` was received
  - the start sequence was sent
  - 8 characters with the 8 role labels (webview DOM/overlay, or the host's sent-message log)
- [X] T022 [US2] Stand-in fixture success:
  - each role goes waiting → working → completed exactly once, and the run is completed (SC-001);
    the test records the text panel's transitions with its own MutationObserver
  - Bull starts only after both analysts are completed (FR-014)
  - each transition is visible within 1 s of the matching `#node-*` write (SC-013)
  - `data-anomalies` = 0
- [X] T023 [US3] Fan-out with `__standin.hold()` during the analysts. While `#runtime` shows
  `active 1 · queued 1`:
  - both analysts show `working (graph)`
  - 0 roles show queued or inferring
  - the runtime panel equals `#runtime`'s attributes (SC-003, FR-010, FR-011)
- [X] T024 [US4] Terminal cases:
  - **Live stub, cancel during acquisition**: 0 roles ever working; the run is `cancelled ·
    acquisition` (SC-005).
  - **Live stub, `server-error` scenario**: the run is `failed · acquisition` and 0 roles are ever
    working (L2).
  - **Stand-in, cancel during the analysts**:
    - running roles end `cancelled`, the rest `not-run`
    - nothing changes after the run ends
    - the evidence lifecycle is `{ready,0,0}` → settled → `{closed,0,0}` (SC-006)
  - **`createRuntime` failure**: the run is `failed · graph`, with 0 roles working.
  - **Native in Playwright Chromium (BLOCKED, same-task `running…` → `done:`)**: the run shows
    `not run (blocked)`, and `run-started` was observed (H1).
  - **Second run**: a full reset.
  - **Text**: failed and cancelled are distinguishable by text (US4/AC4).
- [X] T025 [US5] ON/OFF equality, for stand-in fixture and stand-in live stub:
  - one run with the default view (text, Pixel off), one with Pixel Agents explicitly enabled (canvas shown during the run), and one with `?viz=off`
  - the evidence records are deep-equal after removing exactly the INV-4 fields (M4)
  - equal outputs, 8 logical requests, per-role executions 8 × 1, the same market digests (SC-002)
  - the same comparison with the webview route failing (`page.route('/pixel-agents/**', 404)`), and
    with an injected host error: equal evidence, and the text panel still correct (SC-012,
    FR-019). The error is injected by a parent-frame init script that overrides the
    `HTMLIFrameElement.prototype.contentWindow` getter to return an object whose `postMessage`
    throws. This works in either sandbox mode, with no production test hook.
- [X] T026 [US5] **Webview controls are inert** (M6):
  - Before any run, click the webview's "+ Agent" and Settings controls (and any other button the
    T017 screenshot shows).
  - Assert:
    - `#status` stays `idle`
    - `#evidence` stays empty
    - 0 `/api/market` requests
    - 0 model requests: `#runtime` still shows `—`, so no runtime was created. A model request can
      only happen inside `runGraph` after runtime creation. The stand-in exposes no prompt counter,
      and `test/standin.ts` is INV-2.
    - `data-ignored-requests` > 0
  - Then one Run click gives exactly 1 graph run.
- [X] T027 [US6] Modes:
  - stand-in with fixture and with the live stub give identical role-state sequence shapes
  - the mode panel shows `provider · data` correctly (US6/AC1–2)
  - native is covered by T034
- [X] T028 [US5] Strict Mode: an `@dev` test, run by `test:browser:dev`. One click yields:
  - 1 graph run (`counts.graphRuns` 1)
  - 8 logical requests
  - `data-observers` ≤ 1 and `data-iframes` ≤ 1 at all times
  - the mount → cleanup → mount remount is observed through the T029 init-script counters
    (`MutationObserver` constructed and disconnected, iframes created and removed) (SC-007, M8)
- [X] T029 [US5] **(D5 rework: the canvas runs happen with the toggle enabled.)** Resource baseline (SC-014a):
  - **Instrumentation**: an init script records net deltas of `window` `message` listeners, and the
    number of iframes and observers created and removed. Use deltas, not absolute counts (L7).
  - **Runs**: 10 consecutive stand-in fixture runs, then 5 reloads.
  - **Pass**:
    - after each run, the deltas return to the post-mount baseline
    - no growth across runs
    - `ExecutionView` contains no timer or rAF calls (a static grep, L3)
  - **Remount**: component remount evidence comes from T028 (Strict Mode) plus the reloads (M8).
  - **Memory**: `performance.memory.usedJSHeapSize` is recorded (informational).
- [X] T030 [P] [US5] **(D5 replacement)**:
  - **SC-014b1 (gate)**: A = `?viz=off` against B = the default page (text view, toggle untouched).
    Same active synthetic trace, 10 s, alternating ≥ 5 each. B must show 0 iframes and 0
    `/pixel-agents` requests. Pass if `median(B) − median(A) ≤ 2` percentage points.
  - **SC-014b2 (disclosure)**: the same harness with the toggle enabled, the canvas visible and
    ≥ 20 fps. Raw samples are recorded as `KNOWN_UPSTREAM_COST`, with no threshold.
  - The original SC-014b text below is kept for history. Overhead (SC-014b, D3), in `e2e/view-overhead.spec.ts` plus `e2e/replay-dom.ts`:
  - **Replay**: `replay-dom.ts` replays the committed `success` trace as the same DOM writes
    `src/main.ts` performs, on a page with no run, over a fixed 10 s interval.
  - **Conditions**: view OFF (`?viz=off`: no observer, no iframe) and ON (observer, text panel,
    iframe), alternating, ≥ 5 repetitions each, in the same browser process.
  - **Per repetition**: `busyRatio = ΔTaskDuration / replayWall`, from Chrome DevTools Protocol
    `Performance.getMetrics`, read only before and after.
  - **Pass**: `median(ON) − median(OFF) ≤ 0.10` (10 percentage points).
  - **Record**: every raw sample in `verification.md`, unedited.
- [X] T031 [US5] **(D5 rework: under reduced motion the toggle is disabled and no iframe is ever created; the 375 px check enables the toggle.)** Conformance:
  - **Off-origin**: 0 requests to origins other than the app during a stand-in fixture run with the
    view on (SC-016, INV-5).
  - **Reduced motion**: `page.emulateMedia({ reducedMotion: 'reduce' })` before load; an init
    script shows that no iframe was ever created, and every occurring FR-007 state is readable as
    text (SC-015, FR-030).
  - **Narrow viewport**: at 375 px, all 8 labels are visible, there is no horizontal page scroll, and
    no labels overlap by bounding box (FR-033).
  - **Text first**: state is conveyed as text, not only by color (FR-029).
- [X] T032 **Checkpoint D gate** in `verification.md`:
  - typecheck, build and `npm test`
  - `npm run test:browser` ×3 and `test:browser:dev`, raw output
  - the SC-014a/b numbers
  - the INV-4 comparisons
  - the INV-6 digest
  - protected hashes and the `runGraph` hash
  - AkariSP changes 0
  - State: **CONTROLLED_VIEW_VALIDATED**.
- [X] T033 **APPROVAL REQUIRED — commit.**
  - **Stage**:
    - `src/view/*`, `components/ExecutionView.tsx`, the `app/page.tsx` line
    - `scripts/copy-pixel-agents.mjs`, `public/pixel-agents/bta-host-shim.js`
    - `.gitignore`, `.vercelignore`, `package.json`, `package-lock.json`, `playwright.config.ts`
    - tests, e2e, fixtures and the spec docs
  - **Never stage**: generated `public/pixel-agents/*`, the copied font, `.next/`, `test-results/`,
    `.specify/*`, `.claude/`, `CLAUDE.md`.
  - Stop after the commit.

## Checkpoint E — Native regression gate (MANUAL, APPROVAL REQUIRED)

- [ ] T034 **APPROVAL REQUIRED**: `npm run test:prompt-api` (native + fixture: the default text view, plus one run with Pixel Agents explicitly enabled) at the T033
  revision.
  - Record `specs/008-pixel-agents-execution-visualization/evidence/real-browser-next-fixture-<date>-<rev>.json`.
  - Expected:
    - 8/8 roles, 8 logical requests, 0 fallbacks
    - fan-out `{ready,1,1}`
    - `{ready,0,0}`, then `settledBeforeShutdown` true, then `{closed,0,0}`
    - the text panel ends completed
    - the iframe is mounted
  - Evidence class `REAL_BROWSER_PROMPT_API`, kept separate from stand-in evidence.
  - State: **IMPLEMENTATION_COMPLETE**.

## Checkpoint F — Closeout (APPROVAL REQUIRED)

- [ ] T035 Final audit in `verification.md`:
  - FR-001…FR-039 and SC-001…SC-017, each with its evidence and task
  - findings F008-001…006, L1 (open, D4 gate), O1 and O2
  - analyze repairs H1–L7 as applied
  - D1–D4 as applied, and the sandbox decision
  - NO_FORK: fork repositories 0; upstream source and built-file changes 0
  - the completion state: `FEATURE_COMPLETE` only if T021 (iframe) and T034 passed, otherwise
    `IMPLEMENTATION_PARTIAL`
  - then update `docs/testing.md`: the view section, `?viz=off`, the copy step, overhead and native
    notes
- [ ] T036 **APPROVAL REQUIRED — closeout commit.** Commit `tasks.md`, `verification.md`, the evidence
  and `docs/testing.md`. Update `docs/roadmap.md`: 008 complete, or partial with the reason; 009
  Effectiveness Benchmark next (not started). The update claims no public sprite redistribution.

---

## Dependencies & Execution Order

- **A**: T001–T002 come before everything else.
- **B**:
  - T003, T004, T005 and T007 run in parallel.
  - T006 needs T003–T005.
  - T008 needs T006 and T007.
  - T009 needs T007.
  - T010 is the gate.
- **C-text**: T011 needs B, then T012, then the T013 gate. No dependency install is needed.
- **C0**: T014 (approval) → T015 → T016 → T017 → T018. Nothing Pixel-related starts before T018.
- **C-pixel**: T019 needs T018 and T013, then the T020 gate.
- **D**: T021–T031 need T020.
  - T021–T029 and T031 share `e2e/execution-view.spec.ts`, so they run sequentially. T028 is `@dev`.
  - T030 has its own files and is [P].
  - Then T032, then T033 (approval).
- **E**: T034 (approval) needs T033.
- **F**: T035 → T036 (approval).
- **If C0 stops**: C-text stands as `IMPLEMENTATION_PARTIAL`. The D tests that apply to text only
  (T022–T025 without the iframe cases, T027–T029, T031) may run on maintainer instruction. No
  `FEATURE_COMPLETE`.

## Parallel Opportunities

- B: T003, T004, T005 and T007 are separate files.
- D: T030 (`e2e/view-overhead.spec.ts`, `e2e/replay-dom.ts`) runs alongside T021–T029 and T031.

## Requirement Coverage

| Requirement | Tasks |
|---|---|
| FR-001–005 event boundary, one-way, no invented states | T003, T011, T025, T026 |
| FR-006 identity | T007, T008, T016, T017, T021 |
| FR-007–012 states, attribution, run stage | T004, T006, T023, T024 |
| FR-013–017 flow, failure, cancellation, late events | T005, T006, T022, T024 |
| FR-018–023 non-interference, containment, trigger, Strict Mode, removable | T025, T026, T028, T011, INV-2/3 |
| FR-024–025 modes, status | T011, T027 |
| FR-026–028 synthetic traces, replay | T005, T006, T030 |
| FR-029–033 text, reduced motion, cleanup, privacy, layout | T011, T019, T029, T031 |
| FR-034–037 no fork, pinned, license | T014–T018, T035 |
| FR-038–039 protected scope, separate evidence | T002, T009, T010, T013, T032, T034 |
| SC-001, SC-013 | T022 |
| SC-002, SC-012 | T025 |
| SC-003 | T006, T023 |
| SC-004 | T006 |
| SC-005 | T006, T024 |
| SC-006 | T024 |
| SC-007 | T028 |
| SC-008 | T006 |
| SC-009 | T032, T034 |
| SC-010, SC-011 | T002, T032 |
| SC-014a | T029 |
| SC-014b | T030 |
| SC-015 | T031 |
| SC-016 | T017, T031 |
| SC-017 | T035 |

## Implementation Strategy

1. **Observability floor**: B, then C-text. The text panel satisfies US2, US3, US4 and US7 with no
   dependency. This is `IMPLEMENTATION_PARTIAL`, not Feature completion.
2. **C0, with approval**: prove that the upstream package is consumable unmodified. Any surprise
   stops the work and becomes a finding.
3. **C-pixel and US1 verification (T021)**: required for `FEATURE_COMPLETE`.
4. **Gates in order**: browser gate D, then native gate E, then closeout F. Every approval point
   stops and waits.
