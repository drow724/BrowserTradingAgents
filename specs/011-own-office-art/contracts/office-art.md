# Contract: office art ↔ scene data

The renderer (`components/Office.tsx`) is unchanged and reads only `src/view/office-scene.ts`.
This Feature changes the values, not the shape, of that module's exports.

| Export | Before | After |
|---|---|---|
| `ART` | `/office-art/` (ignored local copy) | `/office/` (committed) |
| `SheetLayout` | `frameW 16, frameH 32, row 0, stand 1, work [3, 4]`, 6 sheets | `frameW 16, frameH 32, row 0, stand 0, work [1, 2]`, 8 sheets |
| `character(i)` | sheet `i % 6`, `hueShift` 180 for i ≥ 6 | sheet `i`, `hueShift` 0 |
| `SPRITES` keys | desk, pcOff, pcOn1–3, board, painting, clock, shelf, bigPlant, plant | same keys, new paths |
| `PC_ON`, `DESKS`, `SEAT`, `PC`, `TAG`, `DECOR`, `ROOM`, `WORLD` | — | unchanged |

Guarantees:

- Every path in `SPRITES` and every sheet `src` exists in `public/office/` and in `PROVENANCE.md`.
- Image sizes match research R3, so `DECOR`/`DESKS` positions keep their meaning.
- A missing file still yields `data-office="unavailable"` (Feature 009 FR-029).
