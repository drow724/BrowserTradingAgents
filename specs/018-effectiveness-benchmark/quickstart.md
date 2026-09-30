# Quickstart: Feature 018

## 1. Plumbing (stand-in, no model)

- `npm test`: the single-role prompt reads all facts in both modes; report fields; seeded shuffle and key; the
  reliability agreement; the decision rule on synthetic values.
- `npm run test:browser`:
  - with `?roles=single&provider=standin`, one node runs, one model call is made, `structure: 'single-role'` is
    recorded and the answer is grounded;
  - without `roles`, the eight-role prompts are unchanged.

## 2. Freeze and pre-register

Record in `verification.md`, before any native answer:

- the checker hashes;
- the git revision;
- the spec's pre-registration section;
- the shuffle and sample seeds.

## 3. Native capture (maintainer, about 5.5–6 h, installed Chrome with the Prompt API)

```bash
BTA_MEASURE=1 BTA_MEASURE_STRUCTURES=eight,single BTA_MEASURE_MODES=refs,current BTA_MEASURE_REPS=5 npm run test:prompt-api -- -g measurement
```

Expected result:

- 20 per-repetition files (2 structures × 2 modes × 5 repetitions), 4 pooled files and one comparison file;
- 165 answers per structure and mode;
- `calls` is 1 or 8 on every successful answer.

## 4. Blind audit

1. `node scripts/audit-sheet.ts --seed <seed> evidence/structures-sheet.json evidence/structures-key.json evidence/capture/*-rep*.json`
2. Judge every item without opening the key. Record the judged sheet's sha256.
3. `node scripts/reliability-sample.ts sample --seed <seed> …`: the maintainer judges the sample.
4. `… agree …`: record the agreement against the bar.

## 5. Compare

`node scripts/compare-structures.ts …` gives a verdict per metric and mode and the H1 result. Record them in
verification.md with counts, including "no difference" or "not established".
