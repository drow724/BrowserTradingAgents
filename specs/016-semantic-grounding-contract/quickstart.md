# Quickstart: Feature 016 validation

1. `node --test test/semantic.test.ts` — frozen fixtures A–C: every claim's actual class and evidence equal the
   frozen expectation; prints counts (claims, SUPPORTED, UNSUPPORTED, SEMANTIC_MISMATCH, agreement). No network, no
   model.
2. `npm test` — existing labelled claims unchanged (or each change listed with its reason in verification.md);
   templates cover every fact sentence the code produces (fixture and live).
3. `npm run test:browser` — the answer window shows the mismatch count and mark for a canned answer.
4. Offline re-score of the recorded Feature 013 native reports with the new checker (before/after counts) —
   secondary evidence.
5. Optional, secondary: a native run with the policy sentence (A-016-1), hand-audited; never the only proof.
