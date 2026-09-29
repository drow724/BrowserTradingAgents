# Research: Feature 008 — Pixel Agents Execution Visualization

**Date**: 2026-09-29 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Method: source reading only. Pixel Agents was read through `gh api …/contents/<path>?ref=<SHA>` and
`npm view`. Nothing was cloned, installed, downloaded or executed. Every Pixel Agents citation is
`path:line` at the pinned SHA below. BrowserTradingAgents citations are at `main` `07f8f34`.

Evidence class of this document: `STATIC_CODE_ANALYSIS` (Constitution VI). No claim here about
rendering, timing or browser behavior is final until the browser checkpoints in the plan.

Core question: **Can Pixel Agents upstream, unmodified, sit on BrowserTradingAgents' generic
execution-event projection?**

Answer: **Yes, conditionally — as an isolated iframe driven over its own host message protocol,
not as an imported React component.** Upstream source changes: 0. Details R1–R8.

---

## R1. Upstream identity

| Item | Value | Evidence |
|---|---|---|
| Canonical repository | `pixel-agents-hq/pixel-agents` (`pablodelucca/pixel-agents` redirects here; not a fork) | `gh api repos/pixel-agents-hq/pixel-agents` (`fork: false`, `parent: null`) |
| Pinned commit | `3537e140c2094761beae748592aeb92ece8edfdd` = tag `v1.4.1` = `main` HEAD on 2026-09-29 (`compare v1.4.1...main` ahead 0) | `gh api …/git/ref/tags/v1.4.1`, `…/commits/main` |
| License | MIT, "Copyright (c) 2026 Pablo De Lucca"; the only license file in the tree | `LICENSE:1-3` |
| npm package | `pixel-agents@1.4.1`: a VS Code extension (`main: ./dist/extension.js`) plus a standalone CLI server (`bin: dist/cli.js`); **not a library** — no `exports`, `types`, `module` or `browser` field | `package.json:30-33`; `esbuild.js:87-95, 131-141`; `npm view` |
| Published files | `dist/extension.js`, `dist/cli.js`, `dist/hooks/…`, `dist/uninstall.js`, **`dist/assets/`**, **`dist/webview/`** (built SPA), `LICENSE`, `CHANGELOG.md`, `icon.png`; sources (`core/`, `webview-ui/`, `server/`, `adapters/`) are excluded | `package.json:34-44`; `scripts/npm-package-contract.mjs:16-48` |
| Runtime dependencies | `fastify`, `@fastify/cors`, `@fastify/static`, `@fastify/websocket` (for the CLI server) | `npm view pixel-agents dependencies` |
| Install scripts | none (`preinstall`/`install`/`postinstall` absent) | `npm view pixel-agents scripts.*` |
| Size | ≈ 3.08 MB unpacked, 193 files | `npm view dist.unpackedSize, dist.fileCount` |
| Provenance | no `gitHead`; SLSA provenance attestation present | `npm view dist.attestations` |
| Separate packages | none: `webview-ui` is `"private": true`; `core/` has no package.json ("types-only"); `server/` is private; `@pixel-agents/core` is 404 | `webview-ui/package.json:2-3`; `core/src/index.ts:1-2`; `server/package.json:3` |
| Assets | 6 character sheets (`char_0..5.png`), furniture, floor, wall, carpet, pets, bundled in `webview-ui/public/assets/` and copied to `dist/assets` at build | tree; `esbuild.js:19-31`; `README.md:138` |
| Asset credit | characters "based on the amazing work of JIK-A-4, Metro City" (link to an itch.io pack); **no separate asset license file in the repository** | `README.md:48` |

**Finding F008-L1 (asset license, open)**. The character sprites credit a third-party pack and the
repository contains no license file other than the MIT `LICENSE`. This research makes no legal
conclusion. Serving these sprites from the personal Vercel deployment redistributes them. Maintainer decision D4 (2026-09-29): **LOCAL ONLY**. The sprites are used for local research and
validation. No public deployment serves them until F008-L1 is resolved. This is an engineering gate
on insufficient provenance, not a legal judgement.

## R2. Consumption form

- **Monorepo**: root workspaces `["server", "webview-ui"]` (`package.json:11-14`).
  - `core/`: shared types, the message protocol generated from AsyncAPI (`core/src/messages.ts:1-8`), and a PNG decoder that depends on `pngjs` and runs in Node only (`core/src/assets/pngDecoder.ts:8`).
  - `server/`: Fastify runtime, the Claude provider and the CLI.
  - `adapters/vscode/`: the extension host.
- **webview-ui**: a standalone single-page app. It uses React `^19.2.5`, Vite 8, Tailwind 4 and Canvas 2D (`webview-ui/package.json:14-17`).
  - Entry: `createRoot(#root)` inside `<StrictMode>` (`webview-ui/src/main.tsx:16-20`).
  - Build output: `../dist/webview` with `base: './'` (`webview-ui/vite.config.ts:122-129`).
  - There is no library entry and no component export.
- **Transport selection**:
  - If a global `acquireVsCodeApi` exists, the runtime is `vscode` (`webview-ui/src/runtime.ts:14`). The app then uses `PostMessageTransport`, which sends with `acquireVsCodeApi().postMessage` and receives through `window` `'message'` (`webview-ui/src/transport/postMessageTransport.ts:20-31`). Verified by reading the file.
  - Otherwise it opens a same-host WebSocket at `/ws` (`webview-ui/src/transport/index.ts:7-24`). The transport is a module-level singleton created at import (`:45`).
- **Assets in production builds**: the host must push every asset as a message (`webview-ui/src/main.tsx:11-15`). Only the dev-only `browserMock` fetches assets (`webview-ui/src/browserMock.ts:81-222`).
- **Hosted web mode**: none. `vercel.json` only sets `git.deploymentEnabled: false` and is used for test-report previews (`vercel.json:1-6`; `README.md:201`). Standalone mode is a local `npx pixel-agents` server bound to `127.0.0.1` (`server/src/httpServer.ts:93`).

**Finding F008-001 (consumption form)**. Pixel Agents cannot be imported as a React component or
module, because it has no export and relies on module-level singletons (`transport/index.ts:45`;
`App.tsx:35-47`). Its only consumable form is the built SPA in `dist/webview` together with
`dist/assets`. Impact: the page embeds Pixel Agents as an iframe (R5). Two brief preferences are
still met: no component-level coupling, and no fork.

## R3. Extension surface (host ↔ webview protocol)

The webview consumes only `ServerMessage`s (`core/src/messages.ts:10-41`). Its handler knows nothing
about Claude transcripts (`webview-ui/src/hooks/useExtensionMessages.ts:187-742`). A third party can
therefore drive it by speaking the protocol.

Host → webview messages that the plan uses (definitions in `core/src/messages.ts:67-270`):

| Purpose | Message | Notes |
|---|---|---|
| Capabilities | `providerCapabilities{readingTools, subagentToolNames}` | Sending `subagentToolNames: []` prevents automatic subagent characters (`useExtensionMessages.ts:398-408`) |
| Settings | `settingsLoaded{…, soundEnabled}` | A `waiting` status plays a notification sound (`useExtensionMessages.ts:489`; `notificationSound.ts:71`). The plan sends `soundEnabled: false` |
| Assets | `characterSpritesLoaded`, `floorTilesLoaded`, `wallTilesLoaded`, `furnitureAssetsLoaded`, `carpetTilesLoaded`, `petSpritesLoaded` | Sprites travel as **pre-decoded hex color arrays** (`messages.ts:231-235, 253`). Upstream decodes them in Node (`pngDecoder.ts`) |
| Layout | `layoutLoaded{layout}` | Data-driven (version 1). The default layout ships as `default-layout-1.json` |
| Characters with fixed seats | `existingAgents{agents, agentMeta{palette, hueShift, seatId}, folderNames, externalAgents}` | `seatId` fixes the seat (`officeState.ts:454-458`) |
| Role label | `agentTeamInfo{agentName, teamName, …}` | `agentName` is shown as the character's role label (`ToolOverlay.tsx:205`) |
| Activity | `agentStatus{status: 'active' \| 'waiting'}`, `agentToolStart{toolId, status, toolName?}`, `agentToolDone`, `agentToolsClear` | `status` text is shown verbatim (`ToolOverlay.tsx:65`). `waiting` shows a "Done" check bubble (`ToolOverlay.tsx:53-74, 141-170`) |
| Removal | `agentClosed{id}` | — |

Displayable character states are `IDLE` (which wanders), `WALK` and `TYPE`
(`webview-ui/src/office/types.ts:29-33`; `characters.ts:103-167`). Reading animations apply only to
tool names in `readingTools`.

Webview → host messages are all **requests**: `webviewReady`, `launchAgent`, `focusAgent`,
`closeAgent`, `saveLayout`, `saveAgentSeats`, `setHooksEnabled` and others
(`core/src/messages.ts:43-65`; `BottomToolbar.tsx:71,80`; `App.tsx:146,232`). A host that ignores
them makes the webview incapable of orchestration.

**Pluggability**. `MessageTransport` is an interface (`core/src/transport.ts:24-37`). The webview,
however, creates one of its two implementations itself, so nothing can be injected from outside.
`HookProvider` is server-side and Claude-specific, and the provider list is hard-coded
(`server/src/providers/index.ts:23`).

**Finding F008-002 (status vocabulary)**. Pixel Agents has two activity states (`active`,
`waiting`) plus free-text tool status. It has no failed, cancelled, queued or not-run state.
- Impact: the canvas alone cannot express FR-007/FR-008.
- Adaptation, which touches no upstream code:
  - The canvas carries a subset: working → `active` with the status text `working`; completed → `waiting` (the "Done" bubble); everything else → no activity, with the state as status text where the webview shows it.
  - The **canonical, accessible state is a BrowserTradingAgents text panel** rendered from the same view state (FR-029).

**Finding F008-003 (non-deterministic motion)**.
- `agentCreated` has no `seatId`, and the seat falls back to `Math.random` (`officeState.ts:341-342`).
- Spawn position and idle wandering are also random (`officeState.ts:218, 240, 478`; `characters.ts:76, 118`).
- Adaptation: create the eight characters with `existingAgents` and fixed `seatId`s, so identity (sheet, hue, seat, label) is deterministic.
- Idle wandering stays random. It is treated as decoration, and the spec's "position" means the assigned seat.
- Deterministic tests assert the messages sent to the webview, never pixels.

**Finding F008-004 (exposed controls)**. The webview renders its own controls: "+ Agent", settings
and the layout editor.
- They send requests that the BrowserTradingAgents host ignores, except `webviewReady`. Clicking them therefore changes nothing in execution (FR-003).
- Residual cosmetic issue: buttons that do nothing. Hiding them would need an upstream change. They are left visible and recorded here.

## R4. Minimal contact surface

```text
execution truth (existing page status surface written by src/main.ts)
    ↓  observe (read-only)
ExecutionEvent  (BrowserTradingAgents-owned; contracts/execution-events.md)
    ↓  reduce (pure)
ViewState       (roles + run + runtime; data-model.md)
    ├─→ text panel  (canonical, accessible)
    └─→ Pixel adapter (pure: ViewState diff → ServerMessage[]; contracts/pixel-host-protocol.md)
            ↓  postMessage
        Pixel Agents iframe (unmodified dist/webview)
```

- The Pixel Agents protocol appears only inside the adapter and host modules. The event and reducer
  modules never import it (FR-002).
- Replacing the visualizer means replacing the adapter and host. The observer, events and reducer
  stay as they are.

## R5. Forkless feasibility (fixed order)

| # | Option | Feasible | Upstream code touched | Evidence |
|---|---|---|---|---|
| 1 | npm dependency imported as a component | **No** | — | no exports (`npm view`); VS Code `main` (`esbuild.js:87-95`) |
| 2 | Composition: embed the published built SPA from the npm dependency in an iframe, speak its documented host protocol | **Yes (chosen)** | **0** | `runtime.ts:14`; `postMessageTransport.ts:20-31`; `package.json:34-44` |
| 2′ | Same iframe in WebSocket mode (host implements `/ws`) | Yes, heavier | 0 | `transport/index.ts:18-24`. Needs a WebSocket server beside Next, which a Route Handler does not provide. Rejected: more infrastructure for no benefit |
| 3 | Upstream standalone server with a custom provider | Practically no | provider list hard-coded | `server/src/providers/index.ts:23`; the Claude-hook imitation path relies on `~/.pixel-agents` and transcripts (`hookEventHandler.ts:165-308`) |
| 4 | Application-local patch | Not needed | — | Only F008-003's random idle motion and F008-004's buttons would need one; both are accepted as cosmetic |
| 5 | Fork | **Not needed** | — | NO_FORK_BY_DEFAULT holds (FR-034) |

How option 2 works, with no upstream change:

- The page serves the npm package's `dist/webview` and `dist/assets`, copied at build time into a git-ignored `public/pixel-agents/`.
- The copied `index.html` receives one `<script>` tag before the module script. That script defines `acquireVsCodeApi()` and forwards `postMessage` to the parent frame.
- Upstream uses the same host pattern: its VS Code host reads and rewrites the built `index.html` (`adapters/vscode/PixelAgentsViewProvider.ts:1052-1058`).
- This is classified as a **host adapter**, not a patch of upstream code. No upstream source file and no built JS/CSS file is edited.
- PNG decoding to hex arrays is new application code built on native browser APIs (`createImageBitmap` + canvas `getImageData`). Upstream's `pngjs` decoder is neither copied nor added (Constitution XI).

**Finding F008-005 (absolute font URL)**.
- `index.css` loads its pixel font from the absolute path `/fonts/FSPixelSansUnicode-Regular.ttf` (`webview-ui/src/index.css:3-8`). Served under `/pixel-agents/`, that path resolves to `/fonts/…` on our origin.
- Impact: a same-origin 404 and a fallback font. Nothing goes off-site.
- Adaptation: if the font file exists in `dist/webview`, the copy step also places it at the same absolute path under `public/`. That one file, never the whole `public/fonts/` directory, is git-ignored and vercel-ignored (analyze M7).
- To verify at Checkpoint C0 after install. Whether the built CSS still carries the absolute path cannot be seen without the tarball.

**C0 update (T014–T017, installed artifact)**:
- **F008-005 is resolved.** The built CSS uses the relative `url(../fonts/FSPixelSansUnicode-Regular.ttf)`
  and ships the font, unlike the source CSS read above.
- **F008-007 (new).** `sandbox="allow-scripts"` needs `Access-Control-Allow-Origin: *` on
  `/pixel-agents/*`, because the upstream `index.html` uses `crossorigin`. With the header, the
  sandboxed frame boots and cannot reach the parent (`SecurityError`). Without the sandbox, the
  frame can reach the parent. Details are in verification.md, C0.

**F008-011 (resolved by product decision D5)**.
- The unmodified upstream canvas has a persistent rendering cost while it is visible and animating.
  In Playwright Chromium (software rendering) it stays about 9–10 % at or below 480×320, as a
  per-frame floor. Under an active run it measured +11.72 to +14.95 pp against the original ≤ 10 pp
  budget. In headed Chrome, the sandboxed out-of-process iframe's main thread was about 12.8 % busy.
- The resolution: an explicit on-demand canvas, off by default, run-scoped and visibility-scoped,
  at 480×320, and text-only under reduced motion.
- Known limitation: the explicitly enabled Pixel mode uses measurable rendering resources
  (SC-014b2, `KNOWN_UPSTREAM_COST`).

**Finding F008-006 (no reduced-motion support)**.
- The webview contains no `prefers-reduced-motion` handling (grep over `webview-ui/src`: 0).
- Adaptation: when reduced motion is preferred, the host does not mount the iframe, and the canonical text panel carries every state (FR-030).
- No upstream change.

## R6. React / Next.js integration

- **Client boundary**: one new client component, `components/ExecutionView.tsx` (`'use client'`), placed in `app/page.tsx` next to the existing status table. It is the only React owner of the observer and the iframe.
- **Fixed files**: `components/Boot.tsx` and `src/main.ts` are unchanged (`Boot.tsx` is a protected hash).
- **Strict Mode**: in development the effect runs mount → cleanup → mount. The cleanup disconnects the MutationObserver, removes the `message` listener and removes the iframe, so at most one subscription and one iframe survive (FR-022). It cannot start a run: the only trigger stays the `#run` click handler registered by `src/main.ts`.
- **Isolation**: the iframe has its own document, React 19 copy and rAF loop.
  - A crash inside it cannot throw into `src/main.ts` (FR-019).
  - The host wraps its `postMessage` calls and reducer in try/catch. A visualization error is logged once and switches the view to text-only.
- **Same-origin reach (analyze M6)**:
  - A same-origin, unsandboxed iframe could technically reach `parent.document` and press `#run`. Policy alone ("the host ignores requests") does not enforce the visualization-only boundary.
  - Required at C0:
    - a grep of the built webview JS for `parent.`, `top.`, `opener` and `document.domain`
    - a spike with `sandbox="allow-scripts"` (opaque origin; messages validated by `event.source === iframe.contentWindow`, and `postMessage` target origin `'*'` because an opaque frame has no origin)
  - If the webview works sandboxed, the sandbox is adopted. Otherwise the finding is recorded, the unsandboxed same-origin iframe is used, and the grep result is the evidence.
  - Either way, a browser test clicks the webview's own controls ("+ Agent", Settings) and asserts graph runs 0, `/api/market` requests 0 and model requests 0.
- **`ROLES` import weight (analyze M1)**:
  - `src/graph/trading-graph.ts` evaluates `@langchain/langgraph/web` and `@langchain/core/messages` imports and `Annotation.Root(...)` at module load. No graph is built until `buildTradingGraph` is called (`src/graph/trading-graph.ts:7-22, 72`).
  - A static import from a `'use client'` component would also be evaluated during server prerender, and could put LangGraph into the view's client chunk.
  - "It is just a constant" is therefore not assumed. Checkpoint B records the module's top-level statements, a passing `next build` prerender, and the client chunk sizes.
  - If any of these is a problem, `ExecutionView` loads `src/view/*` through a dynamic `import()` inside `useEffect` (the `Boot` pattern). Production graph files are not moved or refactored.
- **Main thread**: an iframe, sandboxed or not, shares the renderer main thread with the page. Its cost is measured in SC-014b (R7), not assumed.
- **Reduced motion**: decided once at mount from `matchMedia('(prefers-reduced-motion: reduce)')`. The iframe is never created under `reduce`, rather than being created and hidden. A preference change after mount takes effect at the next mount; this limit is documented, not handled (analyze L5).
- **Assets and network**: everything is served from the app's own origin. The production webview makes no `fetch` (`browserMock` is dev-only) and has no telemetry (grep `analytics|posthog|sentry|telemetry` over `webview-ui/src`: 0). Browser tests assert 0 off-origin requests (SC-016).
- **Removal**: deleting the `<ExecutionView />` line leaves the page exactly as it is today (FR-023). A `?viz=off` query also disables it for the ON/OFF comparisons.

## R7. Deterministic testing

| Level | What | How | Model / network |
|---|---|---|---|
| L1 (node:test) | reducer | committed synthetic traces in `test/fixtures/execution-traces/*.json`, the 12 traces of data-model.md (the FR-027 set plus the analyze repairs); each trace has an expected view-state sequence; replayed twice → identical | 0 / 0 |
| L1 | Pixel adapter | the same traces → `ServerMessage[]`; asserts deterministic seats, palettes and labels, and that no activity is sent for queued/not run | 0 / 0 |
| L1 | observer mapping | the pure DOM-mutation-to-event mapper, fed synthetic mutation records (no DOM library) | 0 / 0 |
| L3 (Playwright, stand-in) | end-to-end | fixture and live-stub runs with the view on and off (evidence equality, SC-002/012); cancel; Strict Mode dev (SC-007); 10 runs (SC-014a); off-origin requests 0 | stand-in / stub |
| Native gate | regression | native + fixture with the default text view, plus one run with Pixel Agents explicitly enabled (D5); the existing lifecycle assertions | native |

Role failure in the browser: the stand-in fails a prompt containing `STANDIN_FAIL` (`test/standin.ts:32`),
but no existing path injects it into one role's prompt. Role-failure behavior is therefore checked by
synthetic traces (SC-004), plus the existing `createRuntime` failure run. No production test hook is added.

**SC-014b harness** (the original always-on criterion, SUPERSEDED by D5; the same harness now measures SC-014b1 = the default view against `?viz=off`, and SC-014b2 = Pixel enabled; see verification.md):
- Setup: one production build, one browser process, and the same page opened alternately with
  `?viz=off` (no observer, no iframe) and with the view on (observer, text panel, iframe).
- Replay: the committed `success` trace is replayed as the same DOM writes `src/main.ts` performs,
  by a test-only script, over a fixed 10 s interval.
- Exclusions: no run, no model and no acquisition take part, so setup, build and inference are
  excluded.
- Metric per repetition: `busyRatio = ΔTaskDuration / replayWall`, where `ΔTaskDuration` is the
  Chrome DevTools Protocol `Performance.getMetrics` `TaskDuration` delta. The metric is read once
  before and once after the replay, so the measurement itself is negligible.
- Repetitions: at least 5 per condition.
- **Criterion (D3): the median main-thread busy-ratio increase is ≤ 10 percentage points.** All raw
  samples are kept.

## R8. Instrumentation point

The truth that already exists (`src/main.ts` at `07f8f34`):
- Roles: `buildTradingGraph(model, onNode)` reports `start`/`done`/`error` per node. The callback
  writes `#node-<name>` as `running`/`done`/`error` (`src/main.ts:235-238`).
- Runtime: a 50 ms ticker writes `#runtime` `data-state`, `data-active` and `data-queued` (`:212-216`).
- Run: `run()` writes `#status` (`running…`, then `done: <class> · <outcome>`) and `#evidence`, the
  final record with `outcome`, `failure.boundary`/`stage` and `nodes` (`:87-88, 146-149`).

All three writes already exist and are covered by browser tests.
- The role and runtime writes sit inside `runGraph`, the protected lifecycle section
  (`awk '/^async function runGraph/,0' src/main.ts`, hash `922db752…`).
- The graph and the bridge (`src/graph/*`, `src/integration/*`) are protected files.

| Option | Execution code changed | Protected hash | Result |
|---|---|---|---|
| **E1 — observe the existing status surface (chosen)**: a MutationObserver on `#status`, `#node-*`, `#runtime`, `#evidence` maps each write to an `ExecutionEvent` | **0 lines** | all unchanged | Roles, run, stage (from the final record) and runtime state are covered. Each text assignment yields its own mutation record, in order, so no transition is lost. Runtime state is sampled at the ticker's 50 ms, within SC-013's 1 s. Transition values are read from each record's added text nodes, not from the element's current value (analyze H1) |
| E2 — add an emitter call inside `runGraph` / the node callback | a few lines | `runGraph` hash changes | Hits the stop condition. Needs a finding and maintainer approval; gives nothing E1 lacks |
| E3 — pass the role into the bridge so each AkariSP request is tagged | graph + bridge + `runGraph` | several change | Needed only for role-level `queued`/`inferring`; see F008-O1 |

**Finding F008-O1 (role ↔ request attribution; dogfooding observation, not an AkariSP finding)**.
- The bridge numbers requests (`logicalRequestId`) but does not know which node called it
  (`src/integration/akari-chat-model.ts:38-41`). AkariSP is role-agnostic by design (Constitution III).
- During fan-out, the order of the two analysts' `_call`s is not provably the order of their node
  `start` events.
- Attribution therefore needs E3, which changes protected files.
- Decision for Feature 008: **no attribution**. FR-011 applies: both analysts show `working (graph)`
  and the runtime panel shows `active 1 · queued 1`. The spec accepts this outcome.
- AkariSP is not changed and no `roleId` is added anywhere near it. If attribution is wanted later,
  the path is application-side (E3): graph metadata → bridge → a request-to-role map owned by the
  application.

**Finding F008-O2 (runtime observability; dogfooding observation)**.
- AkariSP exposes state only through `snapshot()`, with no change notification. The page already
  polls it every 50 ms.
- Feature 008 reuses that poll's output and adds no second poller.
- Recorded as a dogfooding data point for AkariSP (Constitution V). No change is proposed.

**Hidden coupling (acknowledged, analyze L6)**. The observer depends on the element ids and the
literal texts `running`, `done`, `error`, `running…` and `done: …` written by `src/main.ts`. Any change
there breaks the view, and the browser tests detect it. This is a Feature 008 adapter dependency, not
a contract that `src/main.ts` must honor.

**Stop condition check**: E1 needs no change to `runGraph`, AkariSP, the graph or the bridge. The stop
condition is not triggered.

## Decisions summary

| Decision | Chosen | Rationale | Alternatives rejected |
|---|---|---|---|
| Upstream | `pixel-agents-hq/pixel-agents` @ `3537e140` (v1.4.1), MIT | canonical, not a fork | community forks (`rolandal/pixel-agents-standalone`, and others) |
| Consumption | npm `pixel-agents@1.4.1` **devDependency**; its `dist/webview` + `dist/assets` copied at build into git-ignored `public/pixel-agents/`, embedded as an iframe | the only published consumable form; 0 upstream edits; isolation | component import (impossible); vendoring into git (copies upstream); WebSocket host; fork |
| Host transport | `acquireVsCodeApi` shim (our file) + `window.postMessage` | upstream's own postMessage path | WebSocket mode |
| Event source | E1: observe the existing status surface | 0 execution-code change, protected hashes intact | E2, E3 |
| Canonical state display | BrowserTradingAgents text panel from the same view state | the canvas vocabulary is too small (F008-002); accessibility; reduced motion (F008-006) | canvas-only |
| Role-level queued/inferring | not shown (FR-011 path) | not attributable without protected changes (F008-O1) | guessing from FIFO order |
| Sprite decoding | native `createImageBitmap` + canvas | no dependency, no copied code | `pngjs` |
