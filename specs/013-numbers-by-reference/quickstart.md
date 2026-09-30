# Quickstart: Feature 013 validation

1. **Checker** — `npm test` (labelled claims, formatter, references); `node scripts/rescore-measurement.ts
   specs/010-portfolio-grounded-analysis/evidence/measurement-native-2026-09-29-59413a6.json` → old / new / hand table.
2. **Modes** — `npm run dev`, `/?provider=standin&numbers=refs`: load the example portfolio, ask "비트코인 지금 들고
   있어도 될까요?"; the answer window shows rendered values with their fact ids and any "형식 위반".
3. **Stand-in comparison** — `npm run test:browser` (three modes, deterministic, `NOT_APPLICABLE`).
4. **Native comparison** (opt-in, ≈ 4.3 h) —
   `BTA_MEASURE=1 BTA_MEASURE_MODES=current,formatted,refs npm run test:prompt-api -- -g measurement`.
5. **Hand audit** — label ≥ 20 answers per mode into `evidence/hand-audit-<mode>.json`; agreement in verification.
