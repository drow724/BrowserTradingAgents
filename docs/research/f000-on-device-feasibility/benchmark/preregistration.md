# F000-B 사전 등록 (Experiment B1)

- 등록 시각: 2026-10-03. dataset과 harness를 작성했고, 첫 실행 이전에 등록했다.
- 이 파일, `dataset.json`, `runner.html`의 프롬프트·채점 규칙은 결과를 본 뒤 바꾸지 않는다.
- 변경이 필요하면 `B2` 이후의 새 experiment로 별도 등록하고, B1 결과는 그대로 보존한다.

## Runtime

다음 환경에서 실행한다.

- Chrome 154, 사용자 프로필의 Gemini Nano(`OptGuideOnDeviceModel 2025.8.8.1141`)
- Mac M1 16GB, macOS 15.7.4
- 실행 페이지: `http://127.0.0.1:8766/runner.html` (Phase A의 Mattermost plugin 경로와 같은 `LanguageModel` web API)

생성 파라미터는 다음과 같이 둔다.

- sampling 파라미터(temperature, topK)는 Chrome 148 web에서 origin trial 전용이다. 따라서 기본값을 쓴다. 결과는 비결정적이다.
- `expectedInputs`/`expectedOutputs`의 language는 `en`으로 둔다. ko는 지원 목록에 없을 수 있다. Phase A에서 한국어 입력이 `en` 설정으로 동작함을 확인했다.
- 각 item은 condition별로 1회 실행한다(n=1).

## Conditions

- **A (Free-form).** system에는 capability 설명이 들어간다. user 메시지는 명령만 담는다. State도 출력 제약도 없다. 모델은 자유 텍스트로 답한다.
- **B (Constrained).** system에는 A와 **동일한** capability 설명과 고정 enum 지시가 들어간다. user 메시지는 Normalized State(JSON)와 명령을 담는다. `responseConstraint`로 JSON schema `{action: enum}`을 강제한다.
- **C (Cloud reference).** NOT_RUN. 2026-10-03 기준으로 환경에 cloud API credential이 없다.

A와 B의 차이는 다음 세 가지가 묶인 것이다.

1. State 제공
2. enum 지시
3. 구조화 출력 강제

이 셋의 개별 기여는 B1에서 분리하지 않는다. 분리가 필요하면 후속 experiment로 등록한다.

## Session 전략

- condition마다 system prompt를 `initialPrompts`로 담은 base session을 1회 `create`한다.
- item마다 base session을 `clone()`한 뒤 `prompt` 1회를 실행하고 `destroy`한다.
- latency는 `prompt()` 호출 구간만 잰다. clone 시간은 별도로 기록한다.
- 각 condition의 첫 item은 `first-run`으로 따로 보고하고, 나머지는 `warm`으로 보고한다.
- item 단위 timeout은 30초이며, 초과 시 `timeout`으로 기록한다.

## 채점 규칙

### Gold 규칙

- 각 item에는 gold action이 하나만 있다.
- **multi-intent:** 명령에서 **먼저 요청된** action을 gold로 한다.
- **NO_ACTION:** 다음 경우를 NO_ACTION으로 한다.
  - 잡담이나 감사·확인 응답
  - 8개 capability 밖의 요청
  - 파괴적이거나 지원하지 않는 작업(삭제, 전체 발송, 권한 변경 등)
  - 명령이 가리키는 대상이 State에 존재하지 않는 경우(insufficient_context)
- **insufficient_context:** A는 State를 받지 않으므로 구조적으로 불리하다. 그래서 이 tag는 반드시 별도로 보고한다.

### A 파싱

- 출력 텍스트에서 8개 action 이름 중 **가장 먼저 등장하는 것**을 예측으로 쓴다. 대소문자는 구분하지 않는다.
- 하나도 없으면 `invalid-action`으로 처리하고, 정확도에서는 오답으로 센다.

### B 파싱

- `JSON.parse` 성공과 `action ∈ enum`을 모두 만족하면 structured output 성공이다.
- 실패하면 `structured-output-failure`로 기록하고 오답으로 센다.

### 실패 유형

모든 item에 실패 유형을 하나씩 기록한다.

| 유형 | 조건 |
|---|---|
| `wrong-action` | 유효한 action이지만 오답 |
| `invalid-action` | A에서 action을 찾지 못함 |
| `structured-output-failure` | B에서 파싱 또는 schema 실패 |
| `timeout` | item timeout 초과 |
| `model-unavailable` | 모델을 사용할 수 없음 |
| `insufficient-context` | gold가 NO_ACTION이고 tag가 insufficient_context인데 다른 action을 예측함 |
| `ambiguous-command` | tag가 ambiguous인 item의 오답 |

## Metrics

### 정확도

| Metric | 정의 |
|---|---|
| Action routing accuracy | 전체 item 중 정답 비율 |
| Invalid action rate | A는 invalid-action 비율, B는 enum 밖 값의 비율 |
| Structured output success rate | B만 해당 |
| Ambiguous-command accuracy | tag가 ambiguous인 item의 정확도 |
| NO_ACTION precision/recall | NO_ACTION에 대한 precision과 recall |
| tag별 정확도 | tag 그룹별 정확도 |

### 지연 시간

- routing latency의 p50, p95(warm)와 first-run 값
- extraction latency는 별도 세트로 잰다.
  - 세트 구성: SUMMARIZE, EXTRACT_TODOS, FIND_DECISIONS 실행 20회
  - 출력 형식: B 형식에 결과 필드를 추가한 JSON
  - 측정값: p50, p95, latency만 판정하고 정확도는 판정하지 않는다.

### 리소스

- 호스트 sampler를 0.5초 간격으로 돌린다.
  - Chrome on-device model utility process의 RSS와 %CPU
  - GPU process의 %CPU
  - `ioreg` IOAccelerator "Device Utilization %"
- 모델 초기화 시간: cold 상태의 `create`
- 측정하지 않는 항목: energy/battery(powermetrics에 sudo 필요), NPU(공개 counter 없음), 다운로드 시간(이미 설치됨)

## 성공 기준 (Phase A 지시서의 초기 기준을 그대로 사용)

| 기준 | 대상 | 목표 |
|---|---|---|
| Action routing accuracy | B | >= 90% |
| Invalid action rate | B | < 1% |
| Structured output success | B | >= 99% |
| Simple routing p95 (warm) | B | <= 1초 |
| Extraction p95 | | <= 3초 |

**핵심 비교:** B가 A보다 accuracy, latency, failure rate, resource usage 중 하나 이상에서 의미 있게 개선되어야 한다. 의미 있는 개선의 기준은 다음과 같다.

- accuracy: 5%p 이상
- failure rate: 절반 이하
- latency·resource: 20% 이상 감소

동시에 다른 핵심 metric이 심각하게 악화되면 안 된다. 심각한 악화의 기준은 다음과 같다.

- accuracy: -5%p 이상 하락
- latency·resource: 50% 이상 증가

### 판정

- 위 5개 기준을 모두 충족하고 핵심 비교도 충족하면 **PASS**다.
- 일부만 충족하면 **CONDITIONAL**이다. 어떤 기준을 미충족했는지 명시한다.
- accuracy가 80% 미만이거나 structured output 성공률이 95% 미만이면 **FAIL**이다.
