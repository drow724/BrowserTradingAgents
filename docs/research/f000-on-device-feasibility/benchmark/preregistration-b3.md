# F000-B 사전 등록 — Experiment B3: 구조화 출력 latency 원인 분리

- 등록일: 2026-10-03. B2 결과를 확인한 뒤, B3를 실행하기 전에 등록했다.
- 성격: 진단 실험이다. B2의 FAIL 판정은 바꾸지 않는다. 어떤 구성이 1초 이하를 달성하더라도 정확도는 이 실험에서 판정하지 않는다. 그 구성으로 정확도까지 판정하려면 새 routing experiment(B4)로 사전 등록해야 한다.

## 질문

B2 routing p50은 1.36초였다. 같은 runtime에서 단순한 "OK" prompt는 약 0.3초였다. 그 차이 약 1초는 무엇에서 오는가?

## 측정 방법

- 모든 호출은 `promptStreaming`으로 한다.
- 각 호출에서 다음 값을 기록한다.

| 기록 항목 | 정의 |
|---|---|
| `ttft` | 첫 chunk가 도착할 때까지의 시간. prefill과 첫 토큰 생성을 합한 값이다 |
| `total` | 호출 전체 시간 |
| `decode` | `total - ttft` |
| 출력 문자 수 | 출력 텍스트 길이 |
| chunk 수 | 받은 chunk 개수 |
| 입력 토큰 사용량 | `inputUsage`(또는 `contextUsage`)의 호출 전·후 값 |

- item 표본: dataset에서 `index % 4 == 0`인 53개를 고른다. 모든 tag가 포함된다.
- 실행 순서: item을 바깥 루프로 두고, 각 item에서 5개 condition을 회전 순서로 실행한다. 시간에 따른 drift와 순서 효과를 줄이기 위해서다.
- 세션: condition마다 base session을 1회 `create`하고, 호출마다 `clone`한 뒤 `destroy`한다. B1·B2와 같은 방식이다.
- user message는 모든 condition에서 B2와 동일하다. 메타데이터 한 줄과 명령으로 구성된다.

## Condition

| ID | System prompt | responseConstraint | schema를 input에 추가 | 기대 출력 |
|---|---|---|---|---|
| C1 | B2와 동일 (CAPS 포함, JSON 지시) | ON | 예 (기본값) | `{"action": "..."}` |
| C2 | B2와 동일 | ON | 아니오 (`omitResponseConstraintInput: true`) | `{"action": "..."}` |
| C3 | B2와 동일 | OFF | 해당 없음 | 자유 생성. JSON 지시만 따름 |
| C4 | B2에서 마지막 지시만 "Answer only with the action name."으로 변경 | OFF | 해당 없음 | action 이름만 |
| C5 | 최소 system: action 이름 목록과 JSON 지시만 둠 (CAPS 설명 제거) | OFF | 해당 없음 | JSON |

C1은 B2 구성의 재현이다.

## 요인 귀속 규칙

같은 item끼리 짝지은 paired difference의 **중앙값**으로 판정한다.

| 요인 | 비교 | 측정 대상 |
|---|---|---|
| schema를 input에 추가 | C1 − C2 | total, ttft |
| constrained decoding | C2 − C3 | total, decode |
| 출력 길이 (JSON 대 이름) | C3 − C4 | total, decode |
| system prompt 길이 (clone이 prefill을 재사용하는가) | C3 − C5 | total, ttft |

- paired difference 중앙값이 **200ms 이상**이면 그 요인을 "주요 원인"으로 기록한다.
- 200ms 미만이면 "무시할 수준"으로 기록한다.
- 음수도 그대로 보고한다.

## 함께 보고하는 값

- 각 condition의 total p50/p95, ttft p50, decode p50, 입력 토큰 수
- 각 condition의 routing 정확도. 53개만 쓰는 참고치이며 판정하지 않는다. C3·C5는 JSON을 parse하고, C4는 가장 먼저 등장한 action 이름을 쓴다.
- p95가 1초 이하인 condition이 있는지 여부. 이 값은 B4 후보를 제시하는 데에만 쓴다.
