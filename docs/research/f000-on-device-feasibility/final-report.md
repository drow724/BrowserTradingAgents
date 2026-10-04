# F000 최종 Feasibility 보고서

- 일자: 2026-10-03
- Phase A 상세: [README.md](README.md)
- Phase B 사전 등록: [benchmark/preregistration.md](benchmark/preregistration.md)
- 원자료: [benchmark/results/b1.json](benchmark/results/b1.json)
- 채점 결과: [benchmark/results/b1_scored.json](benchmark/results/b1_scored.json)
- 재현 방법은 문서 끝에 있다.

## 1. 요약: Gemini Nano는 routing과 TODO 추출에서 baseline보다 낫지 않음. 초안 생성에서만 가치가 있으나 절반만 쓸 만함

- **Platform:** 실제 동작하는 경로는 Mattermost 웹(Chrome 148 이상)과 webapp plugin, Gemini Nano를 결합한 것 하나뿐이다(V).
- **Action Space 가설:** 방향은 지지된다. B는 A 대비 accuracy가 +11.4%p 높고 p95 latency가 64% 낮다. 다만 B의 절대 성능이 사전 등록 기준 5개 중 3개를 충족하지 못했다.
  - accuracy 87.1% (기준 90% 이상)
  - routing p95 2.67초 (기준 1초 이하)
  - extraction p95 5.9초 (기준 3초 이하)
- FAIL 조건(accuracy 80% 미만 또는 structured 95% 미만)에는 해당하지 않는다.
- **B2 Hybrid 결과(8b절):** accuracy 89.5%, p95 1.48초로 사전 등록 기준에 따라 FAIL이다.
- **B3 원인 분리(8c절):** latency의 주원인은 schema의 입력 주입(+252ms)과 JSON 출력 길이(+313ms)다. constrained decoding 자체는 +101ms로 작다.
- **B4(8d절):** p95가 **0.95초로 latency 기준을 충족**했다. accuracy는 **89.5%로 1건 차이 미달**이어서 FAIL이다. 미노출 held-out 60개에서는 91.7%, p95 0.89초였다.
- **B5 CLARIFY(8e절):** FAIL이다. 모델은 모호한 명령 40개 중 9개만 되물었다. action을 하나 추가하자 기존 NO_ACTION 판단이 회귀했다(clear 228에서 216으로).
- **F001-E1 분류기 하이브리드(8f절):** 독립 test set에서 FAIL이다. CLARIFY recall은 95%였다. 그러나 과잉 되묻기가 9.3%였고 accuracy는 89.4%였다. 원인은 키워드 사전이 처음 보는 어휘를 CLARIFY로 보낸 것이다.
- **F001-E2 분류기 v3(8g절):** 두 번째 독립 test set에서 **PASS**했다(accuracy 90.2%, recall 89.5%, 과잉 되묻기 4.4%, p95 0.95초). 다만 accuracy 여유가 1건, 과잉 되묻기 여유가 0건이고 측정은 1회뿐이다.
- **F001-E3 확인 실험(8h절):** **FAIL(0/3)**. 독립 test set 369개로 3회 반복했고, accuracy는 84.6~85.4%였다(95% CI 약 81~89%). 나머지 기준은 모두 충족했다. E2의 PASS는 유리한 표본이었다.
- **F002-E1 학습 게이트(8i절):** **PARTIAL(1/3)**. 세 run 모두 accuracy 93.8~94.1%(95% CI 하한 90.8% 이상), 과잉 되묻기 0%, recall 87%로 기준을 넘었다. r2와 r3에서 p95가 1.08~1.09초로 latency 기준을 넘었다. **LLM 없이 9-way 분류기만 써도 92.7%**였다.
- **Electron 45 alpha probe(8j절):** 앱이 등록한 local AI handler로 renderer의 Prompt API가 연결되는 것을 실행으로 확인했다. 모델은 앱이 직접 공급해야 한다.
- **F003-E1 TODO 추출(8k절):** **Nano 증분 가치 없음.** 세 run 모두 Nano F1(0.816~0.864)이 규칙 baseline(0.904)보다 낮았다. Nano가 앞선 지표는 cross-turn recall(1.00 대 0.94)뿐이다. 참고 조건인 Claude Haiku는 0.974로 baseline보다 높았다(순환성 주의).
- **F004-E1 답장 초안(8l절):** 템플릿 대비 증분 가치는 있다(usable +43~50%p). 그러나 실용 기준은 충족하지 못했다. Nano 초안의 usable은 45~52%, hallucination은 17~25%였다. 참고용 Haiku는 usable 91.7%였다.

## 2. Platform Feasibility

| 플랫폼 | 결과 |
|---|---|
| Desktop | Slack은 FAIL이다. Mattermost Desktop 원본 앱도 FAIL이다. Electron 43에는 Prompt API의 echo stub만 있다(V). 실제 모델을 쓰려면 앱을 포크하고 Electron 45 alpha의 `localAIHandler`를 써야 한다. |
| Web | Mattermost 웹과 Chrome 조합은 PASS다. plugin이 context를 가져오고, Gemini Nano로 추론하고, 구조화된 결과를 돌려주는 흐름이 동작했다(V). |
| Android | NOT_TESTABLE이며 판정은 CONDITIONAL이다. Mattermost는 포크에 native module을 넣어야 하고, Slack은 companion 앱만 가능하다. ML Kit GenAI는 Beta이고 foreground에서만 동작하며 기기도 제한된다(D). |
| iOS | NOT_TESTABLE이며 판정은 CONDITIONAL이다. Mattermost는 포크가 필요하고, Slack은 companion 앱만 가능하다. Foundation Models는 iOS 26 이상, 컨텍스트 4,096 토큰이며 background에서 rate limit이 걸린다(D). |

## 3. Action Space 실험 (B1, n=210, condition당 1회)

- **A (Free-form):** capability 설명과 명령만 준다. 출력은 자유 텍스트이며, 가장 먼저 등장한 action 이름으로 파싱한다.
- **B (Constrained):** A와 같은 capability 설명에 Normalized State, 고정 enum, `responseConstraint` JSON schema를 더한다.
- **C (Cloud):** NOT_RUN. credential이 없었다.
- **Runtime:** Chrome 154, Gemini Nano(`2025.8.8.1141`), Mac M1 16GB. sampling 파라미터는 기본값이다(비결정적).

## 4. Metrics

| Metric | A (Free-form) | B (Constrained) | 기준 (B) | 판정 |
|---|---|---|---|---|
| Action routing accuracy | 75.7% | **87.1%** | 90% 이상 | 미충족 |
| Invalid action rate | 9.0% | **0%** | 1% 미만 | 충족 |
| Structured output success | n/a | **100%** | 99% 이상 | 충족 |
| Ambiguous accuracy | 15/20 | 16/20 | n/a | |
| NO_ACTION precision | 0.84 | 0.95 | n/a | |
| NO_ACTION recall | 0.34 | 0.74 | n/a | |
| Routing first-run | 4.8초 | 2.1초 | n/a | |
| Routing warm p50 | 3.1초 | 2.4초 | n/a | |
| Routing warm p95 | 7.5초 | **2.67초** | 1초 이하 | 미충족 |
| Extraction warm p50 / p95 (n=20) | n/a | 4.4초 / **5.9초** | p95 3초 이하 | 미충족 |
| Session create (cold) | 2.4초 | 1.1초 | n/a | |

Phase A의 cold create는 16.6~17.7초였다.

### Tag별 정확도

| Tag | A | B |
|---|---|---|
| simple | 70/80 | 79/80 |
| colloquial | 22/25 | 23/25 |
| typo | 18/20 | **20/20** |
| short | 14/20 | **20/20** |
| ambiguous | 15/20 | 16/20 |
| multi_intent | **12/15** | 6/15 |
| irrelevant | 2/10 | **10/10** |
| insufficient_context | 0/10 | **0/10** |
| should_not_act | 6/10 | 9/10 |

### 리소스

- **샘플링:** 0.5초 간격으로 2,284개 샘플을 모았다.
- **Model utility process RSS:** p50 281MB, 최대 390MB, CPU p50 22%.
  - 이 값은 **과소 측정이다.** Apple Silicon의 GPU, 통합 메모리 버퍼는 RSS에 잡히지 않는다. 모델 파일만 4.0GB다. 실제 메모리 사용량은 UNKNOWN이다.
- **GPU "Device Utilization %"(시스템 전체):** 실행 중 p50 95%, p95 100%. 추론하는 동안 GPU를 사실상 점유한다.
- **측정하지 않음:** energy와 battery(sudo 필요), NPU.

## 5. 실패 분석

| 실패 유형 | A | B |
|---|---|---|
| wrong-action | 18 | 13 |
| invalid-action | 19 | 0 |
| ambiguous-command | 5 | 4 |
| insufficient-context | 9 | 10 |
| structured-output-failure | n/a | 0 |
| hallucinated-parameter / action | `SEARCH_FILES`, `SEND_MESSAGE` 등 존재하지 않는 capability를 만들어 냄 | 0 (enum이 차단) |
| timeout / model-unavailable | 0 | 0 |

**A의 invalid 19건.** 대부분 NO_ACTION에 해당하는 응답이었다("Okay, canceling", "You're welcome").
- 모델이 action 이름을 말하지 않아 invalid로 처리되었다. 사전 등록 규칙에 따른 처리다.
- 민감도 분석(사전 등록 외): gold가 NO_ACTION인 무응답 11건을 정답으로 인정해도 A는 81.0%다. B와의 차이는 6.1%p로 여전히 5%p 이상이다.

**B의 insufficient_context 0/10.** State에 메시지가 0건이거나 스레드가 없는데도 모델이 행동을 선택했다. **State를 주는 것과 모델이 State를 쓰는 것은 다르다.**

**B의 multi_intent 6/15 (A는 12/15).** B는 "먼저 요청된 action"이 아니라 최종 산출물의 action을 골랐다.
- 예: "요약해서 답장으로 만들어줘"에 DRAFT_REPLY를 선택했다.
- gold 규칙 자체가 논쟁적일 수 있다. B1 점수는 바꾸지 않는다.
- B 오답 27건 중 19건이 이 두 tag(multi_intent, insufficient_context)에 몰려 있다. insufficient_context 10건을 제외한 200건의 정확도는 183/200 = 91.5%다(사전 등록 외 참고치).

**Extraction 품질(채점하지 않음).** FIND_DECISIONS 출력에 제안("~가 좋을 것 같아요")이 포함되는 문제가 Phase A에 이어 재현되었다.

## 6. Action Space가 실제로 개선한 것

- **출력 신뢰성:** invalid 9.0%가 0%로, structured output 성공률이 100%가 되었다. 존재하지 않는 capability(`SEARCH_FILES`)를 만들어 내는 일이 사라졌다.
- **거절 판단:** irrelevant 2/10이 10/10으로, should_not_act 6/10이 9/10으로, NO_ACTION recall 0.34가 0.74로 올랐다.
- **노이즈 내성:** typo와 short 모두 20/20이다.
- **Latency:** 출력이 짧아져 p95가 7.5초에서 2.67초로 64% 줄었다. tail이 크게 짧아졌다.

## 7. 개선하지 못한 것

- **절대 latency:** routing 1회에 약 2.4초, 추출에 약 4.4초가 걸린다. State JSON의 prefill이 주된 비용으로 추정된다(I). "즉시 반응하는 UX"는 이 runtime으로 불가능하다.
- **State 기반 전제 조건 판단:** 대상이 존재하는지 모델이 확인하지 못한다(0/10).
- **multi-intent 처리:** 하나의 action으로 표현할 수 없는 명령은 구조적인 한계다.
- **추출 품질:** 결정과 제안을 구분하지 못한다.

## 8. 제품 제약

- **환경:** Chrome 전용이다. 16GB RAM 또는 VRAM 4GB 초과, 여유 공간 22GB, 모델 다운로드 4GB가 필요하다. 탭이 열려 있을 때만 동작한다. 망분리 환경에서는 모델 배포 자체가 문제다(I).
- **GPU 점유:** 추론하는 동안 GPU를 거의 100% 쓴다. 상시 백그라운드 분석에는 부적합하다.
- **컨텍스트:** 9,216 토큰. 여러 채널을 모아 보는 "Inbox"류 기능은 chunking과 다회 호출이 필요하다. 그러면 latency가 곱으로 늘어난다.
- **경쟁:** Mattermost는 공식 Agents plugin(`mattermost-ai`)을 기본 번들로 제공한다. 서버 preview 컨테이너에서 확인했다(V).

## 8b. Experiment B2: Hybrid routing

사전 등록 문서는 [preregistration-b2.md](benchmark/preregistration-b2.md)이고, 원자료는 [b2.json](benchmark/results/b2.json)이다. B1 B 대비 두 가지만 바꿨다.

- State 전문 대신 메타데이터 한 줄을 넣었다.
- 결정론적 전제 조건 guard를 추가했다.

| Metric | B1 B | B1r (재현) | B2-model (guard 전) | **B2-final** | 기준 |
|---|---|---|---|---|---|
| Accuracy | 87.1% | 86.7% | 84.3% | **89.5%** (188/210) | 90% 이상, 미충족 |
| insufficient_context | 0/10 | 0/10 | 0/10 | 10/10 | n/a |
| insufficient_context 제외 200건 | 183/200 (91.5%) | 182/200 | n/a | 178/200 (89.0%) | 5%p 이상 하락이면 품질 저하로 기록. -2.5%p라 미해당 |
| Routing warm p50 | 2.38초 | 2.31초 | n/a | 1.36초 | n/a |
| Routing warm p95 | 2.67초 | 2.63초 | n/a | **1.48초** | 1초 이하, 미충족 |
| Invalid / structured | 0% / 100% | 0% / 100% | n/a | 0% / 100% | 충족 |

### 해석

**B1 결과는 재현된다.**
- B1r은 B1과 accuracy 차이 0.4%p, p95 차이 0.04초다.
- run-to-run 변동은 작다. 실행 순서 효과도 무시할 만한 수준이다(V).

**메타데이터만으로는 모델이 대상 존재 여부를 판단하지 못한다.**
- B2-model의 insufficient_context는 0/10이다.
- 10/10은 전적으로 코드 guard의 효과다. guard는 같은 dataset의 실패를 본 뒤 설계했으므로 과적합이다(사전 명시).
- 결론: 전제 조건 판단은 모델이 아니라 코드가 맡아야 한다.

**State를 빼면 latency는 43% 줄지만 1초 아래로 내려가지 않는다.**
- p50이 1.36초이고 분포가 좁다(p95 1.48초). 이 runtime의 고정 비용이 1초를 넘는다는 뜻이다.
- 같은 세션에서 "OK"를 돌려받는 단순 prompt는 약 0.3초였다(Phase A). 따라서 이 고정 비용의 출처는 다음 중 하나로 추정된다(I).
  - 구조화 출력 제약
  - schema가 input에 추가되는 것
  - 한국어 토큰
- 원인 분리는 하지 않았다.

**State를 빼면 잃는 것도 있다.**
- irrelevant가 10/10에서 4/10으로 떨어졌다. "날씨" 같은 질문이 SEARCH_MESSAGES로 갔다.
- multi_intent는 6/15에서 11/15로 올랐다.
- 결과적으로 State는 "업무와 무관한 요청인가"를 판단하는 데 쓰이고 있었다(I).

## 8c. Experiment B3: 구조화 출력 latency 원인 분리 (진단 실험)

- 사전 등록: [preregistration-b3.md](benchmark/preregistration-b3.md)
- 원자료: [b3.json](benchmark/results/b3.json)
- 분석: [b3_analysis.txt](benchmark/results/b3_analysis.txt)
- 실험 조건: 53 item × 5 condition, 모두 `promptStreaming`, item마다 condition 순서를 회전, 오류 0건.

| Condition | 구성 | total p50 | total p95 | TTFT p50 | decode p50 | 토큰 증가량 | 정확도 (참고치) |
|---|---|---|---|---|---|---|---|
| C1 | B2 재현 (제약 ON, schema를 입력에 추가) | 1,279ms | 1,358ms | 734ms | 530ms | 128 | 42/53 |
| C2 | 제약 ON, schema를 입력에서 생략 | 1,014ms | 1,158ms | 479ms | 567ms | 54 | 44/53 |
| C3 | 제약 OFF, JSON 지시만 | 916ms | 1,147ms | 401ms | 552ms | 54 | 45/53 |
| C4 | 제약 OFF, action 이름만 출력 | **602ms** | **742ms** | 406ms | 207ms | 49 | 45/53 |
| C5 | C3에서 system prompt의 CAPS 설명 제거 | 927ms | 1,069ms | 404ms | 559ms | 54 | 38/53 |

토큰 증가량은 호출 전후 `inputUsage` 차이이며, 입력과 출력이 모두 포함된다.

### 요인 귀속

paired 중앙값 차이가 200ms 이상이면 주요 원인으로 판정한다(사전 등록 규칙).

| 요인 | 비교 | 차이 | 판정 | 설명 |
|---|---|---|---|---|
| schema가 입력에 추가됨 | C1−C2 | +252ms (TTFT +255ms) | **주요 원인** | 입력 약 74토큰이 늘어 prefill이 길어진다 |
| constrained decoding | C2−C3 | +101ms | 무시할 수준 | 토큰 생성 제약 자체의 비용은 작다 |
| 출력 길이 (JSON 래퍼 대 이름만) | C3−C4 | +313ms (decode +317ms) | **주요 원인** | 출력 약 10토큰 대 5토큰. 토큰당 약 55ms |
| system prompt 길이 | C3−C5 | 0ms | 무시할 수준 | `clone()`이 system prompt prefill을 재사용한다(V). 단, CAPS 설명을 빼면 정확도가 45/53에서 38/53으로 떨어진다 |

### 결론

- B2 latency 약 1.3초는 다음 세 부분으로 나뉜다.

| 구성 요소 | 시간 |
|---|---|
| 고정 비용 (사용자 메시지 prefill과 첫 토큰 약 400ms, 짧은 출력 decode 약 200ms) | 약 600ms |
| schema의 입력 주입 | 약 250ms |
| JSON 래퍼 출력 | 약 300ms |
| constrained decoding | 약 100ms |

- "구조화 출력이 느리다"는 말의 실체는 decoding 제약이 아니다. **schema 텍스트가 prompt에 추가되는 비용**과 **JSON 문법만큼 길어진 출력**이 원인이다.
- 1초 이하(p95)를 달성한 구성은 C4 하나뿐이다. 다만 C4는 출력 제약이 없어 invalid action 위험을 다시 연다.

### B4 후보 (실행하지 않음)

- 다음 구성을 B1·B2와 같은 210개 dataset과 같은 기준으로 새로 사전 등록할 수 있다.
  - `responseConstraint`: enum만 담은 문자열 schema
  - `omitResponseConstraintInput: true`
  - CAPS 설명 유지
  - 코드 guard
- 예상 latency는 C4보다 약 100ms 높은 수준이다. 이는 추정(I)이다.
- B3의 숫자만으로 B2 판정을 뒤집지 않는다.

## 8d. Experiment B4: Minimal-output constrained routing

- 사전 등록: [preregistration-b4.md](benchmark/preregistration-b4.md)
- 원자료: [b4.json](benchmark/results/b4.json)
- constraint mode: `schema` (fallback은 사용하지 않음)

| Metric | B2-final | **B4-final (주 210개)** | B4 held-out (60개, 미노출) | 기준 |
|---|---|---|---|---|
| Accuracy | 89.5% | **89.5%** (188/210) | 91.7% (55/60) | 90% 이상: **미충족** (1건 부족) |
| Routing warm p50 / p95 | 1.36초 / 1.48초 | **0.82초 / 0.95초** | 0.80초 / 0.89초 | p95 1초 이하: **충족** |
| Invalid action | 0% | 0% | 0% | 1% 미만: 충족 |
| Structured output | 100% | 99.5% (runtime 오류 1건) | 100% | 99% 이상: 충족 |
| B4-model (guard 적용 전) | 84.3% | 84.3% | 85.0% | n/a |
| insufficient_context, 모델 단독 | 0/10 | 0/10 | 0/4 | n/a |
| insufficient_context 제외 정확도 | 178/200 | 178/200 | 51/56 | n/a |
| NO_ACTION precision / recall | 0.93 / 0.81 | 0.91 / 0.87 | 1.00 / 0.88 | n/a |
| ambiguous | 15/20 | **11/20** | 4/6 | n/a |
| multi_intent | 11/15 | 10/15 | 3/4 | n/a |
| irrelevant | 4/10 | 8/10 | 2/4 | n/a |

**리소스.** 모델 프로세스 RSS는 p50 264MB, 최대 446MB다. GPU 메모리가 포함되지 않아 실제보다 작게 측정된 값이다. GPU 사용률은 p50 94%다.

**판정: 사전 등록 규칙상 FAIL.** accuracy가 1건 차이로 미달했다.

- 미달한 1건은 c072 "고마워"(gold NO_ACTION)다. 모델 호출에서 `UnknownError: kErrorUnknown`이 발생했다. 사전 등록 규칙대로 실패로 처리했다.
- 민감도: 이 오류가 정답이었다면 189/210 = 90.0%로 기준을 충족한다. 그러나 runtime 오류는 실제 제품에서도 발생하는 실패다. 따라서 판정은 바꾸지 않는다.

**해석.**

- **Latency 문제는 해결되었다(V).** B3에서 찾은 두 원인을 제거했다. 하나는 schema를 입력에 주입하던 것이고, 다른 하나는 JSON wrapper 출력이다. 그 결과 p95가 1.48초에서 0.95초로 줄었다. 분포 꼬리가 1초에 붙어 있어 여유는 50ms에 불과하다. 기기 부하가 걸리면 넘을 수 있다(I).
- **과적합 신호는 없다.** 미노출 held-out의 정확도가 91.7%로 주 dataset보다 높다. held-out의 p95도 0.89초다. 다만 n=60이므로 신뢰구간이 넓다(약 ±7%p).
- **Accuracy는 89.5% 근처에서 정체되어 있다.** B2와 B4가 모두 188/210이다. 출력 형식을 바꿔도 모델의 routing 능력 자체는 그대로다. 남은 오답은 ambiguous(9건)와 multi_intent(5건)에 몰려 있다. 이는 action 하나로 표현할 수 없는 명령, 그리고 gold 규칙 자체가 논쟁적인 명령이다.
- **trade-off가 있다.** 출력 형식을 줄이자 ambiguous는 15/20에서 11/20으로 떨어졌고, irrelevant는 4/10에서 8/10으로 올랐다.

## 8e. Experiment B5: CLARIFY(되묻기) action

- 사전 등록: [preregistration-b5.md](benchmark/preregistration-b5.md)
- 원자료: [b5.json](benchmark/results/b5.json)
- 채점: [b5_scored.json](benchmark/results/b5_scored.json)
- 구성: B4에 CLARIFY 한 줄을 추가하고, enum을 9개로 늘렸다.

| 기준 | B4 (B5 규칙으로 재채점) | **B5** | 목표 | 판정 |
|---|---|---|---|---|
| 전체 accuracy | 243/270 (90.0%) | **245/310 (79.0%)** | 90% 이상 | 미충족 |
| CLARIFY recall (신규 underspecified 40) | 해당 없음 (CLARIFY를 출력할 수 없음) | **9/40 (22.5%)** | 80% 이상 | 미충족 |
| 과잉 되묻기 (clear 244) | 0% | 7/244 (2.9%) | 5% 이하 | 충족 |
| Routing p95 | 0.95초 | 0.93초 | 1초 이하 | 충족 |
| Invalid / structured | 0 / 269/270 | 0 / 310/310 | n/a | 충족 |

**그룹별 정답 수 (B4 → B5)**

| 그룹 | B4 | B5 |
|---|---|---|
| clear | 228/244 | **216/244** |
| leaning | 15/26 | 20/26 |
| underspecified | 해당 없음 | 9/40 |

**판정: FAIL.** 기준 6개 중 2개가 미충족이다. 미충족 항목은 accuracy와 CLARIFY recall이다.

**해석**

1. **모델은 모호함을 감지하지 못한다(V).**
   - "해줘", "그거 다시", "이거 좀 처리해줘" 같은 명령 40개 중 31개에서 되묻지 않고 임의의 action을 골랐다.
   - 고른 action은 SEARCH 10, TODOS 7, DECISIONS 7, DRAFT 3, 기타 4이다.
   - CLARIFY를 enum에 넣는 것만으로는 되묻기 행동이 생기지 않는다.
2. **action 하나를 추가하자 기존 판단이 무너졌다(V).**
   - clear 그룹에서 정답이 오답으로 바뀐 것이 15건, 오답이 정답으로 바뀐 것이 3건이다.
   - 회귀의 대부분은 업무 밖 요청이나 금지된 요청에서 나왔다. 이 요청들은 B4에서 모두 NO_ACTION으로 맞혔던 것이다.
     - 7건은 CLARIFY로 바뀌었다. 예: "넌 누구야?", "노래 추천해줘".
     - 나머지는 임의의 action으로 바뀌었다. 예: "오늘 날씨 어때?"는 EXTRACT_TODOS, "이 스레드 아카이브해줘"는 FIND_DECISIONS가 되었다.
   - 소형 모델의 routing은 prompt와 enum의 작은 변경에도 민감하다. 그래서 action space를 확장할 때마다 전체 회귀 테스트가 필수다.
3. **leaning 그룹(기존 ambiguous)은 개선되었다.** 15/26에서 20/26이 되었다. 다만 이 그룹은 CLARIFY도 정답으로 인정하는 채점 규칙이 적용되므로, 그 효과가 섞여 있다.
4. **결론:** 되묻기를 하려면 "모호하다"는 판단을 모델이 아닌 곳에서 해야 한다. 이 runtime의 모델에게 그 판단을 맡길 수 없다.

## 8f. F001-E1: 결정론적 사전 분류기 + 모델 + guard

- 사전 등록: [f001/preregistration.md](benchmark/f001/preregistration.md)
- 분류기: [preclassify.js](benchmark/f001/preclassify.js). sha256으로 동결했다.
- test set: [testset.json](benchmark/f001/testset.json). 규칙을 모르는 별도 에이전트가 작성했다. 200개 중 dev와 완전히 같은 문장 2건을 빼서 198개다.
- 원자료: [f001.json](benchmark/results/f001.json)

| 기준 | M (모델 단독, B4 구성) | **P (분류기 + 모델 + guard)** | 목표 | 판정 |
|---|---|---|---|---|
| 전체 accuracy | 144/198 (72.7%) | **177/198 (89.4%)** | 90% 이상 | 미충족 |
| CLARIFY recall | 0/40 | **38/40 (95%)** | 80% 이상 | 충족 |
| 과잉 되묻기 | 0/140 | **13/140 (9.3%)** | 5% 이하 | 미충족 |
| p95 (모델 호출 113건) | n/a | 0.95초 | 1초 이하 | 충족 |
| Invalid / structured | n/a | 0 / 113/113 | n/a | 충족 |

그룹별 결과는 다음과 같다.

| 그룹 | M | P |
|---|---|---|
| clear | 128/140 | 122/140 |
| leaning | 16/18 | 17/18 |
| under | 0/40 | 38/40 |

**판정: FAIL.** 기준 6개 중 2개가 미충족이다.

**해석**

1. **구조는 목표 능력을 만들어 냈다(V).**
   - 모호성 감지는 B5에서 모델이 했을 때 9/40이었고, 이번에 분류기로 38/40이 되었다.
   - accuracy는 M 대비 +16.7%p다.
   - 모델이 못 하는 판단을 결정론적 계층으로 옮기는 방향은 유효하다.
2. **실패 원인은 키워드 사전의 개방 어휘 문제다(V).**
   - P의 오답 21건은 규칙 오류 16건, 모델 오류 5건이다.
   - 규칙 오류의 대부분은 "알려진 단서가 없으면 CLARIFY"라는 기본값에서 나왔다. 사전에 없는 단어는 전부 되묻기가 되었다.
     - 업무 밖 요청: 넷플릭스, SQL, 운세, 산, "비 온대?"
     - 인사: "좋은 아침이에요!"
     - 새로운 표현: "찔러줘", "박았어", "뭔 얘기", "보관 처리"
     - 오타: "겁색"
   - 그 결과 clear 그룹은 오히려 M보다 6건 나빠졌다(128에서 122).
3. **dev에서 test로 넘어가며 성능이 떨어졌다.** dev는 95.8%, test는 89.4%로 6.4%p 차이다. 사전이 dev 표현에 과적합되었다.
4. **판단이 갈리는 gold.** t147과 t180은 스레드가 없는 상태에서 스레드를 언급한 명령이다. REMIND와 FIND_DECISIONS에는 스레드 존재 여부 guard가 없어서 통과되었다. gold 해석에 따라 오답 여부가 달라질 수 있다. 판정에는 그대로 반영했다.

**사후 관찰 (사전 등록 외, 검증 아님)**

- 기본값을 CLARIFY에서 "모델에 넘김"으로 바꾸고, CLARIFY는 범용 동사나 지시어 패턴("해줘", "처리", "그거" 등)에만 쓰는 변형이 있을 수 있다.
- 이 변형은 과잉 되묻기를 줄일 가능성이 있다.
- 다만 이 아이디어는 이 test set의 오답을 본 뒤에 나왔다. 따라서 이 test set으로는 검증할 수 없다.

## 8g. F001-E2: 분류기 v3 + 모델 + guard (두 번째 독립 test set)

- 사전 등록: [f001/preregistration-e2.md](benchmark/f001/preregistration-e2.md)
- 분류기: [preclassify-v3.js](benchmark/f001/preclassify-v3.js). sha256로 동결했다.
- 계획 변경: E1이 제안한 v2는 E2 실행 전 dev 평가에서 반증되었다. E1 test 기준 recall이 18/40에 그쳤다. 이 경위는 사전 등록 문서에 기록했다.
- test set: [testset-e2.json](benchmark/f001/testset-e2.json). 새 에이전트가 독립적으로 작성했다. 200개 중 dev와 완전히 같은 7건을 제외해 193개다.
- 원자료: [f001-e2.json](benchmark/results/f001-e2.json)
- 브라우저와 node의 분류기 출력 불일치: 0건

| 기준 | M (모델 단독) | **P (v3 + 모델 + guard)** | 목표 | 판정 |
|---|---|---|---|---|
| 전체 accuracy | 139/193 (72.0%) | **174/193 (90.2%)** | ≥ 90% | **충족 (여유 1건)** |
| CLARIFY recall | 0/38 | **34/38 (89.5%)** | ≥ 80% | 충족 |
| 과잉 되묻기 | 0/137 | **6/137 (4.4%)** | ≤ 5% | **충족 (여유 0건)** |
| p95 (모델 호출 125건) | n/a | 0.95초 | ≤ 1초 | 충족 (여유 54ms) |
| Invalid / structured | n/a | 0 / 125/125 | n/a | 충족 |

- 그룹별: clear 124/137, leaning 16/18, under 34/38
- 규칙이 판정한 비율: 62/193
  - NO_ACTION 규칙: 27/27 정답
  - CLARIFY 규칙: 35/41 정답

**판정: 사전 등록 기준으로 PASS.** F000~F001의 실험 가운데 처음이다.

**이 PASS는 매우 아슬아슬하다. 다음 한계를 함께 기록한다.**

- **여유가 거의 없다.** accuracy는 1건만 더 틀려도 89.6%가 되어 FAIL이다. 과잉 되묻기는 1건만 더 생겨도 5.1%가 되어 FAIL이다.
- **측정이 1회뿐이다.** 비결정적인 모델을 1회만 실행했다. B1과 B1r 사이의 변동이 약 ±0.5%p였으므로, 같은 test set으로 재실행해도 FAIL할 수 있다(I).
- **표본이 작다.** n=193이면 accuracy의 95% 신뢰구간은 대략 86~94%다.
- **규칙 오류가 여전하다.** 사전에 없는 구어체("콕 찔러줘", "알람 ㄱ"), 오타("요얃"), 업무 밖 요청("아재개그", "SQL 도와주세요")이 CLARIFY로 잘못 갔다. E1과 같은 실패 유형이다.
- **실행 환경이 하나뿐이다.** Chrome 154, Gemini Nano, M1 16GB 한 대에서만 측정했다. 다른 기기, 모델 버전, 부하 상황에는 일반화되지 않았다.

**해석.**

- 모델 단독(M)은 72.0%다. P와의 차이(+18.2%p)는 거의 전부 underspecified 처리(0/38에서 34/38)에서 나온다.
- clear 그룹은 M 123, P 124로 사실상 같다. E1에서는 분류기가 clear 그룹을 해쳤는데(128에서 122로 하락), v3에서는 그 회귀가 사라졌다.

## 8h. F001-E3: 확인 실험 (v3 동결, 독립 test set 400개, 3회 반복)

- 사전 등록: [f001/preregistration-e3.md](benchmark/f001/preregistration-e3.md)
- test set: [testset-e3.json](benchmark/f001/testset-e3.json). 이전 세트와 완전히 같은 31건을 제외해 n=369.
- 원자료: `benchmark/results/f001-e3-r{1,2,3}.json`
- 요약: [f001-e3_summary.json](benchmark/results/f001-e3_summary.json)

| Run | Accuracy | Wilson 95% | CLARIFY recall | 과잉 되묻기 | p95 | 미충족 기준 |
|---|---|---|---|---|---|---|
| r1 | **315/369 (85.4%)** | 81.4–88.6% | 54/65 (83%) | 12/268 (4.5%) | 0.95초 | accuracy |
| r2 | **313/369 (84.8%)** | 80.8–88.1% | 54/65 | 12/268 (4.5%) | 0.95초 | accuracy |
| r3 | **312/369 (84.6%)** | 80.5–87.9% | 54/65 | 12/268 (4.5%) | 0.95초 | accuracy |

invalid는 3회 모두 0이다. structured output은 3회 모두 267/267이다. 모델 호출 279건 중 run 간 예측 불일치는 18건(6.5%)이다.

**판정: FAIL (0/3).** 세 run 모두 accuracy 한 기준만 미충족했다. 나머지 다섯 기준은 세 run 모두 충족했다.

### 해석

**1. E2의 PASS(90.2%)는 유리한 표본이었다.**

| 실험 | 독립 test set 크기 | accuracy |
|---|---|---|
| E1 | n=198 | 89.4% |
| E2 | n=193 | 90.2% |
| E3 | n=369 × 3회 | 84.6~85.4% |

세 독립 test set을 종합하면 이 구조의 실제 accuracy는 **약 85~89%**다(I). 사전 등록한 90%에 닿지 않는다. 확인 실험을 하지 않았다면 E2 결과만 보고 잘못된 GO를 냈을 것이다.

**2. 이번에는 모델 오류가 주원인이다.** r1 오답은 규칙 15건, 모델 54건이었다(규칙 15, 모델 39). 주요 모델 오류는 다음과 같다.

| 오류 유형 | 결과 | 예시 |
|---|---|---|
| 업무 밖 일반 질문을 SEARCH_MESSAGES로 보냄 | irrelevant 11/20 | "서울 인구가 몇 명이야?", "블랙홀은 왜…", "미세먼지 예보" |
| 스레드가 없는 상태에서 스레드 대상 작업을 실행 | insufficient_context 10/15 | READ_THREAD 외 action(TODOS, SUMMARIZE, DRAFT, REMIND, DECISIONS)에는 guard가 스레드 존재를 검사하지 않음 |
| multi-intent에서 나중 action을 선택 | multi_intent 15/20 | |
| 결정, 할 일, 요약을 혼동 | | "담당 정해진 거 있어?" → FIND_DECISIONS |

insufficient_context 실패는 guard 설계의 빈틈에서 나왔다. **동결 원칙에 따라 이번 실험에서는 수정하지 않았다.**

**3. 규칙 오류는 E1, E2와 같은 유형이다.** 사전에 없는 인사("굿모닝", "점심 맛있게 드세요~", "안뇽하세요"), 오타("결졍", "검섹"), 놀이성 요청("끝말잇기", "삼행시")이 CLARIFY로 갔다. 키워드 사전의 개방 어휘 한계가 세 번째로 재현되었다.

**4. Gold 쟁점.** 다음 세 항목은 s_ch_long 상태에서 READ_THREAD가 gold로 지정되어 있다. 이 상태에는 답글 정보가 없어서 guard가 NO_ACTION으로 바꿨다.

- g274
- g309
- g311

세 항목을 정답으로 인정해도 318/369(86.2%)이므로 판정은 바뀌지 않는다.

## 8i. F002-E1: 학습된 소형 게이트 분류기 + 모델 + guard v2

- 사전 등록: [f002/preregistration.md](benchmark/f002/preregistration.md)
- 분류기: char 1–3 TF-IDF + 로지스틱 회귀, 229KB JSON, 브라우저 JS 추론. `frozen.sha256`로 동결했다.
- 학습 데이터: 지금까지 라벨링한 1,070개
- test set: 네 번째 독립 test set. 학습 데이터와 겹친 45건을 제외해 n=355
- 원자료: `benchmark/results/f002-r{1,2,3}.json`
- 채점 결과: [f002_scored.json](benchmark/results/f002_scored.json)

| Run | **P accuracy** (Wilson 95%) | CLARIFY recall | 과잉 되묻기 | p95 (모델 호출) | 판정 |
|---|---|---|---|---|---|
| r1 | **334/355 = 94.1%** (91.1–96.1%) | 54/62 (87%) | 0/259 (0%) | 0.97초 | 충족 |
| r2 | **334/355 = 94.1%** | 54/62 | 0% | **1.08초** | p95 미충족 |
| r3 | **333/355 = 93.8%** (90.8–95.9%) | 54/62 | 0% | **1.09초** | p95 미충족 |

invalid는 0이고 structured는 100%다. 세 run 사이에 P 예측이 달라진 항목은 8/355다.

**판정: PARTIAL (1/3).** 세 run 모두 **accuracy는 기준을 넉넉히 넘었다.** 신뢰구간 하한도 90.8% 이상이다. 미충족 원인은 r2와 r3의 **latency tail**이다.

- r1: p50 840ms, 1초 초과 4건
- r2: p50 901ms, 1초 초과 33건
- r3: p50 870ms, 1초 초과 36건

p95가 r1의 0.97초에서 r2·r3의 1.08~1.09초로 올라갔다. 원인은 UNKNOWN이다. 같은 기기에서 E3 때는 p50이 821ms였다. B4 때 이미 "여유 50ms라 부하에 취약하다"고 예상했던 위험이 실제로 나타났다.

**같은 test set으로 함께 측정한 비교 (판정 외)**

| 파이프라인 | accuracy | 과잉 되묻기 | 비고 |
|---|---|---|---|
| **P (학습 게이트 + Nano + guard v2)** | 93.8–94.1% | 0% | |
| P with guard v1 | 93.0–93.2% | 0% | guard v2 효과는 +0.9%p |
| 키워드 v3 + Nano + guard v2 | 89.0–89.3% | 6.9% | 키워드 계층의 실패가 다시 확인되었다 |
| **9-way 분류기 단독 + guard v2 (LLM 없음)** | **92.7%** (89.5–95.0%) | 0% | 결정론적이다. 추론 시간은 ms 미만이다(I) |

**해석.**

1. **학습 게이트가 키워드 계층을 대체했다(V).** 같은 모델 호출 결과를 놓고 비교하면 accuracy는 +4.8%p, 과잉 되묻기는 6.9%에서 0%로 줄었다.
2. **Gemini Nano가 더하는 가치는 작다(V).** LLM 없이 9-way 분류기만 써도 92.7%다. Nano를 더한 P와의 차이는 1.4%p(5건)이고 신뢰구간이 겹친다. 사전 등록 규칙("9-way 단독이 P와 같거나 높으면 Nano의 추가 가치 없음")은 충족하지 않았다. 9-way가 P보다 낮기 때문이다. 다만 차이는 통계적으로 구분되지 않는다. 9-way 단독은 1초 latency 기준 문제도 없다.
3. **주의할 점**
   - 학습 데이터와 test set 모두 **LLM 에이전트가 작성한 합성 데이터**다. 실제 사용자 명령에서의 성능은 측정한 적이 없다. 남은 가장 큰 위험이다.
   - 이번 test set에는 에이전트가 금지어를 엄격하게 해석해 "해줘"가 하나도 없다. 이전 세트와 분포가 다르다. 키워드 v3에는 불리하게 작용했을 수 있다.
   - P의 r1 오답 21건 중 18건은 모델 쪽에서 나왔다. 결정/요약 혼동, multi-intent, 업무 밖 요청을 SEARCH로 보내는 경우 등이다.

## 8j. Electron 45 alpha: local AI handler probe

- 코드와 로그: [probes/electron45-localai/](probes/electron45-localai/)
- 실행 환경: Electron 45.0.0-alpha.14, Chromium 156
- 방법: utility process에 **dummy 모델**을 handler로 등록했다. 실제 LLM은 쓰지 않았다. renderer에서 호출이 handler까지 전달되는지만 확인했다.

| 조건 | `typeof LanguageModel` | availability | `create` + `prompt` |
|---|---|---|---|
| handler 등록 + `enableBlinkFeatures: 'AIPromptAPI'` | function | **available** | **성공.** 응답이 `HANDLER_OK …`로 돌아왔다 |
| handler 등록, blink feature 없음 | function | available | 성공 |
| handler 없음, blink feature 있음 | function | **unavailable** | `NotSupportedError` |
| handler 없음, blink feature 없음 | function | unavailable | `NotSupportedError` |

**확인된 사실 (V)**

1. **plumbing이 동작한다.** renderer의 `LanguageModel.create()`와 `prompt()`가 앱 main process에 등록한 utility process handler까지 전달되었다. handler에는 `webContentsId`, `securityOrigin`, `frameToken`, `renderProcessId`가 넘어온다. 따라서 앱이 origin별로 허용 여부를 결정할 수 있다.
2. **이 빌드에서는 `enableBlinkFeatures`가 필요 없었다.** 이는 PR 문서의 설명과 다르다. alpha 단계라 바뀔 수 있다.
3. **handler가 없으면 `unavailable`을 반환한다.** Electron 43은 에코 stub과 `downloadable`을 반환했다. 45에서는 거짓 PASS를 내는 함정이 사라졌다.
4. **`responseConstraint`는 handler가 직접 구현해야 한다.** Electron은 options에 constraint를 전달한다. 동시에 입력 끝에 "Remember to respond in JSON that follows this JSON Schema…" 문장을 자동으로 덧붙인다. B3에서 latency를 늘린 주원인으로 확인한 "schema 입력 주입"과 같은 방식이다. constrained decoding 자체는 handler가 맡는다.

**확인하지 못한 것**

- 실제 로컬 LLM(예: GGUF)을 연결한 추론, 그 latency와 메모리
- Mattermost Desktop 안에서의 동작: handler 등록은 앱 main process만 할 수 있다. webapp plugin으로는 불가능하므로 포크가 필요하다.
- stable 릴리스 시점과 API 변경 여부

**의미.** Desktop 경로는 "Mattermost Desktop 포크 + Electron 45 + 우리가 고른 로컬 모델" 조합으로 **기술적으로는 열렸다.** 이는 문서 확인이 아니라 실행으로 확인한 결과다. 다만 모델이 Gemini Nano가 아니다. 따라서 F000~F002의 Nano 측정치는 그대로 이전되지 않는다.

## 8k. F003-E1: TODO 추출에서 Nano의 증분 가치

- 사전 등록: [f003/preregistration.md](benchmark/f003/preregistration.md)
- test: 독립 에이전트가 작성한 대화 60개, gold TODO 100개(cross-turn 33개)
- 채점 원본: [test_scored.txt](benchmark/f003/results/test_scored.txt)
- 동결 파일 해시 검증: 모두 OK

| 조건 | F1 | strict F1 (담당자와 기한까지 일치) | 기한 정확도 | cross-turn recall | distractor FP | no_todo FP | latency p50 / p95 |
|---|---|---|---|---|---|---|---|
| **A. 규칙 baseline** | **0.904** | **0.779** | 0.862 | 0.939 | 4 | 1 | ms 미만 (I) |
| B. Nano r1 | 0.864 | 0.655 | 0.800 | **1.000** | 16 | 4 | 3.5초 / 6.6초 |
| B. Nano r2 | 0.816 | 0.691 | 0.868 | 1.000 | 21 | 7 | 3.5초 / 7.1초 |
| B. Nano r3 | 0.848 | 0.679 | 0.821 | 1.000 | 19 | 4 | 3.6초 / 6.8초 |
| C. Claude Haiku (참고용, 순환성 있음) | 0.974 | 0.944 | 0.968 | 0.970 | 0 | 0 | 비교 불가 |

**Nano − baseline F1 차이 (bootstrap 95% CI)**

| run | 차이 | 95% CI |
|---|---|---|
| r1 | −0.040 | −0.108 ~ +0.022 |
| r2 | −0.088 | −0.161 ~ −0.021 |
| r3 | −0.056 | −0.119 ~ +0.007 |

Haiku − baseline 차이는 F1 +0.071(CI +0.029 ~ +0.115), strict F1 +0.165(CI +0.096 ~ +0.241)이다.

**판정: Nano 증분 가치 없음.** 세 run 모두 Nano F1 − baseline F1 ≤ 0이었다(사전 등록 규칙). strict F1에서도 세 run 모두 baseline보다 낮았다(−0.09 ~ −0.12).

**해석**

1. **Nano가 앞선 단계는 cross-turn recall 하나다(보조 지표).** 세 run 모두 1.000이었고 baseline은 0.939였다. 여러 메시지에 걸친 할 일은 Nano가 더 잘 잡는다. 이 단계가 사전에 예상한 LLM의 강점이었고, 실제로 확인되었다.
2. **이득보다 손실이 크다.** Nano는 결정이나 일정을 할 일로 잘못 잡았다(distractor FP 16~21건, baseline은 4건). 할 일이 없는 대화에서도 할 일을 만들었다(4~7건). 기한 정확도도 낮았다. 전체적으로 precision이 0.74~0.79에 그쳤다. B1과 B5에서 본 "판단 경계가 약하다"는 문제가 추출에서도 재현되었다.
3. **더 강한 LLM은 추가 가치를 냈다(참고, 순환성 주의).** Haiku는 strict F1에서 baseline보다 +0.165 높았고, distractor FP는 0건이었다. 따라서 "LLM은 TODO 추출에 필요 없다"가 아니라 **"Nano 수준의 모델은 규칙보다 못하고, 더 강한 모델은 낫다"**로 읽어야 한다. 다만 gold와 Haiku가 같은 Claude 계열이라 이 차이는 과대평가되었을 수 있다.
4. **Latency가 기준을 넘었다.** Nano p95가 6.6~7.1초로 참고 기준 6초를 넘었다. baseline은 사실상 즉시 처리된다.
5. **dev 진단 과정의 부수 발견**
   - Nano에 중첩 JSON schema constraint(객체 배열과 enum 배열)를 걸면 공백 생성 루프에 빠졌다. dev 30/30이 timeout이었다.
   - `Promise.race` 방식의 timeout은 실제 생성을 취소하지 못했다. 그래서 대기열이 연쇄적으로 막혔다. 이것은 harness 버그였고, AbortController로 고쳤다.
   - B1~F002 실험에는 timeout이 0건이었으므로 영향이 없다.

**한계**

- 데이터가 합성이다.
- baseline과 Nano의 튜닝 강도가 다르다.
- task 문장의 품질(요약 표현)은 채점하지 않았다.

## 8l. F004-E1: 답장 초안 생성 품질

- 사전 등록: [f004/preregistration.md](benchmark/f004/preregistration.md)
- 채점: [f004_scored.json](benchmark/f004/results/f004_scored.json)
- test 구성: 독립 에이전트가 작성한 시나리오 60개
- 심사 방식: Claude Opus가 후보 5개를 blind로 심사했다. 시나리오마다 후보 순서를 섞었다.
- 심사 일관성: 12개 시나리오를 재심사했다. usable 일치율은 91.7%, Cohen's κ는 0.83이었다.

| 조건 | **usable** (그대로 보내도 됨) | hallucination | 의도 완전 전달 | 말투 적절 | 자연스러움 (1~5) | 사실 문자열 그대로 | p50 / p95 |
|---|---|---|---|---|---|---|---|
| A. 템플릿 (LLM 없음) | 1.7% | 31.7% | 1.7% | 71.7% | 2.48 | 11/40 | 즉시 |
| B. Nano r1 | **51.7%** | 25.0% | 86.7% | 83.3% | 3.97 | 36/40 | 3.1초 / 4.9초 |
| B. Nano r2 | **48.3%** | 16.7% | 90.0% | 81.7% | 3.92 | 36/40 | 2.9초 / 4.0초 |
| B. Nano r3 | **45.0%** | 25.0% | 83.3% | 81.7% | 3.92 | 34/40 | 2.6초 / 4.1초 |
| C. Claude Haiku (참고용, 순환성 있음) | 91.7% | 0% | 100% | 91.7% | 4.62 | 31/40* | 비교 불가 |

\* Haiku는 날짜 표기 등을 바꿔 써서(예: "10/16~10/18"을 "10월 16일~18일"로) 문자열 검사에서 탈락한 경우가 많다. 심사자는 의도 전달을 100%로 판정했다.

**판정: "템플릿보다는 낫지만 그대로 쓰기는 어렵다."**

- **증분 가치는 충족했다.** Nano의 usable은 템플릿보다 43~50%p 높았다. 95% CI 하한은 세 run 모두 +0.32 이상이었다.
- **실용 기준은 미충족했다.** usable이 45~52%로 기준(80% 이상)에 못 미쳤고, hallucination이 17~25%로 기준(5% 이하)을 넘었다. latency p95는 4.0~4.9초로 기준(6초 이하)을 충족했다.

**Nano 초안이 실패한 이유** (3회 실행, 180개 초안 중 실패 93개의 주된 원인)

| 원인 | 건수 | 예시 |
|---|---|---|
| hallucination | 40 | 의도에 없는 사과("죄송합니다"), 질문을 진술로 바꿈("미뤄도 되는지 여쭤봐줘"를 "확인 중입니다"로), 조건을 장황하게 다시 말함 |
| 말투 오류 | 26 | 반말로 대화하는 동료나 단톡방에 존댓말로 답함 |
| 부자연스러움 | 17 | "저분", "쓸기로", "알려드렸습니다"(시제 오류) |
| 의도 일부 누락 | 10 | |

**해석.**

1. **생성은 Nano가 LLM 없는 방식보다 확실히 나은 유일한 영역이다(V).** 템플릿은 1.7%만 쓸 만했다. 규칙으로는 이 작업을 할 수 없다는 사전 예상이 맞았다.
2. **그러나 Nano 초안의 절반은 고쳐 써야 한다.** 4~6건 중 1건에는 의도에 없는 내용이 섞인다. "자동 답장"이나 "원클릭 전송"에는 쓸 수 없다. **수정을 전제로 한 초안 제안** 정도가 현실적인 용도다(I).
3. **강한 모델과의 격차가 크다.** 같은 지시를 받은 Haiku는 91.7%가 쓸 만했다. 심사자와 같은 Claude 계열이라 과대평가되었을 수 있다. 그래도 차이가 40%p 이상이므로, 순환성만으로 이 격차 전체를 설명하기는 어렵다(I).
4. **템플릿 baseline은 의도적으로 약하게 만든 것이다.** 이 실험에서 증분 가치를 충족한 것은 "규칙으로 생성할 수 없다"는 당연한 사실을 확인한 것에 가깝다. 실질적인 질문은 실용 기준이었고, 그 기준은 충족하지 못했다.

## 9. 결정 (F004-E1 이후, 최종)

중심 질문은 "Nano가 baseline 대비 유의미한 증분 가치를 만드는 작업이 하나라도 있는가?"였다. 세 작업에 대해 이 질문을 측정했다.

| 작업 | baseline | Gemini Nano | 증분 가치 | 실용성 |
|---|---|---|---|---|
| Routing | 분류기 92.7% | 조합 시 93.8~94.1% | 사실상 없음 (+1.4%p, 구분 불가) | n/a |
| TODO 추출 | 규칙 F1 0.904 | F1 0.816~0.864 | **없음** (baseline보다 낮음) | n/a |
| 답장 초안 | 템플릿 usable 1.7% | usable 45~52% | **있음** | **미달** (usable 80% 미만, hallucination 17~25%) |

**결론**

1. 판단형 작업(routing, 추출)은 Nano 없이 소형 분류기와 규칙으로 같거나 더 잘 처리된다(V, 합성 데이터 기준).
2. 생성형 작업에서만 Nano가 대체 불가능한 가치를 낸다. 하지만 초안의 절반은 고쳐 써야 하고, 4~6건 중 1건에는 없는 내용이 섞인다(V).
3. 같은 작업에서 더 강한 LLM(Haiku)은 판단과 생성 모두 baseline과 Nano를 크게 앞섰다(참고, 순환성 주의). **병목은 "on-device"가 아니라 "Nano의 모델 크기와 품질"이다(I).**

**권고**

- "Gemini Nano를 중심에 둔 on-device 업무 에이전트"는 **현 상태로 중단한다.**
- 남는 유일한 제품 형태는 "소형 분류기 routing, 규칙 기반 TODO, Nano가 생성한 **수정 전제 초안**"이다. 다만 가치가 초안 생성 하나에 걸려 있고, 그 품질도 절반 수준이다. 이 형태로 계속할지는 제품 판단이다(사용자가 결정).

## 10. 다음 단계 제안 (하나만)

**F000~F004을 종료하고 결론을 의사결정 문서로 확정한다.**

계속하려면 질문을 하나로 좁힌다. **"더 큰 로컬 모델이면 판단과 생성 모두 실용 기준을 넘는가?"** Electron 45 handler에 GGUF 모델을 연결하고, F003·F004와 같은 test set과 기준으로 재측정한다. 이 경우 모델 크기, 배포, 하드웨어 요구가 새 제약이 된다. 그래서 별도 feature로 사전 등록해야 한다.

## 후속 발견 (구현하지 않음)

- guard 빈틈: READ_THREAD 외 action에도 "스레드를 지칭하는데 스레드가 없음" 검사가 필요하다(E3의 insufficient_context 5건).
- 업무 밖 일반 지식 질문이 SEARCH_MESSAGES로 가는 문제: 키워드 사전이나 프롬프트가 아니라 별도 판별기가 필요하다(E3 irrelevant 11/20).

- **multi-intent:** 단일 action이 아니라 action sequence(plan) 출력이 필요할 수 있다.
- **Extraction 품질:** decision과 proposal을 구분하는 평가 rubric과 gold가 없다. 품질을 판정하려면 별도 dataset이 필요하다.
- **Condition C(cloud):** reference가 없어 "작은 모델의 한계인지 task 정의의 한계인지"를 분리하지 못했다.
- **순서 효과:** A가 먼저, B가 나중에 실행되었다. 모델이 warm된 상태가 B에 약간 유리했을 수 있다. 각 condition의 첫 item을 분리 보고해 완화했지만 완전히 통제하지는 못했다.

## 재현

```bash
cd research/f000/benchmark && python3 make_dataset.py && python3 server.py
```

1. 위 명령으로 dataset을 만들고 서버를 띄운다.
2. 별도 터미널에서 `python3 sampler.py`를 실행한다.
3. Chrome에서 `http://127.0.0.1:8766/runner.html`을 열고 콘솔에서 `startBench()`를 실행한다.
4. 완료 후 `python3 score.py`로 채점한다.
