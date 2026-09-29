# Quickstart: Feature 010 validation

## Prerequisites

- `npm install`; `npm run dev` → http://localhost:3000 (stand-in: `?provider=standin`).
- In the 포트폴리오 window, load the fictional measurement portfolio (button "예시 포트폴리오") or add your own
  holdings — your own holdings get only position facts ("시장 데이터 없음"), by design (MD-8).

## Scenarios

1. **Ask** — type "삼성테스트전자 괜찮을까요?" in the question box: one run for that holding; the answer window
   shows the Korean answer, the facts used and any "근거 확인 안 됨" marks. (US1, US2, US5)
2. **Not held / choose** — ask about a ticker you do not hold → "보유하지 않은 종목"; ask with no name → choose
   holdings. (US1)
3. **Overview** — "전체 포트폴리오 점검": runs one holding at a time, "k / N" in the HUD; Cancel mid-way. (US3)
4. **Ledger** — "모의 거래로 기록" after an answer; open 모의 거래; reload; delete. (US4)
5. **Privacy** — DevTools Network during 1–4: no request carries your holdings, question or answer. (FR-024)

## Automated

```bash
npm run typecheck && npm run build && npm test
npm run test:browser               # includes the stand-in measurement (deterministic report)
npm run test:prompt-api            # native fixture gate (unchanged)
BTA_MEASURE=1 npm run test:prompt-api -- -g measurement   # opt-in native measurement, ~75–90 min
```
