# Verification: Feature 018 — Effectiveness Benchmark (single-role baseline)

## T001 — Baseline

- Base: `main` `4b027df` (constitution 1.2.0), branch `018-effectiveness-benchmark`.
- Checker hashes at start (sha256): src/analysis/grounding.ts
  `896f5f7e2e1b5da835bef0ec70b05a2dde1c24b39b9accc02c6d8cf6558f60d9`, src/analysis/semantics.ts
  `a159800465eccc964569d70845d66e47ad30b093c0b82da6ed4699b69647568f`.
- `npm test`: 237 tests, 235 pass, 0 fail, 2 skipped.
- Baseline (spec.md): Feature 017 held-out eight-role capture — clean-answer rate refs 0.939 / 1.000, current
  0.818 / 0.939 (rep 1 / rep 2); unsupported numeric claims per answer refs 0.061 / 0, current 0.394 / 0.091; hand-audited
  real errors 9 (refs) and 14 (current) in 66 answers each; median 52.8 s / 53.8 s per answer.

## T002–T010, T013–T014 — Implementation (before the freeze)

- Single role (A-018-1): `SINGLE_ROLE`, `buildSingleRoleGraph`, `singleReads` in src/graph/trading-graph.ts; the shared
  node factory is unchanged in behaviour (eight-role prompts equal the `4b027df` snapshot,
  test/fixtures/prompts-4b027df.json, 6 holdings × 2 modes × 8 prompts).
- `?roles=single` (src/main.ts): portfolio runs only (demo/live inputs have no question and keep eight roles); record
  `structure`, `graph.version: 'single-role-baseline@1'`, final node reads `singleReads`.
- `MeasureRun.structure`, `MeasureRun.calls` (src/analysis/report.ts, e2e/measure.ts); report header `structure`.
- Measurement loop (e2e/prompt-api.spec.ts): `BTA_MEASURE_STRUCTURES`, cells rotated per repetition; without it the
  Feature 013 loop and file names are unchanged.
- Tooling: scripts/compare-structures.ts (decision rule, H1), scripts/audit-sheet.ts `--seed` (blind multi-report
  sheet + key), scripts/reliability-sample.ts (`sample`, `agree`, bar 0.95 / 0.70).
- Regression: `npm run typecheck` 0; `npm test` 242 tests, 240 pass, 0 fail, 2 skipped; `npm run test:browser` 95
  passed, 3 skipped.

## T011 — Freeze (before any native answer)

- Recorded 2026-09-30 18:42 KST; base `4b027df` plus the uncommitted Feature 018 working tree.
- sha256 of every file the capture and the scoring depend on:
  - src/analysis/grounding.ts `896f5f7e2e1b5da835bef0ec70b05a2dde1c24b39b9accc02c6d8cf6558f60d9`
  - src/analysis/semantics.ts `a159800465eccc964569d70845d66e47ad30b093c0b82da6ed4699b69647568f`
  - src/analysis/facts.ts `9f1a456d9695d93252a64f40e5918291266c928935b194937b7c92a5e468b1c5`
  - src/analysis/references.ts `ced50a58f0f094c5d9834491c8b1e5fe10ce98491ca0a15f74f2a79832d20144`
  - src/graph/trading-graph.ts `104cabf093bd6de973a90f567208de4f96eec8995c9fd804530cdf97fcf256fb`
  - src/main.ts `0a0f6c4d351e7757a17592e37597a09c8b9388d5161d7ac7a02a5665a1d77a26`
  - e2e/measure.ts `f2e8f1093aab7ceb67a8a069f18d00c1d4120bb0852584ccb1a2e7060522b162`
  - e2e/prompt-api.spec.ts `736d48bed3d5a25187492aacf227cf711afa6e7df1fc60376a3587c886eaf8f1`
  - scripts/audit-sheet.ts `7ab1612a149ab34a2938de21e03971216c5c2da42fcfb61d4dfbdb4fceb1de92`
  - scripts/compare-structures.ts `1e9b45cd14528b9ba23e6d3973f2f2ce20e77a25529f0ce5c07432df476b4d72`
  - scripts/reliability-sample.ts `8f7fccf6177079149b908890d3bf771c6b7e608872bf0f3ab1f7e282b40a569c`
  - test/fixtures/grounding/questions.json `7db2795514fcc6d6ea034f9a6718b8269a7ce096fad179d270c2d941a0a75603`
- Checker unchanged since `4b027df`: `git diff 4b027df -- src/analysis/grounding.ts src/analysis/semantics.ts` is empty.
- Seeds: blind-sheet shuffle `1801801`; reliability sample `1801802`.
- Pre-registration (copied verbatim from spec.md):

  >
  > - **Hypothesis H1 (role separation adds grounding)**: the eight-role graph produces fewer hand-audited real errors
  >   per answer than the single role.
  > - **Null H0**: no difference beyond run-to-run variation. Prior external evidence (MAST; study note §20.2) makes H0
  >   or the reverse direction plausible; either is a valid result.
  > - **Primary metric**: hand-audited real errors per answer (numbers and interpretation claims judged unsupported), per
  >   structure and number mode.
  > - **Secondary metrics**: checker clean-answer rate and unsupported numeric claims per answer; trap handling.
  > - **Context metrics** (no decision rule): time per answer, model calls, Korean rate, format violations, semantic
  >   mismatches, unsupported interpretation claims.
  > - **Sample**: both number modes (refs and current), 5 repetitions per structure and mode, 33 answers each —
  >   165 answers per structure and mode, 660 in total.
  > - **Decision rule**: a structure is better on a metric in a mode only if (a) its value is better in at least 4 of
  >   the 5 repetition pairs, and (b) the pooled difference is larger than the largest difference between two
  >   repetitions of the same structure in that mode. Otherwise the result is "no difference" for that metric and mode.
  >   H1 holds only if the eight-role graph is better on the primary metric in both modes.
  > - **Audit reliability bar**: on the re-judged sample, Claude and the maintainer agree on "real error or not" for at
  >   least 95 % of items, and on at least 70 % of the items either of them marked a real error. Below the bar the primary
  >   metric's result is reported as "not established" (secondary metrics still stand).
  > - **Frozen before capture**: the checker (hashes recorded), the measurement set, the answer policy and prompts, the
  >   audit rules of Feature 017 (T024), the capture order.
  > - **Not measured**: trading outcomes (no look-ahead-free historical window exists yet; Principle VIII requires one).
  >

No checker, prompt, metric, rule or seed change after this point.

## T012 — Native capture (run by Claude at the maintainer's request, maintainer away; 2026-09-30 18:45 – 2026-10-01 00:24 KST)

- Command: `BTA_MEASURE=1 BTA_MEASURE_STRUCTURES=eight,single BTA_MEASURE_MODES=refs,current BTA_MEASURE_REPS=5 npm run test:prompt-api -- -g measurement`
  (terminal tab "018 capture"; `caffeinate -i -w` on the test process only); 1 passed in 5.6 h.
- Model: Gemini Nano (Chrome Prompt API); browser Chrome/154.0.0.0; evidence class REAL_BROWSER_PROMPT_API (all 20 reports).
- 20 cell reports × 33 answers = 660 answers, 0 failed; every eight-role answer used 8 calls and every single-role
  answer 1 (checked on all 660); every report header carries its structure and repetition.
- Frozen files unchanged at the end of the capture (grounding.ts, semantics.ts, trading-graph.ts, main.ts,
  e2e/measure.ts, e2e/prompt-api.spec.ts: same sha256 as T011).
- Evidence copied to evidence/capture/ (sha256):
  - measurement-native-eight-current-rep1.json `45af2bf5681754a890dc22d05f95dbcf19f2bdae14d04610cb64b30dc1638076`
  - measurement-native-eight-current-rep2.json `5a7f6e16106a57ce7a1acf7bcdd2d4d31bb829d5e4da7994b2a3ee46910f4e60`
  - measurement-native-eight-current-rep3.json `989514e40bb8d96f75a2672fd0833f8ac816877248e63bae7c1f51db09c96a20`
  - measurement-native-eight-current-rep4.json `3bc10973213c865865aaa91cac712759584370c9f276ea5d6b8257842667d60c`
  - measurement-native-eight-current-rep5.json `5c03ab390941574dd8592f1c137076be49fe359d2d6a86d9edcabddd620e81fc`
  - measurement-native-eight-current.json `42ba572c486d2d7ff5e79e5fdfde197758e9c0b4615fc1df22a5c37e4874a631`
  - measurement-native-eight-refs-rep1.json `257859cea3ebb227c447c6c8dfde837a6b8259e5dbab17c8846e9cc864b6fee3`
  - measurement-native-eight-refs-rep2.json `d0a942355590bb55586ea1cac80a616b83c1a7854519b1ae0dcd9bf6017306c6`
  - measurement-native-eight-refs-rep3.json `c66dba90297d4412e2237a9b4900d2e49bcac1542af96a31b95bbf8c701ad3c2`
  - measurement-native-eight-refs-rep4.json `615a5843a617152e401c52c4dfa1d2fe290d58755626aa98ca0fad7415b18a85`
  - measurement-native-eight-refs-rep5.json `9228eecba5f2521872ed79376a2b364ddb700f564912f25068610413d79e7d48`
  - measurement-native-eight-refs.json `a2733f25b026b5c037fc993d639dfe5002a18eef1db2374f7bdaf17472a7262c`
  - measurement-native-single-current-rep1.json `847c9cec0c922d2ec5fe5cd47cd870d83c3de9c9818e5ba87d8461668979a412`
  - measurement-native-single-current-rep2.json `771939018b54045e407e5c3c7b15719f105a8fe0a7c14ca8d7bb3ab75128ceb7`
  - measurement-native-single-current-rep3.json `31ab0dbc7540ad4c86b1a4e45681a54e7e47f158faa2234af1a763977e213371`
  - measurement-native-single-current-rep4.json `ebdeb99386b1272f58f66c533733a81db0188e91f57bece31c6d07b72bcc002a`
  - measurement-native-single-current-rep5.json `a3a656f5aa75f965c1e6d21347775c3fbac6e017e21f1b521e2b9afe6232fac7`
  - measurement-native-single-current.json `2465bc28a87d5718712a4d567b2ed279fb87c2c86705944ad1297ece52e1e8dd`
  - measurement-native-single-refs-rep1.json `07503c2b3a169e4dcf3e28a5dd5a2cf5c68a3769564606cbc160c750b10a144f`
  - measurement-native-single-refs-rep2.json `4b44ff874c8415ff609e6c984ca81f1bb729109865e8ee65ae7f21faeaadfd2a`
  - measurement-native-single-refs-rep3.json `4fb675ed72fc9443e8e814ec341e25cb2f298859d9130fa04608351d5593c72d`
  - measurement-native-single-refs-rep4.json `c01fd0956f901ae42941fdaffbf57b740633013cad6c701016aac4eaabfc1377`
  - measurement-native-single-refs-rep5.json `85ff3efe6b5b4745e3373638ee280384487b0a6a253a9fb74ec7fea2fbdd5d47`
  - measurement-native-single-refs.json `38340fdce45c609ad0294341016d585adde4614d0ef9f96372f42903d9dc7b0a`
  - measurement-native-structures-compare.json `e060882f07841dd273abdf9bfa99c391c35c7ca807b3d8a5ffd0860ab75ed3fd`

## T015 — Blind audit (judged before the key was opened or the checker run on these answers)

- `node scripts/audit-sheet.ts --seed 1801801 evidence/structures-sheet.json evidence/structures-key.json evidence/capture/*-rep*.json`
  → 660 answers, 3,525 items, shuffled under opaque ids (e001–e660); no mode, structure, repetition, question id,
  holding or checker output in the sheet. Unjudged sheet `c1a02f863ac975499a83dcb2c21c110408f1be8434e448b31a3db3ebc76f8524`; key `0e160a172ca59ab4b5095e499d26572f6bc000373adb3ed8a857c1b520a3bae6` (not opened before the hash below).
- Judged by Claude from each entry's facts and answer only, with the Feature 017 rules (T024 of Feature 017): a wrong
  value or a wrong meaning is a real error; a right value under a loose or garbled label (실현 for unrealised, 평일 for the
  20-day average, a stray repeated number when the right value is also given) is debatable; an interpretation is
  supported when it restates the facts or news correctly, unsupported when it forecasts or judges beyond them, restates
  news with a wrong value, or denies a given fact, and none when it states no claim. Numbers without a note are correct.
- Counts: numbers correct 3,007, real-error 157, debatable 97; interpretations supported 156, unsupported 51, none 57.
- Observed while judging (not scored, no structure known): Bitcoin amounts written in 억 at 10x (9억 5천만 원 for
  95,000,000 KRW) are the most frequent real error; answers also wrote amounts in Hangul numerals (e.g. "백만 원",
  "천팔백팔십사원", "십육.오 퍼센트"), which the number extractor does not see, so such errors are outside the items (e.g.
  e469, e653); one answer is off-topic (e582).
- **Judged sheet: evidence/structures-sheet.judged.json `a98b958946d873898fc85158a88faa4075ae79f63bd688698404e71b09749f39`** — recorded before the key or the checker results were
  joined.

## T016 — Reliability sample (maintainer)

- `node scripts/reliability-sample.ts sample --seed 1801802 evidence/structures-sheet.judged.json evidence/reliability-sample.json`
  → 62 answers (⌈10 %⌉ of the 618 answers with at least one item), 365 items, no judgements
  (`a860dcd2fb1b4f46bebf14a069f3f005842e87273161cf9cafe91eec97a4dd4e`).
- Worksheet for the maintainer: evidence/reliability-worksheet.md (same content, readable; judgement lines go to
  evidence/reliability-maintainer.txt).
- Procedure as run (2026-10-01): the maintainer chose to judge in the conversation, 6 batches of 10–12 answers shown
  by Claude from the sample (no structure, no judgement), answering "only the non-correct numbers, all interpretations"
  (numbers not listed = correct, the pre-registered convention). Deviations recorded: in batch 2 Claude bolded
  phrases to compare with the facts (removed from batch 3 on); the maintainer asked about general rules twice
  (repeated values; an awkward P/E sentence) and Claude answered with the rule only, not the item's judgement; one
  entry (e489) was first judged debatable and changed to correct by the maintainer before the next batch, and one
  item id mix-up (e478:4) was corrected by the maintainer. Maintainer judgements: evidence/reliability-maintainer.txt
  (`fbbac3810f9d8cfe3241677ebdc49346533e22461dfe11bfa172266ea3e4e58f`) → evidence/reliability-maintainer.json
  (`3b9d1faf9a70e6f52c17ae3d730ea8b73f530003e12847e4b1d041a392ae412f`), both recorded before `agree` ran.
- `node scripts/reliability-sample.ts agree evidence/structures-sheet.judged.json evidence/reliability-maintainer.json evidence/reliability-agreement.json`:

| Measure | Value | Bar | |
|---|---|---|---|
| Items | 365 | | |
| Agreement on "real error or not" | 0.953 | ≥ 0.95 | met |
| Items either side marked a real error | 29 | | |
| Agreement on those items | 0.414 (12 / 29) | ≥ 0.70 | **not met** |

- **Reliability bar: not met → the primary metric's verdict is "not established"** (pre-registration); secondary
  metrics stand. No judgement on either side is changed after this result.
- All 17 disagreements go one way (Claude real error / unsupported, maintainer correct / supported): 10 numbers, 7
  interpretations. They include written copies of an error the maintainer marked on the first copy (e588:6 vs
  e588:5; e491:2, e491:6 vs e491:1 with the same 10x pattern the maintainer marked in e033 and e359), the price said to
  be below the 52-week low (e047:4, e098:7, e224:4, e224:6, e318:7), 653,200 given as the price (e258:1), "1억 5천억
  달러" (e144:5), the unrealised change called the recent rise (e216:3), and interpretation cases (e156:5, e619:10,
  e144:6, e658:0–2). Which side is right is not decided here; the list is the record (T018).

## T017 — Comparison under the pre-registered rule

`node scripts/compare-structures.ts evidence/structures-sheet.judged.json evidence/structures-key.json evidence/reliability-agreement.json evidence/structures-comparison.json`
(`e0354ee19bc53ad20f7a7eaf8a8a8c46f3e143a6a8194bcde79b77e5b14b5709`). 165 answers per structure and mode, 0 failed.

**H1: not established** (reliability bar not met).

| Mode | Metric | Eight-role per rep | Single-role per rep | Pooled 8 / 1 | Pairs better 8 / 1 | Max within spread | Verdict |
|---|---|---|---|---|---|---|---|
| current | real errors / answer (primary) | .485 .485 .273 .303 .394 | .545 .394 .424 .606 .515 | 0.388 / 0.497 (64 / 82) | 4 / 1 | 0.212 | not established |
| current | clean-answer rate | .879 .848 .879 .939 .879 | .788 .879 .848 .758 .788 | 0.885 / 0.812 | 4 / 1 | 0.121 | no difference |
| current | unsupported numeric / answer | .212 .303 .212 .152 .242 | .424 .242 .333 .545 .545 | 0.224 / 0.418 | 4 / 1 | 0.303 | no difference |
| current | trap handled | 1 .833 1 .833 .833 | .833 .833 .667 .667 .667 | 0.900 / 0.733 | 4 / 0 | 0.167 | no difference |
| refs | real errors / answer (primary) | .303 .364 .182 .121 .182 | .212 .121 .061 .091 .242 | 0.230 / 0.145 (38 / 24) | 1 / 4 | 0.243 | not established |
| refs | clean-answer rate | .939 .909 .939 1 .939 | .909 .970 .970 .939 .818 | 0.945 / 0.921 | 3 / 2 | 0.152 | no difference |
| refs | unsupported numeric / answer | .061 .091 .061 0 .061 | .091 .030 .030 .061 .182 | 0.055 / 0.079 | 3 / 2 | 0.152 | no difference |
| refs | trap handled | 1 1 1 1 .833 | .833 1 1 1 1 | 0.967 / 0.967 | 1 / 1 | 0.167 | no difference |

- Had the bar been met, the primary rule would still give **no difference** in both modes: the direction condition
  holds (current: eight-role 4 of 5; refs: single-role 4 of 5) but the pooled gaps (0.109, 0.085) are inside the
  largest within-structure spread (0.212, 0.243). H1 would not hold.
- Context (no rule): median time per answer eight-role 52.3 s / 52.7 s vs single-role 7.4 s / 7.2 s (current / refs),
  about 7x; calls 8 vs 1; Korean rate 0.970 / 0.939 vs 0.958 / 0.976; refs format violations 0.818 vs 0.879; semantic
  mismatches per answer 0.012 / 0.030 vs 0.024 / 0.085; unsupported interpretation claims per answer 0.030 / 0.073 vs
  0.121 / 0.061.
- Observation, not a verdict: the direction flips between modes — eight-role ahead in current mode on every metric
  that moved, single-role ahead on hand-audited real errors in refs mode. Neither passes the rule.

### Kinds of errors by structure (after the key was joined; keyword classification of the audit notes, heuristic)

| Kind (N = number real error, I = interpretation unsupported) | eight / current | single / current | eight / refs | single / refs |
|---|---|---|---|---|
| N: amount 10x / 100x (억 units, Bitcoin) | 32 | 55 | 0 | 0 |
| N: price vs the 52-week low comparison | 0 | 6 | 3 | 2 |
| N: position value used as the price or the P/L | 2 | 1 | 2 | 8 |
| N: "50" given as the moving average | 0 | 0 | 3 | 1 |
| N: buyback amount | 0 | 5 | 2 | 2 |
| N: unrealised change called the recent move | 2 | 1 | 0 | 1 |
| N: other | 5 | 4 | 13 | 7 |
| I: forecast or judgement beyond the facts | 4 | 3 | 7 | 0 |
| I: denies a given fact | 4 | 1 | 0 | 0 |
| I: buyback restated with a wrong amount or denied | 8 | 6 | 6 | 2 |
| I: other | 7 | 0 | 2 | 1 |

## T018 — Findings

- **F018-R1 (HIGH, method)**: the hand audit failed its pre-registered reliability bar (agreement on real errors 0.414 <
  0.70), so the primary metric decides nothing. All 17 disagreements go one way (Claude flagged, maintainer did not).
  At least 6 are copies or repeats of errors the maintainer flagged elsewhere (e588:6, e491:2, e491:6; the 52-week-low
  claims e047:4, e098:7, e224:4/6, e318:7 have the same form), which points to the conversational shorthand ("the other
  numbers are correct") dropping items rather than to a rule disagreement; the interpretation disagreements (denial of
  a given fact in e658 vs e408/e440 judged unsupported by the maintainer; forecasts e619:10, e156:5) point to rules
  applied differently. Next time: a per-item form with an explicit answer for every item, two independent auditors
  pre-registered, and a calibration round on non-sample items before the sample.
- **F018-R2 (MEDIUM)**: amounts written in Hangul numerals ("백만 원", "천팔백팔십사원", "십육.오 퍼센트"; e469, e653) are not
  extracted, so neither the checker nor the audit sheet sees them. A blind spot of the extractor, both structures.
- **F018-R3 (observation, hypothesis for a pre-registered follow-up)**: the kind of error depends on the structure.
  In current mode the 10x 억 amounts dominate both structures (32 vs 55). In refs mode, where values are rendered by
  code, eight-role answers carry more forecasts and judgements beyond the facts (7 vs 0; 11 vs 3 across both modes),
  consistent with the final role absorbing the Bull/Bear/Trader narrative. Single-role refs answers misuse the
  position value more (8 vs 2). None of this passed a pre-registered rule; it is the candidate hypothesis for the next
  structural experiment.
- **F018-R4 (observation)**: the direction of every moving metric flips between number modes (eight-role ahead in
  current, single-role ahead on audited real errors in refs); no difference passed the rule.

## T018 — Research answers (FR-013)

1. **Does role separation reduce real errors?** Not established: the reliability bar failed. Had it passed, the rule
   would give no difference in both modes (gaps inside the run-to-run spread). The secondary checker metrics give no
   difference in both modes.
2. **Does it change which kinds of errors occur?** Descriptively yes (table above, F018-R3): more beyond-the-facts
   judgements with eight roles in refs mode, more position-value misuse and 10x amounts with one role. Not tested
   against a pre-registered rule.
3. **What does it cost?** About 7x the time (52 s vs 7 s median per answer) and 8x the model calls, with no
   established grounding benefit on this set.

## T021 — Final regression, SC-005 / SC-006

- `npm run typecheck` 0; `npm test` 242 tests, 240 pass, 0 fail, 2 skipped; `npm run test:browser` 95 passed, 3 skipped.
- SC-005: the eight-role prompt snapshot test passes (prompts equal `4b027df`); the default run executes 8 nodes
  (T007). SC-006: `git diff main -- src/analysis/grounding.ts src/analysis/semantics.ts` is empty; no AkariSP, model or
  data-source change.
