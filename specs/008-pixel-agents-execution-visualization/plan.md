# Implementation Plan: Feature 008 — Pixel Agents Execution Visualization

**Branch**: `008-pixel-agents-execution-visualization` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-pixel-agents-execution-visualization/spec.md`

## Summary

Core question: can Pixel Agents upstream, unmodified, sit on BrowserTradingAgents' generic
execution-event projection? **Yes, conditionally, with source-level evidence** ([research.md](research.md)).

**Product decision D5 — F008-011 (maintainer, 2026-09-29): Pixel Agents is an explicit on-demand
visualizer.**
- **Default**: the text execution view is ON (canonical), and the Pixel canvas is OFF.
- **Opt-in**: the canvas is enabled only through the host-owned "Show Pixel Agents" control. The
  choice is page-session state only, with no storage, so every load starts off.
- **Lifecycle**: an iframe exists only when enabled, the run is running and the area is in the
  viewport. The A/B/C optimizations (run-scoped, off-screen unmount, 480×320 backing store) stay.
- **Reduced motion**: the toggle is unavailable.
- **Performance**: the original SC-014b (≤ 10 pp, always-on) FAILED (+11.72 to +14.95 pp headless;
  the headed out-of-process iframe's main thread was about 12.8 % busy) and is
  SUPERSEDED_BY_MAINTAINER_DECISION. It is replaced by:
  - SC-014b1: the default mode is within ≤ 2 pp of `?viz=off`.
  - SC-014b2: the explicit Pixel mode cost is disclosed as `KNOWN_UPSTREAM_COST`.
- **F008-011**: RESOLVED_BY_PRODUCT_DECISION. Options 1 (partial close) and 3 (upstream patch or
  fork) were rejected.

The approach:

- **Upstream**: `pixel-agents-hq/pixel-agents` @ `3537e140` (v1.4.1, MIT). It publishes no library,
  only a built single-page app inside the npm package. That app is driven purely by a documented host
  message protocol, and it uses `window.postMessage` whenever a global `acquireVsCodeApi` exists.
- **Embedding**: the page embeds that built app in an iframe (`sandbox="allow-scripts"` if the C0 spike allows, else same-origin). A small host shim is the
  host side, and upstream code changes are 0. No fork.
- **Execution truth**: taken read-only from the status surface that `src/main.ts` already writes
  (`#status`, `#node-*`, `#runtime`, `#evidence`). A `MutationObserver` maps those writes to
  BrowserTradingAgents `ExecutionEvent`s.
- **State**: a pure reducer derives the view state. A text panel is the canonical, accessible
  display. A pure adapter maps the view state to Pixel Agents messages.
- **Protected code**: `src/main.ts` and the protected `runGraph` section, graph, bridge and AkariSP
  change by **0 lines**.
- **No per-role attribution**: role-level `queued` and `inferring` are not attributable without
  protected changes. The FR-011 path applies: roles show `working (graph)` and the runtime panel shows
  the true `active`/`queued` counts.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Node ≥ 22.18 for tests and build

**Primary Dependencies**:
- Existing, all unchanged: Next.js 16.3.6 App Router, React 19.3.0, `@langchain/langgraph` 1.4.18,
  `@langchain/core` 1.2.13, `akarisp` 0.1.0-alpha.2.
- **New, approval-gated (C0)**: `pixel-agents@1.4.1` as a devDependency. Used only for its built
  `dist/webview` and `dist/assets`; no JS import. It brings `fastify` and plugins transitively; no
  install scripts.

**Storage**: none. View state is in memory; replay exists only in tests.

**Testing**:
- `node --test` (L1): reducer, adapter and observer mapping over committed synthetic traces.
- Playwright (L3): stand-in, fixture and live stub, `next start` and `next dev`.
- Native Prompt API gate (`test:prompt-api`).

**Target Platform**: desktop Chrome (primary). Narrow viewports must not break.

**Project Type**: web application (Next.js App Router shell, all execution in the browser).

**Performance Goals**:
- View reflects an event within 1 s (SC-013).
- Median main-thread busy-ratio increase ≤ 10 percentage points over a fixed synthetic replay (SC-014b, D3).
- No subscription, timer or iframe accumulation (SC-014a).

**Constraints**:
- 0 changes to `src/main.ts`, `components/Boot.tsx`, `src/graph/*`, `src/integration/*`, AkariSP,
  `/api/market` and the provider.
- 0 off-origin requests.
- No fork, and no copied upstream source.

**Scale/Scope**: 8 roles, 1 run at a time, 1 page.

## Constitution Check

| Principle | Check | Status |
|---|---|---|
| I Dogfood before abstraction | One observer, one reducer, one adapter, one host component. No event bus, visualizer registry or plugin system. The event type exists because the spec requires a visualizer-independent boundary (FR-002) | PASS |
| II Deterministic fixtures first | Committed synthetic traces, L1 with no model or network; the native gate is separate | PASS |
| III Application owns orchestration | The visualizer only reads; every webview request is ignored; AkariSP stays role-agnostic (no `roleId`) | PASS |
| IV AkariSP owns inference lifecycle | Lifecycle code is untouched; the observer does not call `snapshot()` or `shutdown()` | PASS |
| V Evidence before core change | F008-O1 and F008-O2 are recorded as dogfooding observations; no AkariSP change is proposed | PASS |
| VI Browser first | Rendering, Strict Mode, reduced motion and main-thread cost are claimed only from browser evidence (L3 / native); research is `STATIC_CODE_ANALYSIS` | PASS (pending evidence) |
| VII Reproducible runs / pinned upstream | Pixel Agents pinned by SHA `3537e140`, license recorded; the existing evidence record is unchanged | PASS |
| VIII No trading-quality claims | The visualization claims nothing about decisions | PASS |
| IX External data deferred | No new data source | PASS |
| X Thin integration boundaries | Pixel protocol types stay local to the adapter; nothing is promoted to a package | PASS |
| XI Preserve reference semantics / no verbatim copy | No upstream source is copied. The built SPA is served from the npm dependency's files (a dependency, not reference code). Sprite decoding is written fresh | PASS (C0 confirms the copy step leaves built files byte-identical) |
| XII Findings before fixes | Nine findings recorded (F008-001…006, L1, O1, O2) with evidence, impact and adaptation | PASS |
| XIII Inference tiers | Not touched | PASS |

Re-check after Phase 1 design: unchanged, all PASS. No complexity-tracking entry.

## Project Structure

### Documentation

```text
specs/008-pixel-agents-execution-visualization/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md                     # R1–R8, findings, decisions
├── data-model.md                   # ExecutionEvent, ViewState, role identity, traces
├── contracts/
│   ├── execution-events.md         # status surface → events (read-only)
│   └── pixel-host-protocol.md      # serving, shim, host ↔ webview messages
├── quickstart.md
└── tasks.md                        # /speckit-tasks
```

### Source (planned)

```text
src/view/
├── execution-events.ts   # ExecutionEvent type + pure mapper (mutation facts → events)
├── view-state.ts         # pure reducer → ViewState (no Pixel types)
└── pixel-adapter.ts      # pure ViewState diff → Pixel messages; local message subset types
components/
└── ExecutionView.tsx     # 'use client': observer, text panel, runtime/mode status, iframe host
public/
├── pixel-agents/bta-host-shim.js   # committed (ours)
└── pixel-agents/**                 # generated from node_modules/pixel-agents/dist, git-ignored
scripts/
└── copy-pixel-agents.mjs # predev/prebuild: copy, insert shim tag, verify hashes, font (F008-005)
app/page.tsx              # + <ExecutionView /> (one line; removable)
playwright.config.ts      # webServer commands run the copy script first (npx next … bypasses npm lifecycle)
.gitignore, .vercelignore # generated public/pixel-agents/* (except the shim) and the one copied font file
test/
├── execution-view.test.ts
└── fixtures/execution-traces/*.json
e2e/
└── execution-view.spec.ts
```

`src/main.ts`, `components/Boot.tsx`, `src/graph/*`, `src/integration/*`, `src/market-bundle.ts`,
`src/server/*` and `app/api/*` are not edited.

## Design

### Flow

```text
src/main.ts (unchanged) writes #status/#node-*/#runtime/#evidence
        │  MutationObserver (read-only, ExecutionView)
        ▼
ExecutionEvent (seq) ──► reduce ──► ViewState ──┬─► text panel (roles, run+stage, runtime, mode)
                                                └─► pixel-adapter ──postMessage──► iframe (unmodified Pixel Agents)
                                                         ▲ webviewReady only; every other request ignored
```

### Key decisions (details in research)

| Decision | Choice | Ref |
|---|---|---|
| Consumption | npm `pixel-agents@1.4.1` devDependency; built SPA copied to git-ignored `public/pixel-agents/`; iframe | R5 |
| Host transport | `acquireVsCodeApi` shim → `parent.postMessage`; acceptance by `event.source` + `data.source`, plus the origin check in same-origin mode | R2, contract |
| Event source | E1: observe the existing status surface; 0 execution-code lines | R8 |
| Role-level queued/inferring | not produced (FR-011) | F008-O1 |
| Canonical display | text panel from the same ViewState; the canvas is decorative | F008-002 |
| Determinism | `existingAgents` with fixed seat, palette and hue; tests assert messages, not pixels | F008-003 |
| Reduced motion | no iframe (never created); text panel only | F008-006 |
| Iframe isolation | `sandbox="allow-scripts"` if the C0 spike allows, else same-origin with the grep evidence; webview controls proven inert by test | analyze M6 |
| DOM reading | transitions from `MutationRecord.addedNodes`; `#runtime` latest value; no `data-state` | analyze H1 |
| Sound | `soundEnabled: false` | R3 |
| Off switch | `?viz=off`; removing `<ExecutionView />` removes the Feature | R6 |

### Protected invariants

- The `runGraph` section hash stays `922db7527716b5f318776e6aea9fdc4c076c3385b65add03089cc72b89f38ec8`.
- The 78 protected-file hashes stay unchanged, including `components/Boot.tsx`, `src/graph/*` and
  `src/integration/*`.
- `src/main.ts` is unchanged, byte for byte.
- AkariSP changes 0. Graph topology and role provenance changes 0.
- The evidence record schema is unchanged. The `feature` field stays
  `007-upstream-server-market-data-boundary`, because no evidence field changes.
- One click still gives one graph run. The lifecycle stays `{ready,0,0}`, then
  `settledBeforeShutdown` true, then `{closed,0,0}`.

## Checkpoints and states

| CP | Tasks (for /speckit-tasks) | Gate | State |
|---|---|---|---|
| A | baseline: git, `npm test`, typecheck, build, `test:browser`, protected hashes, `runGraph` hash | all green; hashes recorded | BASELINE_RECORDED |
| B | `src/view/*` pure modules, 12 synthetic traces and L1 tests; `ROLES` import weight check (top-level statements, `next build` prerender, chunk sizes) | traces pass and replay identically; no dependency; import verified or isolated by a dynamic `import()` in `useEffect` | VIEW_MODEL_DEFINED |
| C-text | `ExecutionView` observer and text panel (no iframe) in `app/page.tsx` | typecheck, build; stand-in smoke; existing tests unchanged | TEXT_VIEW_INTEGRATED |
| **C0** | **APPROVAL REQUIRED (D1 approved)**.<br>• Install `pixel-agents@1.4.1` as a devDependency.<br>• Inspect: exact version and integrity in the lockfile, no install scripts, `dist/webview` exists, CSS/font paths, required asset inventory, SHA-256 of every served file, a grep of the built JS for `parent.`/`top.`/`opener`/`document.domain`.<br>• Copy script, `.gitignore`/`.vercelignore`, Playwright webServer pre-step.<br>• iframe + shim spike, same-origin and `sandbox="allow-scripts"`.<br>• 0 upstream source or built-file modification.<br>• D4 recheck. | All items hold. **Any surprise → STOP → finding**: the package shape differs, the webview does not boot in an iframe through the shim, a bundle edit is needed, an unexpected external dependency appears, or the asset/license assumption changes | UPSTREAM_CONSUMABLE |
| C-pixel | iframe host added to `ExecutionView` (sandbox per C0) | typecheck, build; stand-in smoke with the canvas | VIEW_INTEGRATED |
| D | L3 browser tests: iframe actually mounted, ON/OFF equality, webview controls inert, cancel ×2, acquisition failure, fan-out, Strict Mode dev, resource baseline, SC-014b replay, off-origin 0, reduced motion, narrow viewport | all pass ×3; protected hashes intact | CONTROLLED_VIEW_VALIDATED |
| **E** | **APPROVAL REQUIRED**: native gate (native + fixture; default text view, plus one run with Pixel Agents explicitly enabled) | 8/8, 8/0, lifecycle invariants | IMPLEMENTATION_COMPLETE |
| F | verification record, roadmap, commit (approval) | — | FEATURE_COMPLETE |

**Completion states (analyze M5)**:
- `IMPLEMENTATION_PARTIAL`: text observation, reducer and text panel only. This is the outcome if C0
  stops. It is a valid observability MVP but **not** Feature 008 completion, and the Pixel part
  becomes a finding for a maintainer decision.
- `FEATURE_COMPLETE`: additionally requires that C0 passed, that the Pixel iframe was verified in the
  browser for US1 after an explicit opt-in (iframe mounted, 8 labeled characters, states projected), and that D, E and F
  passed.
- Completion does not claim that upstream sprites may be publicly redistributed. F008-L1 stays open
  (D4).

## Stop conditions (finding first; no workaround)

- Any required change to `src/main.ts`, the `runGraph` section, `src/graph/*`, `src/integration/*` or
  AkariSP.
- The webview needs an upstream source or built-file edit beyond the one inserted shim `<script>` tag.
- A webview control (for example "+ Agent") leads to a graph run, a market request or a model request.
- The `ROLES` import breaks the `next build` prerender, or cannot be isolated without moving production graph files.
- The webview makes any off-origin request, or needs a remote asset.
- A copied built file differs from its `node_modules` source (other than `index.html`).
- The view on vs off changes any evidence field other than timings, or the logical request or graph
  run count.
- Strict Mode shows 2 graph runs, or more than 1 observer or iframe.
- A build or deployment path would serve the upstream character assets publicly while F008-L1 is
  open (D4).
- A fork appears necessary (FR-035).

## Maintainer decisions (fixed 2026-09-29)

| ID | Decision |
|---|---|
| D1 | **APPROVE — devDependency only.**<br>• `pixel-agents@1.4.1` is added with an exact version pinned in `package-lock.json`.<br>• It is used only as the reproducible source of the pinned artifacts (`dist/webview`, required `dist/assets`).<br>• Its CLI/Fastify server is never run, and nothing from it is imported at runtime.<br>• Upstream JS/CSS are served byte-identical after hash verification. |
| D2 | **E1.**<br>• A read-only `MutationObserver` on the existing DOM feeds a **DOM execution adapter**, which produces the generic `ExecutionEvent`, then `ViewState`, then the visualizers.<br>• Pixel Agents never reads the DOM.<br>• The DOM observer is this Feature's event-source adapter only, **not** a declared long-term canonical execution API.<br>• 0 changes to `src/main.ts`, `runGraph`, graph, bridge and AkariSP is a Feature invariant.<br>• No role ↔ AkariSP request correlation is built (F008-O1 stands). |
| D3 | **APPROVE.**<br>• SC-014b is the median increase of the **main-thread busy ratio** during a fixed synthetic trace replay, and must be ≤ 10 percentage points, view OFF vs ON.<br>• Conditions: same trace, same replay duration, same browser/process conditions, ≥ 5 repetitions each.<br>• Native inference is excluded. |
| D5 | **ON-DEMAND PIXEL (F008-011).** The text view is default and canonical. The Pixel canvas is off by default and enabled only by the host-owned "Show Pixel Agents" control, as session state with no storage. The iframe exists only when enabled, the run is running and the area is visible. The original SC-014b is superseded (FAILED); SC-014b1 (default mode ≤ 2 pp) is the gate, and SC-014b2 discloses the Pixel cost. |
| D4 | **LOCAL ONLY.**<br>• Upstream character assets (F008-L1) are used for local research and validation only.<br>• A public (Vercel) deployment MUST NOT serve them until F008-L1 is resolved.<br>• Engineering gate: the copy step does nothing when `VERCEL` is set, so no `public/pixel-agents/` is produced there. `ExecutionView` detects the missing webview and stays text-only.<br>• This is a provenance gate, not a legal conclusion. Replacing the sprites with clearly licensed ones would be a separate decision. |

## Complexity Tracking

None. The Constitution Check has no violations.
