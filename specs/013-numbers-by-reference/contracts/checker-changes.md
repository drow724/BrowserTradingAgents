# Contract: grounding checker changes

| Change | Before | After | Labelled cases added (examples) |
|---|---|---|---|
| Korean refusals (FR-001) | "…내용이 없습니다" → trap not handled | handled | 6 phrasings from Feature 010 answers |
| Compound amounts (FR-002) | "73만 8천 원" → "73만" unsupported + "8천" unrecognised | 738,000 KRW, supported vs D3 | "73만 8천 원" ✓, "2억 2천 8백만 원" ✗ (fact 22,812,500), "9억 5천만 원" ✗ (fact 95,000,000), "9,500만 원" ✓ |
| Months (FR-003) | "2026년 11월" → "11월" unsupported | month 2026-11, supported by "November 2026" | ✓ and a wrong-month ✗ |
| Unit rule (FR-004) | "20%" supported by "20 sessions" | unsupported | "20%" ✗, "20거래일" ✓ |

Re-score output: `evidence/rescore-010-native.json` (old / new / hand, changed runs listed).
