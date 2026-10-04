# F003-E1 사전 등록: TODO 추출에서 Gemini Nano의 증분 가치

- 등록일: 2026-10-04. test의 gold를 보기 전에 등록했다.
- 동결: `baseline.js`, `runner.html`(Nano 프롬프트 v3), `score.py`. 해시는 `frozen.sha256`에 기록했다.
- test 원본(`test.json`)의 sha256은 `3040539b…2122`(`test.sha256`)이다. 지금까지 test에서 연 것은 해시 계산과, gold를 제거한 사본(`test_nogold.json`)을 만드는 일뿐이다.

## 질문

TODO 추출에서 Gemini Nano는 LLM 없는 규칙 baseline보다 의미 있게 나은가?

## 데이터

- 독립 에이전트가 작성했다. 이 에이전트는 baseline과 프롬프트를 보지 않았다.
- dev: 대화 30개, gold TODO 51개. baseline 규칙과 Nano 프롬프트 개발에만 썼다.
- test: 대화 60개, gold TODO 100개(그중 cross-turn 33개), distractor 메시지 119개.

| category | 대화 수 |
|---|---|
| explicit | 15 |
| cross_turn | 15 |
| distractor_heavy | 10 |
| long_mixed | 10 |
| status_update | 5 |
| no_todo | 5 |

## 조건

**A. 규칙 baseline (`baseline.js`)**
- 결정론적이다. 브라우저와 Node에서 모두 실행된다.
- 사용하는 규칙: 약속형 어미, 이름이 지정된 요청, 직전 요청에 대한 응답 연결, 결정·완료 표현 제외.
- dev 튜닝: 오류를 1회 분석하고 규칙을 1회 일반화했다. dev F1은 0.865에서 0.952로 올랐다. dev에 맞춘 값이므로 낙관적이다.

**B. Gemini Nano (`runner.html`, 프롬프트 v3)**
- 출력 형식: 한 줄 형식(`assignee|due|sources|task`)이며, 정규식 constraint로 담당자는 참여자 id, 근거는 메시지 id, 기한은 정해진 목록 중에서만 고르게 했다. 출력 길이도 제한했다.
- JSON schema constraint를 쓰지 않은 이유: dev 진단에서 공백을 무한히 생성하는 문제가 나왔다(30/30 timeout).
- 프롬프트 개정: dev 오류를 보고 1회만 수정했다. dev F1은 0.860에서 0.879가 되었다.
- test 대화 전체에 대해 **3회 독립 실행**한다.
- timeout은 60초이고, AbortController로 실제 생성을 취소한다.

**C. Claude Haiku (참고용, 판정에 쓰지 않음)**
- `test_nogold.json`만 받는다. 지시문은 B의 TODO 정의와 같다. 코드로 규칙을 구현하지 않고 모델이 직접 판단하게 한다. 1회 실행한다.
- **순환성이 있다.** gold 작성자와 같은 Claude 계열 모델이므로 C는 과대평가될 수 있다.
- latency는 비교할 수 없다(클라우드 호출이며 측정 방식이 다르다).

## 채점 (`score.py`)

- item 매칭: 예측과 gold의 sources가 하나 이상 겹치면 같은 item으로 본다. 1:1 greedy 매칭이다.
- 측정 지표:
  - item P/R/F1
  - strict F1: 매칭되고 담당자와 기한이 모두 맞은 경우만 정답으로 센다
  - 담당자 정확도, 기한 정확도: 매칭된 item만 대상으로 한다
  - cross-turn recall
  - distractor FP: 매칭되지 않은 예측 중 근거가 distractor 메시지인 수
  - no_todo 대화의 FP
  - category별 F1
- 차이의 신뢰구간: 대화 단위 bootstrap 2,000회로 95% CI를 구한다.

## 판정

| 판정 | 조건 |
|---|---|
| **Nano 증분 가치 있음** | 3회 run **모두** 다음 두 가지를 만족한다. (1) Nano F1 − baseline F1 ≥ +0.05, (2) 그 차이의 95% CI 하한 > 0 |
| **증분 가치 없음** | 3회 run 모두 Nano F1 − baseline F1 ≤ 0 |
| **불분명** | 위 둘 중 어디에도 해당하지 않는다 |

**보조 판단**
- 단계별 우위: cross-turn recall, distractor FP, strict F1, 기한 정확도에서 각각 어느 쪽이 나은지 보고한다. "Nano가 특정 단계에서만 가치가 있다"는 결론은 보조 지표로만 제시한다. 1차 판정을 바꾸지 않는다.
- Nano latency: p50과 p95를 보고한다. 참고 기준은 6초다(B1 추출 p95 5.9초).

## 한계 (사전 명시)

- 대화와 gold는 모두 LLM(Claude 계열)이 작성한 합성 데이터다.
- baseline과 Nano 프롬프트를 모두 dev에서 튜닝했지만 튜닝 강도가 같지 않다. baseline은 규칙 일반화 1회, Nano는 형식 수정과 프롬프트 수정 각 1회였다.
- task 문장의 품질(요약 표현)은 채점하지 않는다. 생성 품질에서 나올 수 있는 LLM의 강점은 이 실험에서 측정하지 않는다.
