# F000-B 사전 등록 — Experiment B2: Hybrid routing

- 등록: 2026-10-03, B1 결과를 본 뒤, B2 실행 전.
- B1 결과와 사전 등록은 수정하지 않는다.
- 이 파일과 `runner.html`의 B2 프롬프트, guard 규칙은 B2 결과를 본 뒤 바꾸지 않는다.

## 목적

B1 B의 미충족 원인 두 가지를 해결할 수 있는지 검증한다.

1. 전제 조건 판단 실패: insufficient_context 0/10
2. State prefill latency: routing p95 2.67초

## 변경 사항 (B1 B 대비 두 가지)

다음 두 가지 외에는 모두 B1 B와 같다.

- dataset 210개
- CAPS 설명
- 고정 enum
- `responseConstraint`
- 세션 전략 (base session에 `clone`, 1회 `prompt`)
- runtime

### 1. State 전문 대신 메타데이터 한 줄

```
Context: conversationType=<channel|dm|thread>; messages=<n>; threadExists=<true|false>; selectedMessage=<true|false>; mentionsMe=<n>
```

`threadExists`는 다음 중 하나라도 해당하면 true다.

- `conversationType === 'thread'`
- 어느 메시지든 `hasReplies === true`
- `selectedMessageId`가 있음

system prompt에서는 B1의 "Use the conversation state to check..." 문장의 "conversation state"를 "context"로 바꾼다.

### 2. 결정론적 전제 조건 guard (모델 출력 후처리)

모델이 고른 action이 아래 조건을 만족하지 못하면 NO_ACTION으로 바꾼다.

| 모델이 고른 action | 필요한 조건 |
|---|---|
| SUMMARIZE, EXTRACT_TODOS, FIND_DECISIONS, DRAFT_REPLY, REMIND_LATER | `messages.length > 0` |
| READ_THREAD | `threadExists` |
| SEARCH_MESSAGES, NO_ACTION | 조건 없음. 검색 범위는 workspace 전체다 |

## 공정성 주의 (사전 명시)

guard 규칙은 B1의 insufficient_context 실패를 본 뒤 **같은 dataset**에 대해 설계했다. 그래서 insufficient_context 10건에서는 과적합이 거의 확실하다.

이를 분리하기 위해 아래 값을 **반드시 함께** 보고한다.

- **B2-final:** guard를 적용한 결과. 1차 metric이다.
- **B2-model:** guard를 적용하기 전 모델 출력. 메타데이터 변경 단독 효과를 본다.
- **insufficient_context 10건을 제외한 200건 정확도:** B1 B와 B2-final을 비교한다. guard와 무관한 비교다.

새 dataset으로 일반화 성능을 검증하는 일은 B2 범위 밖이다. Future Finding으로 남긴다.

## 실행 순서

1. **B2:** 210개를 1회 실행한다.
2. **B1r:** B1 B 구성을 그대로 210개 재실행한다.

B1r은 run-to-run 변동(비결정성)과 순서 효과를 측정하기 위한 replication이다. 판정에는 쓰지 않는다. B1에서는 B가 나중에 실행되었으므로, 이번에는 B2를 먼저 실행한다.

extraction은 B2의 변경 대상이 아니므로 다시 실행하지 않는다. extraction p95 기준은 B1 결과대로 미충족으로 남는다.

## 판정 기준 (B2-final)

| 기준 | 목표 |
|---|---|
| Action routing accuracy | 90% 이상 |
| Routing p95 (warm) | 1초 이하 |
| Invalid action rate | 1% 미만 |
| Structured output success | 99% 이상 |

**판정 규칙:**

- 네 기준을 모두 충족하면 **PASS**다. "on-device 실시간 routing 가능"으로 결론 내린다.
- 하나라도 미충족이면 **FAIL**이다. "이 runtime으로 실시간 routing은 불가능"으로 결론 내리고 프로젝트 범위를 재검토한다.

**보조 판단:** 200건 정확도(insufficient_context 제외)가 B1 B의 91.5%보다 5%p 이상 떨어지면, 메타데이터 축약이 routing 품질을 해친 것으로 기록한다.
