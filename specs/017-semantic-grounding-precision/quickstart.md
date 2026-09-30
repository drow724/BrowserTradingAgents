# Quickstart: Feature 017 — Semantic Grounding Precision

1. `npm test` — development set and fixture D (expected vs actual per variant, summary table), fixtures A–C 26 / 26,
   existing grounding tests.
2. `node scripts/rescore-measurement.ts specs/013-numbers-by-reference/evidence/measurement-native-refs.json out.json`
   — re-score of recorded answers with the new rules (repeat for current and formatted).
3. Held-out capture (maintainer, installed Chrome with the Prompt API, ≈ 2 h, after the rules are frozen):
   `BTA_MEASURE=1 BTA_MEASURE_MODES=refs,current BTA_MEASURE_REPS=2 npm run test:prompt-api -- -g measurement`
4. `node scripts/audit-sheet.ts <report> <sheet.json>` → judge every item blind → record the sheet's sha256.
5. `node scripts/precision.ts <report> <sheet.json> out.json` — precision, recall, threshold met / not met.

Expected: development false mismatches ≤ 5 with both real errors flagged (SC-001); fixtures A–C 26 / 26 (SC-003); every
valuation and long-term judgement in the 24 development sentences UNSUPPORTED (SC-004); the held-out report states the
threshold result with counts (SC-002).
