# Implementation Plan: Feature 009 — JRPG Fullscreen Shell, Portfolio Onboarding and Own Pixel Renderer

**Branch**: `009-jrpg-portfolio-onboarding` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-jrpg-portfolio-onboarding/spec.md`

## Summary

Wrap the existing page in a fullscreen JRPG shell. First visit → Korean onboarding that stores a
portfolio in `localStorage`; later visits → a fullscreen office drawn by a small own canvas renderer from
the unchanged Feature 008 view state, with a Korean dialog box narrating transitions. Stocks are chosen
from a directory that `GET /api/directory` builds at most once per Seoul day from data.go.kr (Korea, keyed)
and the Nasdaq Trader symbol files (US, keyless); the browser keeps the last complete copy in Cache
Storage and searches it in memory. The Feature 008 Pixel Agents iframe path is retired; its npm package
stays only as the local source of temporary art. `src/main.ts`, the graph and AkariSP do not change.

## Technical Context

**Language/Version**: TypeScript (strict), Node ≥ 22 (existing)

**Primary Dependencies**: existing only — Next.js 16.3.6 App Router, React 19.3.0; `pixel-agents@1.4.1`
kept as a devDependency for art only. New dependencies: 0 (font committed as a file, R6)

**Storage**: browser `localStorage` (portfolio), browser Cache Storage (directory copy), server process memory (directory cache)

**Testing**: `node --test` L1 (pure: portfolio validation, search, parsers, narration, scene), Playwright
(controlled directory stub, onboarding, office, privacy, overhead), installed-Chrome native gate

**Target Platform**: Chrome desktop and phone width; Next.js server (local; public deployment deferred)

**Project Type**: web application (existing single Next.js app)

**Performance Goals**: office ≤ 2 pp busy-ratio over `?viz=off` (SC-008); search ≤ 100 ms per keystroke over the full directory (SC-003); office visible ≤ 2 s after interactive (SC-002)

**Constraints**: holdings never leave the browser; ≤ 1 source refresh per day per server instance; real
source requests only with maintainer approval; no committed upstream art; protected hashes unchanged

**Scale/Scope**: ~20–25k directory rows (KR ≈ 4k incl. ETF/ETN, US ≈ 12k); ≤ a few hundred holdings

## Constitution Check

| Principle | Check | Status |
|---|---|---|
| I Dogfood before abstraction | No renderer engine, no storage layer, no provider registry; two fixed sources in one module | PASS |
| II Deterministic fixtures first | Directory parsers tested on committed fake source files; e2e through a local stub; real sources only at an approval gate | PASS |
| III / IV Orchestration / inference lifecycle | Graph, `src/main.ts`, `runGraph`, AkariSP untouched; office is read-only | PASS |
| V Evidence before core change | AkariSP changes 0 | PASS |
| VI Browser first | Office, storage, privacy and overhead proven in browser tests; native gate re-run | PASS |
| VII Reproducible runs | Evidence and replay unchanged (FR-013) | PASS |
| VIII No trading-quality claims | No prices, no P&L, no advice; results window keeps the statement | PASS |
| IX External data deferred | New external data: directory listings only (data.go.kr, Nasdaq Trader — neither listed in IX); no broker, exchange or price API. Real requests gated by maintainer approval as in Feature 007 (R-L1) | PASS with approval gate |
| X Thin boundaries | No change to the bridge | PASS |
| XI Reference semantics | TradingAgents semantics untouched; no upstream Pixel Agents code copied (art files only, local) | PASS |
| XII Findings before fixes | P-1 (FR-016 exchange list), F009-R1 (type heuristics) recorded | PASS |
| XIII Inference tiers | unchanged | PASS |

Post-design re-check: unchanged — PASS.

## Design decisions

- **D1 Shell and status surface** (R10): `app/page.tsx` renders `<Shell>` around the existing markup. Every
  element id `src/main.ts` uses stays in the DOM. HUD (always visible in the office): availability, mode,
  `#status`, Run, Cancel, runtime line, buttons for 포트폴리오 / 결과 / 상태. `#result`, `#market`, `#evidence`,
  `#replay` and the advice statement live in the 결과 `<dialog>`; the eight-row table and the Feature 008
  text panel in the 상태 `<dialog>` (also exposed to assistive tech via the office name tags).
- **D2 First-visit decision** (contracts/portfolio-storage.md): synchronous `localStorage` read in the
  client shell; server render shows nothing until the client decides (one frame).
- **D3 Directory** (contracts/directory-api.md, R1/R2/R4): `app/api/directory/route.ts` + `src/directory/server.ts`
  (fetch, parse, cache) + `src/directory/parse.ts` (pure parsers) + `src/directory/client.ts` (Cache Storage, search).
- **D4 Office** (contracts/office-view.md, R8): `components/Office.tsx` (canvas + tags + dialog box),
  `src/view/office-scene.ts` (data), `src/view/narration.ts` (pure).
- **D5′ Visualization default** (MD-4): office on by default; the Feature 008 toggle, iframe, adapter,
  decoder, shim, CORS header and webview copy are removed (FR-031).
- **D6 Art** (MD-6, R7): `scripts/copy-office-art.mjs` replaces `copy-pixel-agents.mjs`; target
  `public/office-art/` (git/vercel-ignored); pinned inventory; no copy on Vercel.
- **D7 Font** (R6): Galmuri11 woff2 + OFL.txt committed in `public/fonts/`; acquisition is an approval task.
- **D8 Tests**: Playwright default `storageState` seeds a finished portfolio (R11). The market stub
  (`e2e/market-stub.mjs`) gains directory routes (`/1160100/...`, `/dynamic/SymDir/...`) and counters; the
  app server gets both base-URL seams and a fake key.

## Checkpoints (for /speckit-tasks)

- **A Baseline**: record hashes, test counts; typecheck/build/tests green.
- **B Retire Pixel path**: remove FR-031 items and their tests; replace copy script (D6); suites green.
- **C Office**: scene, narration (L1 over all 13 traces), `Office.tsx` inside `ExecutionView`; overhead gate SC-008.
- **D Shell + portfolio**: shell, onboarding, portfolio window, storage, privacy sentinel test; existing suites green with seeded state.
- **E Directory**: parsers (L1, fake files), server cache + route (stub, counts, single flight, stale, 503, credential-missing), client cache and search (SC-003, SC-006).
- **F Font + a11y**: APPROVAL REQUIRED font download; Hangul coverage scan; keyboard and reduced-motion tests; 375 px.
- **G Regression**: typecheck, build, `npm test`, `test:browser`, dev smoke, native fixture gate (installed Chrome).
- **H APPROVAL REQUIRED real sources**: one refresh per source with the maintainer's key in server env; record counts and statuses, no raw bodies committed. Not required for IMPLEMENTATION_COMPLETE.
- **I Docs**: roadmap (MD-2, MD-4, MD-5, MD-6), testing.md, verification.

## Project Structure

### Documentation (this feature)

```text
specs/009-jrpg-portfolio-onboarding/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── directory-api.md
│   ├── portfolio-storage.md
│   └── office-view.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
app/
├── page.tsx                      # wraps existing markup in <Shell>
└── api/directory/route.ts        # new
components/
├── ExecutionView.tsx             # Pixel lifecycle removed; renders <Office view=…/>
├── Office.tsx                    # new
├── Shell.tsx                     # new: first-visit decision, HUD, dialogs
└── Portfolio.tsx                 # new: onboarding + portfolio window form
src/
├── portfolio.ts                  # new: types, validation, load/save/reset
├── directory/{parse,server,client}.ts   # new
└── view/
    ├── office-scene.ts           # new
    ├── narration.ts              # new
    ├── pixel-adapter.ts          # removed
    └── pixel-assets.ts           # removed
public/
├── fonts/Galmuri11.woff2, OFL.txt       # new (approval)
├── office-art/                   # generated, ignored
└── pixel-agents/                 # removed (incl. bta-host-shim.js)
scripts/copy-office-art.mjs       # replaces copy-pixel-agents.mjs
next.config.ts                    # scoped CORS header removed
test/{portfolio,directory,narration}.test.ts, test/fixtures/directory/*   # new
e2e/{onboarding,office,directory}.spec.ts; market-stub.mjs (+directory routes); execution-view.spec.ts, view-overhead.spec.ts, prompt-api.spec.ts (Pixel cases retired)
```

**Structure Decision**: the existing single Next.js app; new code sits beside the Feature 007/008 modules.

## Complexity Tracking

None.
