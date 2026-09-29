# Data Model: Feature 011 — Own Office Art

## Pixel map (`art/office/<name>.txt`)

- Rows of equal length; width × height must equal the target size (research R3), else the generator fails.
- `.` = transparent; any other symbol must exist in the palette (or, for the character map, be a slot
  symbol); unknown symbols fail the generator.
- Character map: three frames of 16×32 separated by a blank line → one 48×32 sheet.

## Palette (`art/office/palette.txt`)

- One entry per line: `<symbol> #rrggbb`. Symbols are single printable characters, unique.
- Slot symbols (character only): `H` hair, `S` skin, `C` shirt, `T` trousers.

## Outfit (`art/office/characters.txt`)

- Eight lines, role order (ROLES): `<index> H=#rrggbb S=#rrggbb C=#rrggbb T=#rrggbb`.
- Rule: every pair of outfits differs in at least H or C (FR-003).

## Generated image (`public/office/*.png`)

- RGBA, deterministic bytes; names: `char-0..7.png`, `desk.png`, `pc-off.png`, `pc-on-1..3.png`,
  `board.png`, `painting.png`, `clock.png`, `shelf.png`, `big-plant.png`, `plant.png`.

## Provenance row (`art/office/PROVENANCE.md`)

- `| file | source | author | licence status | recorded |` — exactly one row per generated image.
