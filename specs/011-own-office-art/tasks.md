---
description: "Task list for Feature 011 — Own Office Art"
---

# Tasks: Feature 011 — Own Office Art

**Input**: Design documents from `specs/011-own-office-art/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/office-art.md, quickstart.md

**Tests**: included — the spec's success criteria (SC-001–SC-003, SC-005) are verified by automated checks.

**Gate**: no build, test or dev server in this checkout while the Feature 010 native measurement (T041) runs.

## Phase 1: Setup

- [X] T001 Record the baseline in specs/011-own-office-art/verification.md: `main` SHA, sha256 of components/Office.tsx, src/view/view-state.ts and src/view/narration.ts (SC-005 reference), the consumed AkariSP version (0.1.0-alpha.2) and its public API boundary (unchanged, not touched by this Feature), and `npm run typecheck`, `npm test`, `npm run test:browser` results before any change

## Phase 2: Foundational (generator)

- [X] T002 Write test/office-art.test.ts first (fails until T009): (a) `node scripts/build-office-art.mjs --check` exits 0; (b) a map whose rows differ in length, whose size differs from research R3, or that uses a symbol missing from the palette makes the generator fail with the file name; (c) generating the same map twice yields identical bytes
- [X] T003 Implement scripts/build-office-art.mjs: read art/office/palette.txt (`<symbol> #rrggbb`, single printable unique symbols; `.` = transparent) and each map in art/office/, validate per data-model.md, write RGBA PNGs to public/office/ with `zlib.deflateSync` (fixed level) and `zlib.crc32`, no metadata chunks; `--check` regenerates in memory and exits 1 on any byte difference, naming the file
- [X] T004 Create art/office/palette.txt with the shared colours plus the character slot symbols `H` hair, `S` skin, `C` shirt, `T` trousers

**Checkpoint**: the generator turns a map into a deterministic PNG.

## Phase 3: User Story 1 — The office with our own art (P1) 🎯 MVP

**Goal**: the office draws eight distinct roles, desks, screens and decoration from committed own art.

**Independent Test**: with `public/office-art/` deleted, open `/?provider=standin`, run the stand-in graph; office ready, working roles type with screens on.

- [X] T005 [P] [US1] Draw art/office/character.txt: three 16×32 frames (stand, work1, work2; facing the viewer, hands reaching forward in the work frames, alternating) separated by a blank line, using slots H/S/C/T → 48×32 sheet
- [X] T006 [P] [US1] Write art/office/characters.txt: eight lines in ROLES order, `<index> H=#rrggbb S=#rrggbb C=#rrggbb T=#rrggbb`; every pair differs in at least H or C (FR-003); generator emits public/office/char-0..7.png
- [X] T007 [P] [US1] Draw art/office/desk.txt (48×32), pc-off.txt, pc-on-1.txt, pc-on-2.txt, pc-on-3.txt (16×32 each; on-frames differ in screen content)
- [X] T008 [P] [US1] Draw art/office/board.txt, painting.txt, shelf.txt (32×32), clock.txt, plant.txt (16×32), big-plant.txt (32×48)
- [X] T009 [US1] Run `node scripts/build-office-art.mjs` to generate public/office/*.png (19 files: 8 characters + 11 furniture/decoration)
- [X] T010 [US1] Update scene data only in src/view/office-scene.ts per contracts/office-art.md: `ART = '/office/'`; 8 sheets `char-${i}.png` with `frameW 16, frameH 32, row 0, stand 0, work [1, 2]`; `character(i)` → sheet `i`, `hueShift: 0`; `SPRITES` same keys with new file names; replace the "temporary upstream art" comments
- [X] T011 [US1] Update test/narration.test.ts:78 to expect `/^\/office\//`; add to test/office-art.test.ts: every `SPRITES` path and sheet `src` exists under public/office/, and the eight character PNGs are pairwise different
- [X] T012 [US1] Update e2e/office.spec.ts:70 route to `**/office/**` and e2e/analysis.spec.ts:12 filter to `/office/`; add to e2e/office.spec.ts one check that no request path starts with `/office-art/` during load and a stand-in run (FR-001)
- [X] T013 [US1] Run `npm run typecheck && npm test && npm run test:browser`; record results in verification.md, including the Feature 009 SC-008 view-overhead result (≤ 2 pp) (SC-001, SC-003)

**Checkpoint**: office drawn from own art; old art unused.

## Phase 4: User Story 2 — Licence recorded, F008-L1 closable (P1)

**Goal**: one provenance row per art file.

**Independent Test**: test/office-art.test.ts provenance check passes.

- [X] T014 [US2] Write art/office/PROVENANCE.md: `| file | source | author | licence status | recorded |`, exactly one row per public/office/*.png; author "BrowserTradingAgents maintainers; drawn in this repository"; licence status "no licence granted yet; the repository has no licence file — maintainer decision"; recorded 2026-09-30 or the actual date
- [X] T015 [US2] Add to test/office-art.test.ts: PROVENANCE.md rows and public/office/*.png match one to one, and `git ls-files public/office-art` is empty (FR-005, SC-002)

## Phase 5: User Story 3 — Temporary copy retired (P2)

**Goal**: no copy step, no `pixel-agents` dependency.

**Independent Test**: install and build without the package; office ready.

- [X] T016 [US3] Delete scripts/copy-office-art.mjs; remove `predev` and `prebuild` from package.json; remove `node scripts/copy-office-art.mjs && ` from playwright.config.ts:38
- [X] T017 [US3] `npm uninstall pixel-agents` (updates package.json and package-lock.json; no download); confirm `grep -rn pixel-agents` finds nothing outside specs/ and docs history
- [X] T018 [US3] Update the comments in .gitignore and .vercelignore: `public/office-art/` stays ignored as a guard against committing or uploading a stale local copy of the retired upstream art
- [X] T019 [US3] Delete the local public/office-art/ and rerun `npm run build && npm run test:browser`; record in verification.md (SC-001)

## Phase 6: Polish & Cross-Cutting

- [X] T020 [P] Update docs/testing.md:161–163 (own art, generator, `--check`) and docs/roadmap.md (011 own office art; Effectiveness Benchmark moves to 012)
- [X] T021 Verify SC-005: sha256 of components/Office.tsx, src/view/view-state.ts and src/view/narration.ts equal T001; `git diff --stat main` lists only scene data, art, provenance, scripts, tests, configs and docs; record in verification.md
- [X] T022 Record F008-L1 in verification.md and specs/008-pixel-agents-execution-visualization/verification.md as CLOSED (upstream art removed; own art with provenance per art/office/PROVENANCE.md); public deployment remains a separate maintainer decision (FR-010)
- [X] T023 SC-004 manual check: screenshots of idle and working office sent to the maintainer; record the maintainer's verdict in verification.md

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 → US2 → US3 → Polish.
- US2 depends on US1's file list; US3 depends on US1 (office must no longer read the copy).
- T005–T008 are parallel (different map files); T009 needs T003–T008.

## Parallel Example: User Story 1

```text
T005 character.txt | T006 characters.txt | T007 desk/pc maps | T008 decoration maps
```

## Implementation Strategy

- MVP: Phases 1–3 (office on own art). Then US2 (provenance) and US3 (clean-up), then polish.
- Start implementation only after the Feature 010 native measurement finishes.
