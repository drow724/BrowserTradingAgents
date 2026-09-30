# Contract: Structure Benchmark

## Page parameter

- `?roles=single`: the run uses the single-role structure. Any other value, or no value, uses the eight-role graph.
- The parameter combines with `?numbers=current|refs` and the existing measurement parameters. The default page
  behaviour without `roles` is unchanged (FR-003).

## Single-role prompt (A-018-1, measurement baseline)

```text
You are the Final Decision. Give the final decision from these facts. Reply in plain text in at most three sentences.

Company: <subject>
Facts: <answerFacts>                         (refs mode)
Holding facts: … / Market facts: … / News facts: …   (current mode)
User question: <question>

<Korean answer policy, verbatim from the eight-role final role>
<refs instruction, verbatim, in refs mode>
```

- One model call.
- Node name `finalDecisionMaker`; writes `finalDecision`.
- The other seven roles' nodes stay "waiting".

## Run record additions

- `structure: 'eight-role' | 'single-role'`
- For the single role: `graph: { version: 'single-role-baseline@1', topology: 'START→finalDecisionMaker→END' }`.
- `counts.logicalRequests` counts the model calls (1 or 8).

## Measurement environment

- `BTA_MEASURE_STRUCTURES=eight,single` together with `BTA_MEASURE_MODES=refs,current` and `BTA_MEASURE_REPS=5`.
- Cells are run in the base order (eight, refs), (single, refs), (eight, current), (single, current), rotated by the
  repetition index.
- Files: `measurement-native-<structure>-<mode>-rep<n>.json` (written at once), pooled
  `measurement-native-<structure>-<mode>.json`, and `measurement-native-structures-compare.json`.

## Offline scripts

- `node scripts/audit-sheet.ts --seed <n> <sheet.json> <key.json> <report>...`: writes a blind multi-report sheet and
  its key.
  - The existing single-report form `node scripts/audit-sheet.ts <report> <sheet>` is unchanged.
- `node scripts/reliability-sample.ts sample --seed <n> <judged-sheet> <sample.json>`: writes the maintainer's copy.
- `node scripts/reliability-sample.ts agree <judged-sheet> <maintainer-sample>`: prints the agreement against the bar.
- `node scripts/compare-structures.ts <judged-sheet> <key> <agreement.json> <out.json>`: applies the decision rule.
  - It refuses unjudged items.
  - Secondary and context metrics come from the capture reports. The page ran the frozen checker, and its hashes are recorded in T011 and T012.
