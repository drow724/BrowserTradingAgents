# Research: Feature 013 — Numbers by Reference

## R1 — Checker fixes (US1)

- **Refusals (FR-001)**: add "내용이 없", "명시되어 있지 않", "나와 있지 않", "답변할 수 없", "답변을 드릴 수 없",
  "말씀드릴 수 없", "정보만 확인할 수", "제공된 사실에 없", "제공된 정보에 없" to `TRAP_PHRASES`. Each comes from, or is
  a direct variant of, a Feature 010 native answer.
- **Compound amounts (FR-002)**: one pass before the plain-number pass reads runs of `<digits><Korean unit>` with
  units 억, 만, 천, 백, 십 (spaces allowed), e.g. "2억 2천 8백만 원", "73만 8천 원", "9,125만 원". Value: groups of
  (천/백/십 × digits) inside a 만/억 group, times the group's scale; step = the smallest unit written. Replaces the
  current "N천 → unrecognised" rule for these forms; pure-Hangul numerals ("구천만") stay unrecognised.
- **Months (FR-003)**: extract `YYYY년 M월` (no day) and `Month YYYY` as month values `YYYY-MM`; full dates keep day
  precision. A month claim is supported by a month fact or a full date in that month.
- **Unit rule (FR-004, F010-R1)**: a claim with a unit is never supported by a unit-less fact ("20%" vs "20
  sessions"), except `주` (also "week": "52주" ↔ "52-week"), and then only when equal. (Implementation found that
  "only when equal" still let "20%" match "20 sessions" exactly; tightened.)
- **Labelled cases (FR-005)**: every change adds cases to `test/fixtures/grounding/claims.json` from the Feature 010
  answers (supported and unsupported variants). Existing cases keep their labels; any changed label is listed with
  its reason in verification.

## R2 — Re-score (FR-006)

- `scripts/rescore-measurement.ts <report.json>` rebuilds each run's facts from `portfolio-fixture@1` (`factSet` +
  the question as `Q1`), re-runs `claims()` on the recorded answer, recomputes `trapHandled`, `aggregate`, `verdict`,
  and writes `{ old, new, hand }` to `evidence/rescore-010-native.json`. The hand values are the recorded Feature 010
  classification (0.889 / 0.889). The recorded report is only read.

## R3 — Reference names (FR-007)

- **Decision**: a fact with one number: `{D1}`; a fact with several numbers: `{M2a}`, `{M2b}` in reading order;
  dates count as numbers. Holding facts too (`{H2}` quantity, `{H3}` average price). Numbers from the question are not named; they
  stay allowed as bare numbers (spec edge case), which is simpler than `Q1…` names (implementation decision).
- **Facts shown in `refs` mode**: each number followed by its reference, e.g. `Latest price (2026-09-25 {D1a}):
  91,250,000 KRW {D1b}.` The model sees values (to reason) and names (to cite).
- **Alternatives**: whole-fact references only (`{M1}`) — cannot cite one of several numbers; hiding values — the
  model could not compare or reason.

## R4 — Rendering and violations (FR-009–FR-011)

- `render(raw, table)`: references match `\{\s*([A-Za-z]\d+[a-z]?)\s*\}` case-insensitively (spacing and case are
  forgiven, as one fixed rule for all modes); a known name → `format(value)` and a source mark; an unknown name → a
  `unknown-reference` violation. After substitution, every remaining number the checker extracts that is not from the
  question and not a small count (≤ 10) → a `bare-number` violation. A token that equals a table name but has no braces
  (`D2`, `M2a`) → an `unbraced-reference` violation, not substituted (spec edge case: counted unless matched
  without doubt).
- The grounding checker runs on the **rendered** answer: substituted values are supported by their facts by
  construction; bare numbers are still checked (and additionally counted as violations).
- Record: `analysis.numbers = { mode, raw, rendered, refs: [{ name, factId, value }], violations: [{ kind, text }] }`.

## R5 — Display format (FR-009, B condition)

- KRW: < 10,000 → `9,500원`; ≥ 10,000 → 억/만 groups with digits: 95,000,000 → `9,500만 원`; 22,812,500 →
  `2,281만 2,500원`; 950,000,000 → `9억 5,000만 원`. USD: `512.30달러`. Percent: as in the fact (`-3.95%`). g, kg,
  BTC, shares (`주`): value + unit. Dates: `2026년 9월 25일`.
- **formatted mode**: the fact text gains the Korean reading after each KRW amount, e.g. `91,250,000 KRW (9,125만
  원)`; the model still writes numbers; the checker must read both forms (R1).

## R6 — Mode switch and prompts (FR-016, adaptation A-013-1)

- `?numbers=current|formatted|refs`, default `current` (FR-015), read by `src/main.ts` and `components/Shell.tsx`.
- Final role only (Q1): `refs` appends "Never write a number yourself. When you mention a value from the facts,
  write only its reference in braces, e.g. {D2}. If a value you need is not in the facts, say that it is not given."
  `formatted` appends nothing (only facts change). `current` is byte-identical to Feature 010.
- Seven other roles: unchanged in every mode — they keep reading today's `holdingFacts` text (FR-008, Q1 = A).
- Final role: in `formatted` and `refs` it reads a new input `answerFacts` instead of `holdingFacts`: **all** facts of
  the run (holding, derived, market, news) in the mode's text. Reason: answers cite market numbers (e.g. "27.4%
  상승") that the final role otherwise only sees inside earlier roles' prose, without references — `refs` would be
  penalised for numbers it could not cite. Consequence: `formatted` vs `refs` is the clean comparison (same facts,
  different number handling); `current` vs `formatted` changes both the facts the final role sees and their format.
  Recorded in A-013-1 and in the report.

## R7 — Measurement

- `measure(page, reps, meta, mode)` per mode; the native test runs `BTA_MEASURE_MODES` (default all three) with the
  order rotated per repetition; one report per mode plus a combined comparison. Stand-in: all three modes once, each
  report stable on a second pass.
- Hand audit (FR-014): per native mode, all 6 trap answers of repetition 1 plus the first 14 non-trap answers of
  repetition 1 (≥ 20), labelled `{ run, realUnsupported, trapHandled, violations }` in `evidence/hand-audit-<mode>.json`;
  agreement = share of audited answers where rule and hand agree on zero-unsupported and on trap handling.

## R8 — F-A assessment (FR-017)

- Supported if the refs mode's format-violation rate is ≥ 10 % of answers (prompting alone does not hold the format);
  not supported if < 2 %; inconclusive otherwise. Thresholds fixed here, before measuring.

## R9 — Relation to AkariSP Feature 013 (task-scoped provider options)

- AkariSP `specs/013-task-scoped-provider-options` (in progress, 2026-09-30) validates whether AkariSP should pass
  provider options per task, e.g. the Prompt API's `responseConstraint` (JSON Schema or RegExp, a prompt option, not
  a creation option). Its motivating finding is this project's Feature 002 N-6.
- This Feature stays prompt-only (AkariSP changes 0). Its `refs` format-violation rate is a second consumer
  workload for that question (Korean prose with references, not JSON); AkariSP's own FR-1304 still requires an
  in-repository reproduction, so our numbers are supporting evidence only.
- Follow-up candidate (not this Feature): if AkariSP ships a public task-scoped option, add a fourth condition
  **`refs + constraint`** — a RegExp on the final role only that forbids digits outside `{…}` references — measured on
  the same 25 questions with the same checker. Needs AkariChatModel to forward the option to `run()`; the other seven
  roles stay unconstrained (task-scoped), and isolation across reused runtimes is AkariSP's invariant.
