# F000-B 사전 등록 — Experiment B5: CLARIFY (되묻기) action

- 등록일: 2026-10-04. B4 결과를 본 뒤, B5 실행 전에 등록한다.
- B1~B4 결과와 판정은 수정하지 않는다.

## Action 추가 사유

Phase A 지시서 §8은 "Action을 계속 추가해서 accuracy를 인위적으로 올리지 않는다"고 정한다. 이 원칙과의 관계를 먼저 밝힌다.

- 이번 추가는 사용자의 제품 결정이다(2026-10-04). 내용은 "애매한 명령은 사용자에게 되묻는다"이다.
- 어디에나 CLARIFY를 쓰는 모델은 점수를 받지 못하게 설계한다. 과잉 되묻기 비율을 판정 기준에 포함한다.
- 적용 범위는 **ambiguous 명령에만** 한정한다.
  - multi_intent는 기존 규칙인 "먼저 요청된 action"을 유지한다. 둘 다 해 달라는 명령에 되묻는 것은 UX를 해친다고 판단했다.
  - action sequence는 Future Finding으로 남긴다.

## 구성

B4와 같다. 변경은 다음 두 가지뿐이다.

1. enum에 `CLARIFY`를 추가한다. 총 9개다.
2. CAPS의 `NO_ACTION` 줄 앞에 다음 한 줄을 추가한다.

   `CLARIFY: ask the user a short clarifying question when the command is too vague to choose one action (it could mean two or more different actions and the context does not decide).`

다음 요소는 모두 B4와 동일하다.

- 출력 형식: action 이름 하나, string enum schema, `omitResponseConstraintInput`
- 메타데이터 user message
- 코드 guard. `CLARIFY`는 guard를 통과한다.
- 세션 전략: n=1, 비스트리밍

되묻는 질문 문장 생성은 범위 밖이다. routing만 측정한다.

## Dataset (총 310)

| 그룹 | 출처 | n | 정답 규칙 |
|---|---|---|---|
| clear | 기존 주 210개와 held-out 60개 중 tag가 ambiguous가 **아닌** 것 | 244 | 기존 gold 하나만 정답. CLARIFY는 오답이며 과잉 되묻기로 집계 |
| leaning | 기존 tag가 ambiguous인 것 (주 20, held-out 6) | 26 | {기존 gold, CLARIFY} 중 무엇이든 정답 |
| underspecified | **신규 40개.** B5 실행 전에 작성했고 어떤 실험에도 노출되지 않음 | 40 | CLARIFY만 정답 |

underspecified의 작성 기준은 세 가지다.

- 수행할 동작을 나타내는 동사가 없거나 "해줘", "처리해줘"처럼 모호하다.
- 두 개 이상의 action이 그럴듯하다.
- 대화 상태만으로 하나를 결정할 수 없다.

state는 `s_ch_decisions`, `s_thread_todo`, `s_dm`을 순환 배정한다.

## 판정 기준 (전체 310, guard 적용 후)

| 기준 | 목표 |
|---|---|
| 전체 accuracy (위 정답 규칙) | 90% 이상 |
| CLARIFY recall (underspecified 40) | 80% 이상 (32/40 이상) |
| 과잉 되묻기 비율 (clear 244 중 CLARIFY 예측) | 5% 이하 (12건 이하) |
| Routing p95 (warm) | 1초 이하 |
| Invalid action | 1% 미만 |
| Structured output | 99% 이상 |

- 모든 기준을 충족하면 **PASS**다.
- 하나라도 미충족하면 **FAIL**이다. 미충족한 항목을 명시한다.

## 함께 보고하는 값

- 그룹별 accuracy, 그리고 guard 적용 전 모델 단독 accuracy
- **기준선:** B4 결과(`b4.json`)를 B5 정답 규칙으로 재채점한 값. 기존 270개가 대상이다. B4는 CLARIFY를 출력할 수 없으므로 underspecified는 포함하지 않는다.
- clear 그룹에 대해 B4 대비 정답에서 오답으로 바뀐 건수와 오답에서 정답으로 바뀐 건수. 회귀 여부를 보기 위해서다.
- CLARIFY precision. CLARIFY로 예측한 것 중 underspecified이거나 leaning인 비율이다.

## 한계 (사전 명시)

- clear와 leaning 그룹은 이미 여러 번 사용한 데이터다. 독립적 검증 근거는 신규 underspecified 40개뿐이다.
- underspecified 40개의 gold는 작성자 1인이 정했다. 평가자 간 일치도는 측정하지 않았다.
