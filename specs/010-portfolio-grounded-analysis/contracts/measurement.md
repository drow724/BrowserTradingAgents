# Contract: hallucination measurement

- Set: `test/fixtures/grounding/questions.json` — 20–30 Korean questions over `portfolio-fixture@1`: single-holding,
  multi-holding, ≥ 5 trap questions; each with `expect` (identities) and `kind`.
- Stand-in run: part of `npm run test:browser`; produces the report twice and asserts equality apart from
  timestamps (SC-006); verdict `NOT_APPLICABLE` (the stand-in echoes its prompt).
- Native run: `BTA_MEASURE=1 npm run test:prompt-api -- -g measurement` (installed Chrome, opt-in, never in CI);
  ≥ 3 repetitions per question; report JSON in `test-results/` and a committed copy under
  `specs/010-…/evidence/measurement-native-<date>-<sha>.json`.
- Verdict (SC-007): USABLE if zeroUnsupportedRate ≥ 0.90 and trapHandledRate ≥ 0.80; LIMITED if ≥ 0.70 and ≥ 0.50;
  else NOT_YET. Rates over completed runs; failed runs are counted separately and reported.
- The report never states or implies trading quality (Constitution VIII).
