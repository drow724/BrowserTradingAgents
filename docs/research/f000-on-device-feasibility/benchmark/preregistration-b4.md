# F000-B 사전 등록 — Experiment B4: Minimal-output constrained routing

- 등록: 2026-10-04. B3 결과를 본 뒤, B4 실행 전에 등록했다.
- B1·B2·B3의 결과와 판정은 수정하지 않는다.

## 구성

B2 대비 바뀐 것은 아래 표의 항목뿐이다. 나머지 항목은 B2와 같다.

- 메타데이터 user message
- 코드 guard
- 세션 전략(clone, 비스트리밍 `prompt()`)
- runtime
- n=1

| 항목 | B2 | B4 |
|---|---|---|
| system prompt 마지막 지시 | `Answer only with JSON {"action": <ACTION>}.` | `Answer only with the action name.` (B3 C4와 동일) |
| responseConstraint | `{type:object, properties:{action:{enum}}}` | `{type:'string', enum: ACTIONS}` (출력은 JSON 문자열 `"SEARCH_MESSAGES"`) |
| schema를 입력에 주입 | 예 (기본) | 아니오 (`omitResponseConstraintInput: true`) |
| 파싱 | `JSON.parse(raw).action ∈ enum` | `JSON.parse(raw) ∈ enum` |

**Harness fallback (smoke 단계에서만 결정):** 최상위 string schema가 `NotSupportedError`로 거부되는 경우가 있다. 그때만 정규식 constraint `/^(SEARCH_MESSAGES|…|NO_ACTION)$/`으로 대체하고, 파싱은 trim한 raw 값이 enum에 속하는지로 바꾼다. 어느 쪽을 썼는지는 결과에 기록한다.

## Dataset

### 주 dataset

B1과 B2에서 쓴 210개를 그대로 쓴다. **판정에는 이 210개만 쓴다.**

### Held-out 60개 (`dataset.json`의 `heldout`)

- B4 실행 전에 새로 작성했다. 어떤 실험이나 프롬프트 설계에도 노출된 적이 없다.
- gold 규칙은 B1과 같다.
- tag 구성은 다음과 같다.

| tag | 개수 |
|---|---|
| simple | 24 |
| colloquial | 8 |
| typo | 6 |
| ambiguous | 6 |
| multi_intent | 4 |
| irrelevant | 4 |
| insufficient_context | 4 |
| should_not_act | 4 |

- **과적합 신호:** held-out의 B4-final accuracy가 주 dataset보다 5%p 넘게 낮으면 "과적합 신호"로 기록한다. 판정 자체는 바꾸지 않는다.

## 판정 기준 (주 dataset, B4-final)

| 지표 | 기준 |
|---|---|
| Action routing accuracy | 90% 이상 |
| Routing p95 (warm) | 1초 이하 |
| Invalid action rate | 1% 미만 |
| Structured output success | 99% 이상 |

- 네 기준을 모두 충족하면 **PASS**다. "on-device 실시간 routing 가능 (이 dataset 기준)"으로 기록한다.
- 하나라도 미충족이면 **FAIL**이다.

## 함께 보고하는 값

- B4-model: guard를 적용하기 전의 accuracy
- insufficient_context를 뺀 200건의 accuracy. B2(178/200)와 비교한다.
- tag별 accuracy
- NO_ACTION precision/recall
- 리소스: sampler로 측정한다.
- held-out 결과는 같은 지표로 별도 보고한다.

## 해석상 한계 (사전 명시)

- 프롬프트 지시문과 출력 형식은 B3에서 고른 것이다. B3는 주 dataset 중 53개를 사용했다. 따라서 주 dataset의 결과는 독립적인 검증이 아니다.
- 일반화를 판단하는 근거는 held-out 60개뿐이다. n이 작으므로 신뢰구간이 넓다.
