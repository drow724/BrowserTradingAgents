# F002-E1 사전 등록 — 학습된 소형 게이트 분류기 + 모델 + guard v2

- 등록: 2026-10-04, `testset.json`(네 번째 독립 test set)을 열기 전에 등록했다.
- 동결: `gate.json`, `intent9.json`, `classify.js`. sha256 값은 `frozen.sha256`에 있다.

## 분류기

- 형태: 문자 n-gram(1–3) TF-IDF(sublinear, min_df=2)와 로지스틱 회귀(C=2, class_weight=balanced). 특징 수는 4,019개다.
- 크기와 실행 방식: 게이트 모델은 229KB JSON이다. 브라우저에서 JS로 추론하므로 on-device로 동작한다.
- JS와 Python 일치: dev 1,070개 전부에서 예측이 같았다(불일치 0).
- 학습 데이터: 지금까지 쓴 라벨 데이터 전부다. 문자열이 같은 중복을 빼면 1,070개다.
  - 기존 310개
  - E1 200개
  - E2 200개
  - E3 400개
- 게이트 라벨: CLARIFY, NO_ACTION, PASS 세 가지다. insufficient_context 항목은 PASS로 라벨링했다. 상태(state) 판단은 guard가 맡는다.
- 구성 선택: 5-fold CV로 24개 구성을 비교했다(`cv.py`). out-of-fold 파이프라인 추정치는 accuracy 89.2%, recall 148/183, 과잉 되묻기 2.4%였다. **CV 추정치부터 이미 90%에 못 미친다.** 결과는 사전에 FAIL 쪽을 가리킨다.

## Guard v2 (E3에서 발견한 빈틈 보완)

기존 guard에 다음 규칙을 하나 추가한다.

> 명령에 `스레드|쓰레드|답글|댓글`이 있고, state에 스레드가 없으며, action이 SEARCH/NO_ACTION/CLARIFY가 아니면 NO_ACTION으로 바꾼다.

guard v1으로 계산한 결과도 함께 보고해서 guard 수정 효과를 따로 볼 수 있게 한다.

## Test set

- 네 번째 독립 에이전트가 작성한다. 이 에이전트는 이전 세트와 규칙을 보지 않는다. 규모는 400개이고 tag 분포는 E3와 같다.
- **E3 사양 대비 한 문장을 추가했다.** "READ_THREAD 항목은 s_thread_todo state를 쓴다(insufficient_context는 예외)." E3에서 gold 해석이 갈렸던 g274·g309·g311 같은 경우를 막기 위해서다.
- 학습 데이터 1,070개(정확히는 원본 1,110개)와 문자열이 같은 항목은 채점에서 빼고 건수를 보고한다.

## 실행과 판정

- 모델 구성은 B4/E2/E3와 같다. 모델은 test set 전체에 3회 실행한다(r1, r2, r3).
- 1차 파이프라인: `P = gate(cmd) ≠ PASS ? gate(cmd) : guardV2(model)`
- 판정 기준은 E3와 같다. **각 run마다** 6개 기준을 모두 충족해야 한다.
  - accuracy 90% 이상
  - CLARIFY recall 80% 이상
  - 과잉 되묻기 5% 이하
  - 모델을 호출한 item 기준 p95 1초 이하
  - invalid 1% 미만
  - structured 99% 이상
- 결과 판정:
  - PASS: 3회 모두 기준 충족
  - PARTIAL: 1회 또는 2회 충족
  - FAIL: 0회 충족

## 함께 보고 (판정 외)

| 비교 항목 | 계산 방식 |
|---|---|
| P with guard v1 | 게이트는 같고 guard만 v1 |
| 키워드 v3 파이프라인 | `preclassifyV3 ?? guardV2(model)`. 같은 모델 호출 결과를 써서 학습 게이트와 직접 비교한다 |
| **9-way 분류기 단독 + guard v2 (LLM 없음)** | 결정론적이라 run과 무관하다. dev CV 추정치는 88.8%다 |

- 9-way 단독 결과는 "작은 LLM이 이 routing에 꼭 필요한가"에 답하는 핵심 비교다. 9-way 단독이 P보다 같거나 높으면 "Gemini Nano의 추가 가치가 없음"으로 기록한다.
- 이 밖에 Wilson 95% 구간과 run 간 불일치율도 보고한다.

## 결과에 따른 처리

| 결과 | 처리 |
|---|---|
| FAIL 또는 PARTIAL | "이 runtime과 이 접근으로는 90% 업무 routing에 도달하지 못함"으로 결론 내리고 프로젝트를 중단한다(사전 합의, 2026-10-04) |
| PASS | F003(제품 프로토타입)의 착수 근거로 삼는다 |
