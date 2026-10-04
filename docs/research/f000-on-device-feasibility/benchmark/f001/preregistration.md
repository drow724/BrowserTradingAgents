# F001-E1 사전 등록 — 결정론적 사전 분류기 + 모델 + guard

- 등록: 2026-10-04. test set을 열어 보기 전에 등록했다.
- 분류기 동결: `preclassify.js`, sha256은 `preclassify.sha256`에 기록했다.
- 성격: 구조 검증 실험이다. 제품 코드가 아니다.

## 독립성 확보

- test set(`testset.json`, 200개)은 별도 에이전트가 작성했다.
  - 이 에이전트는 분류 규칙과 기존 dataset을 보지 않았다.
  - gold 규칙과 state 설명만 받았다.
- 분류 규칙은 기존 310개(dev)만 보고 만들었다. dev 결과는 판정에 쓰지 않는다.
- 규칙을 만든 사람(Claude)은 동결 시점까지 test set을 열지 않았다.
- **test set을 연 뒤에는 분류기, 프롬프트, 채점 규칙을 바꾸지 않는다.** 바꾸게 되면 F001-E2로 새로 등록한다.
- test set에 dev와 문자열이 완전히 같은 명령이 있으면 채점에서 제외하고, 제외한 건수를 보고한다.

## 파이프라인

1. `preclassify(command)` 결과를 본다.
   - `NO_ACTION` 또는 `CLARIFY`: 그 값을 그대로 쓴다.
   - `null`: 2단계로 넘어간다.
2. 모델을 호출한다. 구성은 B4와 같다.
   - action 8개(CLARIFY 없음)
   - string enum constraint, `omitResponseConstraintInput`
   - 메타데이터 user message
3. B2·B4와 같은 코드 guard를 적용한다.

**구현 방식.** 모델은 test set 200개 전부에 대해 1회씩 호출한다. 이 결과가 **M(모델 단독)**이다. 파이프라인 **P**는 같은 호출 결과를 쓴다(`P = preclassify ?? guard(M.model)`). 이렇게 하면 같은 표본을 짝지어 비교할 수 있고, 비결정성이 두 조건에 똑같이 적용된다.

## 채점 규칙 (B5와 동일)

| 그룹 | 대상 tag | 정답 |
|---|---|---|
| clear | 아래 두 그룹을 제외한 나머지 | gold만 정답. CLARIFY를 내면 과잉 되묻기 |
| leaning | `ambiguous` | {gold, CLARIFY} |
| under | `underspecified` | CLARIFY만 정답 |

## 판정 기준 (P, test set)

| 지표 | 기준 |
|---|---|
| 전체 accuracy | 90% 이상 |
| CLARIFY recall (under) | 80% 이상 |
| 과잉 되묻기 (clear 중 CLARIFY 비율) | 5% 이하 |
| Routing p95 | 1초 이하. **모델이 호출된 item만** 대상(보수적). 전체 item 기준 p95는 참고용으로만 보고 |
| Invalid action | 1% 미만 |
| Structured output | 99% 이상. 모델이 호출된 item 기준 |

모든 기준을 충족하면 PASS, 하나라도 미충족하면 FAIL이다.

## 함께 보고하는 값

- M(모델 단독)의 accuracy. CLARIFY는 불가능하므로 under 그룹은 전부 오답이 된다.
- 분류기 발화율과 발화했을 때의 precision(발화한 것 중 정답 비율). 규칙 종류별(NO_ACTION/CLARIFY)로 나눈다.
- tag별 accuracy, 오답 목록, 오답이 규칙 오류인지 모델 오류인지 구분
- dev 성능: 참고용이며 판정하지 않는다. dev pipeline 296/309, CLARIFY recall 39/40, 과잉 되묻기 0/244.

## 한계 (사전 명시)

- test set 작성자가 한 명(LLM 에이전트)이다. 평가자 간 일치도는 측정하지 않는다.
- 분류기는 한국어 키워드 규칙이다. 다른 언어나 도메인 어휘에는 일반화되지 않는다.
