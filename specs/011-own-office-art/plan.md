# Implementation Plan: Feature 011 — Own Office Art

**Branch**: `011-own-office-art` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-own-office-art/spec.md`

## Summary

Replace the local-only upstream sprites with the project's own pixel art. Each image is written as a
text pixel map (`art/office/*.txt`) and turned into a committed PNG under `public/office/` by one
dependency-free, deterministic script. Only scene data (`src/view/office-scene.ts`) points at the new
files; the renderer (`components/Office.tsx`), the view state and the narration are untouched. The
copy step and the `pixel-agents` dependency are removed. A provenance record lists every file.

## Technical Context

**Language/Version**: TypeScript (Next.js 16.3.6, React 19.3.0); Node 23.9 for scripts

**Primary Dependencies**: none new. The generator uses Node's built-in `zlib` (`deflateSync`, `crc32`)
to write PNGs (research R2)

**Storage**: committed files — `art/office/` (source maps), `public/office/` (generated PNGs)

**Testing**: `node --test` (generator check: committed PNGs equal a fresh generation; provenance covers
every PNG), Playwright (existing office, a11y and view-overhead specs with updated paths)

**Target Platform**: browser; the same files are served locally and on the deployment platform

**Project Type**: web application (single Next.js project)

**Performance Goals**: Feature 009 SC-008 budget (office view ≤ 2 pp median busy-ratio increase) holds

**Constraints**: same sprite sizes and positions as today (research R3), so layout numbers stay; no
download; no third-party art; renderer and view state unchanged (FR-007)

**Scale/Scope**: 8 character sheets (48×32, three 16×32 frames) + 11 furniture/decoration images

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I Dogfood / IV AkariSP lifecycle / V core change | No AkariSP, graph or runtime change | PASS (not touched) |
| II Deterministic fixtures | Generator output is byte-deterministic; a test regenerates and compares | PASS |
| III Application owns orchestration | Not touched | PASS |
| VI Browser first | Static images served by the app; no server logic | PASS |
| VII Reproducible runs | Run records unchanged; art source is reproducible | PASS |
| VIII No trading-quality claims / IX External data | No data, no claims, no download | PASS |
| X Thin boundaries | Scene data remains the only seam between art and renderer (Feature 009 FR-027) | PASS |
| XII Findings before fixes | Anything the renderer would need to change is recorded as a finding, not patched | PASS |

Post-design re-check: unchanged — PASS.

## Project Structure

### Documentation (this feature)

```text
specs/011-own-office-art/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/office-art.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
art/office/
├── palette.txt                  # symbol → colour, shared by all maps
├── character.txt                # one body, three 16×32 frames; hair/skin/shirt/trousers as palette slots
├── characters.txt               # eight outfits: slot → colour per role
├── desk.txt  pc-off.txt  pc-on-1..3.txt  board.txt  painting.txt  clock.txt  shelf.txt
├── big-plant.txt  plant.txt
└── PROVENANCE.md                # one row per generated file: path, source map, author, licence status
scripts/build-office-art.mjs     # maps → public/office/*.png; `--check` fails if the committed PNGs differ
public/office/                   # committed PNGs (new name; the ignored public/office-art/ is never read)
src/view/office-scene.ts         # ART path, sheet geometry (3 frames), 8 sheets, hueShift 0 — scene data only
test/office-art.test.ts          # --check passes; every PNG has a PROVENANCE row and vice versa
e2e/office.spec.ts, e2e/analysis.spec.ts   # '/office-art/' → '/office/' in routes and request filters

removed: scripts/copy-office-art.mjs, predev/prebuild entries, "pixel-agents" dependency
kept:    public/office-art/ in .gitignore/.vercelignore (comment updated) so a stale local copy is never
         committed or uploaded
```

**Structure Decision**: single project; art source under a new top-level `art/`, output under
`public/office/`.

## Complexity Tracking

No constitution violations.
