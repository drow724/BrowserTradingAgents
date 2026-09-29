# Research: Feature 011 — Own Office Art

## R1 — Art source format

- **Decision**: one text pixel map per image: one character per pixel, `.` transparent, other
  symbols looked up in a shared palette. Characters use palette *slots* (hair, skin, shirt, trousers)
  filled per role from `characters.txt`.
- **Rationale**: diffable and reviewable in a PR; authorable without an image editor; one body map
  gives eight consistent characters (FR-003) with no hue filter.
- **Alternatives**: hand-edited PNGs (not reviewable as text, provenance weaker); drawing from maps at
  runtime (would change the renderer, FR-007); SVG (not pixel art at this scale).

## R2 — PNG generation

- **Decision**: `scripts/build-office-art.mjs` writes RGBA PNGs with Node's `zlib.deflateSync` and
  `zlib.crc32` (available in the installed Node 23.9); fixed deflate level; no metadata chunks.
  `--check` regenerates in memory and fails on any byte difference.
- **Rationale**: zero new dependencies (ladder rung 3); byte-deterministic, so the committed PNG is
  provably the map's output.
- **Alternatives**: `pngjs`/`sharp` (new dependency for ~30 lines); canvas in a browser (not
  scriptable in `node --test`).

## R3 — Sizes and layout

- **Decision**: keep today's sizes: characters 16×32 frames; desk 48×32; screen 16×32; whiteboard,
  painting, bookshelf 32×32; clock and small plant 16×32; large plant 32×48. Positions in
  `office-scene.ts` stay; only paths and the sheet geometry change.
- **Rationale**: layout numbers and the e2e seat check (`DESKS`, `SEAT`) remain valid; SC-005 diff
  stays minimal.
- **Sheet**: 48×32, frames `[stand, work1, work2]` in row 0 (`frameW 16, frameH 32, row 0, stand 0,
  work [1, 2]`). Only facing down is drawn (spec Out of Scope).

## R4 — Eight distinct roles

- **Decision**: eight sheets, one per role (8 outfits: hair and shirt colours differ pairwise); scene
  data `character(i)` returns sheet `i` with `hueShift: 0`.
- **Rationale**: FR-003 without the hue filter; the renderer's filter code stays (unchanged) and is
  simply given 0.

## R5 — Removing the temporary copy

- **Finding**: `pixel-agents` is used only by `scripts/copy-office-art.mjs` (grep of `src`,
  `components`, `app`, `scripts`, `e2e`, `test`, `package.json`).
- **Decision**: delete the script and the `predev`/`prebuild` hooks, uninstall the dependency
  (`package-lock.json` updates; no download). Output folder is `public/office/`, so a stale
  `public/office-art/` copy is never read; the ignore entries stay as a guard.

## R6 — Provenance record

- **Decision**: `art/office/PROVENANCE.md`, one table row per `public/office/*.png`: file, source map,
  author ("BrowserTradingAgents maintainers; drawn in this repository"), licence status ("no licence
  granted yet; repository has no licence file — maintainer decision"), date. A unit test checks the rows
  and the files match one to one.
- **Rationale**: FR-005 records the status as it is without a legal conclusion.

## R7 — Verification of looks

- Automated: office ready, eight seated characters, pairwise-different sheets (unit test compares the
  generated character PNGs), overhead budget.
- Manual (SC-004): maintainer screenshot review of idle and working states.
