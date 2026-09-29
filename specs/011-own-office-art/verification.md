# Verification: Feature 011 — Own Office Art

## T001 — Baseline (2026-09-30)

| Item | Value |
|---|---|
| Base | `main` `59413a6` (merge of PR #11), branch `011-own-office-art` |
| sha256 `components/Office.tsx` | `cac32c06f2a069326fc08eaddd1327012d65a38e88223d976ad19220e69d587a` |
| sha256 `src/view/view-state.ts` | `c05eb1ad901514df6b909de44c8a20e65cdcf2db1e1d74e3ec7e42c369c54c01` |
| sha256 `src/view/narration.ts` | `634016d03ff5ca80b454073b3ac7e4ecd83f4ad72f00c7691acbd94e85cad46f` |
| AkariSP | `0.1.0-alpha.2`; public API boundary unchanged and not touched by this Feature |
| `npm run typecheck` | 0 |
| `npm test` | 162 tests: 161 pass, 1 skipped |
| `npm run test:browser` | 75 passed, 1 skipped (real Yahoo L4); SC-008 office overhead +0.87 pp |

## Implementation (T002–T020)

- Generator `scripts/build-office-art.mjs` (Node `zlib` only; no new dependency): 19 PNGs in `public/office/`
  from 13 maps + palette + 8 outfits in `art/office/`. `--check` passes; repeated generation is byte-identical.
- Scene data only (`src/view/office-scene.ts`): `ART = '/office/'`; 8 sheets (48×32, `stand 0`, `work [1, 2]`),
  `hueShift` 0; `SPRITES` same keys, new files. Layout numbers unchanged (sizes match the retired sprites).
- Provenance: `art/office/PROVENANCE.md`, one row per PNG (19), author "drawn in this repository for the
  maintainer (authored with Claude Code)", licence status "no licence granted yet; the repository has no licence
  file — maintainer decision".
- Retired: `scripts/copy-office-art.mjs`, `predev`/`prebuild`, the copy in the Playwright webServer command, the
  `pixel-agents` dependency (`npm uninstall --offline`: 81 packages removed from the lock file, no download). The
  local `public/office-art/` was deleted before the regression run; it stays ignored as a guard.

## T013, T019, T021 — Regression

| Check | Result |
|---|---|
| `npm run typecheck` | 0 |
| `npm test` | 166 tests: 165 pass, 1 skipped (new: `test/office-art.test.ts`, 4 tests). One earlier full run showed `fail 1` that was not reproduced: each file alone and three further full runs passed |
| `npx next build` | 0 |
| `npm run test:browser` (without `public/office-art/`) | **76 passed, 1 skipped**; new check: 0 requests outside `/office/` for office art during load and a stand-in run (FR-001, SC-002) |
| SC-008 office overhead | **+0.87 pp** (baseline +0.87 pp; budget ≤ 2 pp) |
| SC-005 sha256 after | `Office.tsx`, `view-state.ts`, `narration.ts`: **identical to T001** |
| Diff scope | scene data, art, provenance, generator (+ `.d.mts` types for the test), tests, `package.json`/lock, Playwright config, ignore files, docs |

- Note: `components/Office.tsx` still carries the comment "Art is temporary (MD-6)"; left unchanged so the
  renderer hash stays identical (SC-005). Candidate one-line clean-up in a later change.

## T022 — F008-L1

- **F008-L1 CLOSED** (2026-09-30): no upstream Pixel Agents art is referenced, served, copied or tracked; the office
  uses own art with a provenance row per file (`art/office/PROVENANCE.md`). Public deployment remains a separate
  maintainer decision (FR-010); the repository still has no licence file.

## T023 — SC-004 manual check

- Preview of the office (idle and working states, composed from the generated PNGs and the scene numbers) sent to
  the maintainer; verdict (2026-09-30): **PASS** — all eight roles distinguishable, working vs idle distinguishable.
