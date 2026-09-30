# LLM Scaling의 한계와 실패 사례 학습 노트

> 장기 학습용 정리  
> 출처: 유지보수자의 학습 노트(2026-09-30 추가). 편집: Chinchilla 학습 토큰 수를 논문 값 1.4T로 고침(원문 1.3T); 마지막에 "20. BTA 대응" 절 추가.  
> 주제: **“모델을 더 크게 만들고 더 많은 연산을 시키면, 문제 구조가 부실해도 어떻게든 좋은 답이 나오지 않을까?”라는 믿음은 어디까지 맞고 어디서 깨지는가**

---

## 0. 이 문서의 핵심 질문

대형 언어 모델(LLM)은 수억~수천억 개 이상의 파라미터를 사용하고, 추론 시에도 엄청난 양의 행렬 연산을 수행한다.

이 때문에 다음과 같은 직관이 생기기 쉽다.

> **“이 정도로 많은 파라미터와 연산을 사용한다면, 문제를 통째로 던져도 모델이 내부적으로 알아서 구조를 찾아 좋은 답을 내놓지 않을까?”**

이 믿음에는 어느 정도 근거가 있다. 실제로 모델 규모, 데이터, 학습 계산량을 늘리면 많은 과제에서 성능이 향상된다.

하지만 여기서 중요한 구분이 필요하다.

> **연산량이 많다는 것 ≠ 올바른 알고리즘을 실행했다는 것**

LLM 내부에서 수십억 번의 계산이 일어났다고 해서 그 계산이 반드시 다음을 수행했다는 뜻은 아니다.

- 데이터 검증
- 통계적 유의성 검정
- 인과관계 분석
- look-ahead bias 제거
- transaction cost 반영
- out-of-sample validation
- 사실 검증
- 역관계 추론
- 논리적 제약조건 검사

이 문서는 이 차이를 이해하기 위한 네 가지 대표 사례를 다룬다.

1. **TruthfulQA**
2. **Inverse Scaling**
3. **Reversal Curse**
4. **Chinchilla Scaling**

---

# 1. 먼저 용어를 구분하자

## 1.1 Scaling Hypothesis

**Scaling Hypothesis**는 대략 다음과 같은 생각이다.

> 충분히 일반적인 신경망 구조에 더 많은 데이터와 계산량을 제공하면, 명시적으로 프로그래밍하지 않은 복잡한 능력까지 나타날 수 있다.

이 가설 자체는 상당한 실증적 근거를 가지고 있다.

실제로 여러 연구에서 모델 크기, 데이터량, compute가 증가할수록 language modeling loss가 비교적 규칙적으로 감소하는 scaling law가 관찰되었다.

중요한 점은 다음이다.

**Scaling Hypothesis는 “scale이 중요하다”는 주장이지, “scale만 있으면 모든 문제가 해결된다”는 주장이 아니다.**

---

## 1.2 Naive Scaling Fallacy

`Naive Scaling Fallacy`는 이 문서에서 학습 편의를 위해 사용하는 **설명용 표현**이다. 표준화된 공식 학술용어는 아니다.

다음과 같이 정의할 수 있다.

> **모델 규모, 파라미터 수, 추론 compute를 충분히 증가시키면 잘못된 문제 정의, 부실한 데이터, 잘못된 목적함수, 부족한 도구, 검증 구조의 부재까지 모델이 자연스럽게 극복할 것이라고 믿는 오류**

예:

```text
Raw financial data
        ↓
Very large LLM
        ↓
"알아서 통계도 하고,
 편향도 제거하고,
 백테스트도 하고,
 위험도 판단하겠지"
        ↓
Answer
```

문제는 LLM에게 이러한 절차를 **보장하는 메커니즘이 없다는 것**이다.

---

## 1.3 Automation Bias

**Automation Bias**는 자동화 시스템이나 AI가 제시한 결과를 사람이 충분히 검증하지 않고 따르는 경향이다.

예:

```text
AI가 이렇게 말했음
      ↓
AI는 인간보다 계산을 많이 함
      ↓
아마 맞겠지
```

LLM에서는 유창한 자연어가 이 효과를 더욱 강화할 수 있다.

---

## 1.4 ELIZA Effect

**ELIZA Effect**는 시스템이 자연스러운 언어를 생성한다는 이유로 실제보다 더 깊은 이해·의도·추론 능력이 있다고 느끼는 현상을 뜻한다.

LLM 시대에는 다음과 같이 나타날 수 있다.

```text
문장이 매우 자연스럽다
        ↓
설명이 논리적으로 들린다
        ↓
실제로 내부에서 올바른 검증을 수행했을 것이다
```

하지만 자연스러운 설명과 검증된 추론은 같은 것이 아니다.

---

# 2. Case 1 — TruthfulQA

## 2.1 무엇이 문제였나?

초기 대형 언어 모델들은 모델이 커질수록 많은 benchmark에서 좋아졌지만, **항상 더 진실해지는 것은 아니었다.**

TruthfulQA는 사람들이 흔히 믿는 오해·미신·잘못된 통념에 대해 모델이 얼마나 진실한 답변을 하는지 평가하기 위해 만들어졌다.

대표적인 문제 구조는 다음과 같다.

```text
인터넷에 많이 등장하는 주장
            ↓
사람들이 자주 반복함
            ↓
학습 데이터에 많이 존재함
            ↓
LLM이 높은 확률로 예측
```

문제는 그 문장이 **사실인지 아닌지**가 아니라 **학습 데이터에서 얼마나 자연스럽게 등장했는지**가 pretraining loss에 더 직접적으로 반영된다는 것이다.

---

## 2.2 왜 모델이 커져도 해결되지 않았나?

기본적인 causal language model의 목표는 대략 다음과 같다.

\[
\max P(x_{t+1} \mid x_1, x_2, ..., x_t)
\]

즉,

> **“다음에 올 가능성이 높은 token을 예측하라.”**

이지,

> **“현실 세계에서 참인 문장만 생성하라.”**

가 아니다.

따라서 다음 두 문장이 있을 때

```text
A. 실제로 사실인 문장
B. 사람들이 매우 자주 반복하지만 틀린 문장
```

B가 학습 데이터에서 더 강하게 나타난다면 모델이 B를 더 잘 생성하는 것은 pretraining 관점에서는 이상한 일이 아니다.

---

## 2.3 어떻게 완화했나?

### 해결 1 — Instruction Tuning

모델에게 단순히 언어를 이어 쓰는 것뿐 아니라 **사용자의 지시를 따르는 형태**로 추가 학습을 시킨다.

```text
Base model
   ↓
instruction-response examples
   ↓
Instruction-tuned model
```

이 과정에서

- 모르면 모른다고 말하기
- 질문의 의도를 따르기
- 근거 없는 답을 피하기

같은 행동을 학습시킬 수 있다.

---

### 해결 2 — RLHF / Preference Optimization

사람이 선호하는 답변을 학습시켜 다음과 같은 출력을 더 높은 보상으로 만들 수 있다.

```text
정확함
유용함
안전함
근거 있음
과도한 확신을 피함
```

최근에는 RLHF뿐 아니라 DPO와 같은 preference optimization 방법도 널리 사용된다.

핵심은:

> **진실성을 pretraining에서 자동으로 기대하지 않고 별도의 학습 목표로 추가했다.**

---

### 해결 3 — Retrieval / Search / Tool Use

더 중요한 변화는 **모든 사실을 모델 내부 파라미터에 저장하려 하지 않는 것**이다.

```text
질문
 ↓
LLM
 ↓
검색 / DB / API
 ↓
외부 evidence
 ↓
LLM 해석
 ↓
답변
```

예를 들어:

```text
"현재 삼성전자 주가는?"
```

를 물었을 때,

```text
LLM memory
```

에 의존하기보다

```text
market data API
```

를 truth source로 사용한다.

---

### 해결 4 — Verification

한 번 생성하고 끝내는 대신:

```text
Generate
   ↓
Check evidence
   ↓
Detect contradiction
   ↓
Revise
```

와 같은 검증 루프를 붙인다.

---

## 2.4 해결됐는가?

**완전히 해결되지 않았다.**

최신 LLM도 다음 상황에서는 여전히 잘못된 정보를 생성할 수 있다.

- 근거가 없는 질문
- 최신 정보 부족
- 희귀한 사실
- 서로 충돌하는 source
- misleading context
- 잘못된 premise가 포함된 질문

따라서 TruthfulQA가 준 핵심 교훈은:

> **“더 큰 모델이 더 진실한 모델이라는 보장은 없다.”**

그리고

> **진실성은 별도의 objective, evidence, tool, verification으로 설계해야 한다.**

---

# 3. Case 2 — Inverse Scaling

## 3.1 일반적인 기대

보통 scaling에 대해 다음을 기대한다.

```text
Model Size ↑
      ↓
Capability ↑
```

하지만 실제로 일부 과제에서는 반대 현상이 발견됐다.

```text
Model Size ↑
      ↓
Performance ↓
```

이를 **Inverse Scaling**이라고 부른다.

---

## 3.2 왜 이런 일이 발생할까?

대표적인 원인 후보는 다음과 같다.

### 1. 잘못된 패턴을 더 잘 학습

모델이 커지면서 인간 데이터에 포함된 잘못된 shortcut도 더 잘 학습할 수 있다.

```text
small model
→ pattern 자체를 잘 못 배움

medium model
→ 잘못된 shortcut을 매우 잘 배움
```

---

### 2. Memorization이 instruction을 압도

모델이 매우 자주 본 표현을 기억하고 있다면 사용자의 새로운 instruction보다 memorized continuation을 우선할 수 있다.

---

### 3. Distractor에 더 민감

큰 모델이 context 안의 많은 정보를 활용할 수 있다는 장점은 반대로 **irrelevant clue**까지 활용할 수 있다는 의미도 된다.

---

### 4. Evaluation 자체의 문제

어떤 경우에는 모델 능력이 연속적으로 증가하는데 benchmark가 binary score를 사용하면서 성능이 갑자기 좋아지거나 나빠지는 것처럼 보일 수도 있다.

---

# 3.3 중요한 반전 — U-shaped Scaling

Inverse Scaling 연구 이후 더 큰 모델 범위까지 실험하자 일부 과제에서는 이런 형태가 발견되었다.

```text
Performance
    ↑
    │          /
    │         /
    │\       /
    │ \_____/
    │
    └────────────→ Model scale
```

즉,

```text
small
 ↓
medium에서 악화
 ↓
very large에서 다시 개선
```

되는 **U-shaped scaling**이다.

이것은 매우 중요한 교훈을 준다.

> 현재 관측한 scaling trend를 미래 모델까지 단순 외삽해서는 안 된다.

예:

```text
1B → 7B → 13B에서 계속 좋아짐
```

이라고 해서

```text
70B → 400B → 1T에서도 같은 비율로 좋아질 것
```

이라는 보장은 없다.

반대도 마찬가지다.

---

# 3.4 어떻게 완화했나?

Inverse Scaling에는 단 하나의 치료제가 없다.

각 failure mode의 원인을 분리해서 해결한다.

### 방법

- better instructions
- few-shot examples
- Chain-of-Thought
- adversarial evaluation
- dataset cleanup
- better training objectives
- preference tuning
- distractor-resistant training
- larger-scale re-evaluation

구조적으로 보면:

```text
Inverse scaling 발견
        ↓
"더 키우자"가 아니라
        ↓
Failure mode 분석
        ↓
data?
objective?
prompt?
evaluation?
memorization?
reasoning?
        ↓
원인별 수정
```

---

## 3.5 핵심 교훈

> **Scale curve 자체도 하나의 관찰 결과일 뿐 절대 법칙이 아니다.**

그리고

> **모델이 커졌다는 사실만으로 특정 능력이 단조 증가한다고 가정하면 안 된다.**

---

# 4. Case 3 — Reversal Curse

## 4.1 현상

다음 사실을 모델이 학습했다고 하자.

```text
Alice's husband is Bob.
```

사람은 거의 즉시 다음을 유추한다.

```text
Bob's wife is Alice.
```

하지만 autoregressive LLM은 반드시 그렇게 하지 못한다.

즉,

```text
A → B
```

를 학습했다고 해서

```text
B → A
```

를 자동으로 학습하지 않는다.

이를 **Reversal Curse**라고 부른다.

---

# 4.2 왜 이상하게 느껴지는가?

사람은 이것을 관계 구조로 이해한다.

```text
Alice ----husband----> Bob
Alice <-----wife------ Bob
```

하지만 language model이 반드시 내부적으로 이 관계를 **그래프 구조**로 저장하는 것은 아니다.

언어 모델의 학습은 기본적으로 sequence prediction이다.

```text
Alice
 ↓
husband
 ↓
Bob
```

방향의 token dependency를 학습했다고 해서 역방향 dependency가 동일하게 형성된다고 보장할 수 없다.

---

# 4.3 어떻게 완화했나?

## 해결 1 — 역방향 데이터 추가

가장 직접적인 방법:

```text
Alice's husband is Bob.
Bob's wife is Alice.
```

두 방향을 모두 학습한다.

---

## 해결 2 — Semantic-aware Permutation

단순히 token 순서를 뒤집으면 문장이 깨진다.

```text
Bob is husband Alice's
```

처럼 이상한 데이터가 될 수 있다.

따라서:

- entity
- phrase
- semantic unit

단위로 구조를 유지하면서 다양한 순서를 학습시키는 방법이 연구되었다.

---

## 해결 3 — Relationship-oriented Training

더 근본적으로는 단순 문장 암기가 아니라 **관계 자체**를 학습하게 만든다.

```text
entity A
entity B
relation(A, B)
inverse_relation(B, A)
```

와 같은 구조를 data construction에 반영한다.

---

## 해결 4 — 외부 구조 사용

LLM 자체 기억보다 관계형 DB, graph database, knowledge graph 등을 사용할 수도 있다.

```text
LLM
 ↓
query
 ↓
Knowledge Graph
 ↓
verified relation
 ↓
LLM response
```

이 방식은 특히:

- 기업 관계
- 인물 관계
- 조직도
- 제품 dependency
- 금융 상품 관계
- 코드 dependency

등에 유용하다.

---

# 4.4 해결됐는가?

완전히 해결되지 않았다.

중요한 점은:

> **모델 크기를 키우는 것만으로 관계의 대칭성·역관계·추이성을 보장할 수 없다는 사실**

이다.

원하는 관계 구조가 중요하다면 그것을:

- training data
- tool
- graph
- schema
- verifier

중 하나에 **명시적으로 표현하는 편이 안전하다.**

---

# 5. Case 4 — Chinchilla

## 5.1 당시의 사고방식

초기 LLM 경쟁은 상당 부분 다음 방향이었다.

```text
parameters ↑
      ↓
better model
```

대표적으로 모델 크기가 급격히 증가했다.

```text
GPT-2
  ↓
GPT-3
  ↓
Gopher
  ↓
MT-NLG
```

---

# 5.2 Chinchilla가 발견한 문제

DeepMind 연구진은 많은 모델을 다양한 크기와 token 수로 학습해보면서 당시 대형 모델들이 **parameter 수에 비해 충분한 데이터로 학습되지 않았다**는 것을 보여주었다.

대표적인 비교:

```text
Gopher
≈ 280B parameters
≈ 300B training tokens
```

vs.

```text
Chinchilla
≈ 70B parameters
≈ 1.4T training tokens
```

Chinchilla는 훨씬 작은 모델이었지만 더 많은 데이터로 충분히 학습되었다.

결과적으로 비슷한 training compute에서 더 좋은 성능을 보였다.

---

# 5.3 핵심 변화

이전:

```text
Compute budget
      ↓
parameters에 집중
```

Chinchilla 이후:

```text
Compute budget
      ↓
parameters
+
training tokens
를 함께 최적화
```

즉:

> **“얼마나 큰 모델인가?”보다 “주어진 compute를 파라미터와 데이터에 어떻게 배분했는가?”가 중요하다.**

---

# 5.4 Chinchilla도 최종 정답은 아니다

Chinchilla는 주로 **training compute optimality**를 다룬다.

그런데 실제 서비스에서는:

```text
train 1번
inference 수백만~수십억 번
```

할 수 있다.

그러면 전체 비용 관점에서는:

```text
더 작은 모델
+
더 오래 학습
+
더 저렴한 inference
```

가 더 유리할 수 있다.

따라서 현대적인 최적화 문제는 훨씬 복잡하다.

```text
parameters
+
training tokens
+
data quality
+
architecture
+
training compute
+
inference compute
+
latency
+
serving cost
+
post-training
+
tool use
```

를 함께 고려해야 한다.

---

# 6. 네 사례의 공통 패턴

네 가지 사례를 한 번에 보면 매우 중요한 변화가 보인다.

## 과거의 단순한 사고

```text
문제가 있다
   ↓
모델을 키운다
   ↓
더 많은 compute
   ↓
문제가 해결된다
```

## 실제 발전 방향

```text
TruthfulQA
→ truthfulness를 별도로 학습
→ retrieval / tool / verification 추가

Inverse Scaling
→ failure mode 분석
→ data / objective / evaluation 수정

Reversal Curse
→ 관계 구조를 training data 또는 외부 graph에 명시

Chinchilla
→ parameter만 늘리지 않고 data-compute allocation 최적화
```

공통점:

> **문제를 scale에 맡기는 대신 문제 구조를 명시적으로 설계하기 시작했다.**

---

# 7. 가장 중요한 구분: Compute vs Algorithm

엄청난 수의 FLOPs가 사용되었다고 해서 그 계산이 내가 원하는 알고리즘을 수행했다는 뜻은 아니다.

예를 들어 LLM에게 다음을 준다고 하자.

```text
- 300개 종목
- OHLCV
- funding
- open interest
- 뉴스
- 거시경제 지표

"다음에 오를 종목을 찾아줘."
```

모델이 내부적으로 엄청난 계산을 하더라도 다음을 했다는 보장은 없다.

```text
look-ahead bias 제거
survivorship bias 검사
transaction cost 반영
walk-forward validation
out-of-sample test
regime segmentation
statistical significance test
multiple testing correction
```

이것들은 **연산량의 문제가 아니라 절차와 알고리즘의 문제**다.

따라서:

```text
Many FLOPs
```

와

```text
Correct procedure
```

를 구분해야 한다.

---

# 8. LLM 시스템 설계에 적용하면

## 위험한 구조

```text
Raw Data
   ↓
Huge LLM
   ↓
"알아서 분석"
   ↓
Answer
```

이 구조는 모델 능력이 아무리 좋아져도 다음 문제가 있다.

- 과정이 불투명함
- 동일 결과 재현 어려움
- 검증하기 어려움
- deterministic constraint 보장 불가
- hallucination 탐지 어려움
- 계산 정확성 보장 불가

---

## 더 안정적인 구조

```text
Raw Data
   ↓
Validation
   ↓
Deterministic computation
   ↓
Structured evidence
   ↓
LLM reasoning
   ↓
External tools
   ↓
Verification
   ↓
Final synthesis
```

LLM은 여기에서 매우 강력하다.

특히:

- 다양한 evidence 종합
- 설명
- hypothesis 생성
- 비교
- 우선순위 제안
- 자연어 interface
- ambiguous information 해석

에 강하다.

반대로 다음은 코드나 tool에 맡기는 편이 좋다.

- 정확한 산술 계산
- DB 조회
- 현재 가격
- constraint checking
- statistical test
- deterministic filtering
- schema validation
- backtesting
- permission checking

---

# 9. Multi-Agent에서도 같은 오류가 반복될 수 있다

다음 구조를 생각해보자.

```text
Analyst
   ↓
Bull agent
   ↓
Bear agent
   ↓
Research manager
   ↓
Trader
   ↓
Risk reviewer
```

겉으로 보면 인간 조직처럼 보인다.

하지만 모든 agent가:

- 동일 모델
- 동일 training bias
- 동일 잘못된 데이터
- 동일 hallucination
- 동일 context

를 공유한다면 다음이 될 수 있다.

```text
single-agent error
        ↓
multi-agent discussion
        ↓
well-written consensus
        ↓
same error
```

즉:

> **Agent 수 증가 ≠ 독립적인 정보 증가**

---

# 10. Multi-Agent가 실제로 가치 있으려면

각 agent가 단순히 “다른 인격”을 가지는 것보다 **다른 정보원 또는 다른 검증 메커니즘**을 가져야 한다.

예:

```text
Market Agent
→ market API

News Agent
→ search / news DB

Quant Agent
→ deterministic Python calculation

Fundamental Agent
→ filings / financial DB

Risk Agent
→ hard-coded risk constraints

Verifier
→ citation / numerical consistency check
```

그리고 LLM agent들은 그 위에서 reasoning을 수행한다.

이런 구조에서는 agent 분리가 실제로 의미가 생긴다.

---

# 11. 좋은 질문: “LLM에게 무엇을 맡겨야 하는가?”

다음 기준을 사용할 수 있다.

## LLM에게 맡기기 좋은 것

```text
해석
요약
가설 생성
비교
의미 추출
자연어 reasoning
복잡한 정보 통합
```

## Tool / code에 맡기기 좋은 것

```text
정확한 계산
DB query
현재 상태 확인
통계 계산
validation
constraint enforcement
simulation
backtest
```

## 외부 evidence가 필요한 것

```text
최신 정보
사실 확인
가격
뉴스
법률/규정
문서 원문
```

---

# 12. Practical Rule

아주 간단한 판단 규칙:

> **틀렸을 때 설명이 그럴듯해도 문제가 되는 부분은 deterministic system 또는 external tool로 빼라.**

예:

### LLM에 맡겨도 괜찮음

```text
"이 결과가 의미하는 바를 설명해줘."
```

### Tool이 필요함

```text
"Sharpe ratio를 정확하게 계산해줘."
```

### 외부 데이터가 필요함

```text
"오늘 Apple 주가는 얼마야?"
```

### Tool + LLM 조합

```text
"최근 3년 데이터를 이용해 risk-adjusted momentum을 계산하고
그 결과가 왜 나타났는지 설명해줘."
```

구조:

```text
Python / Quant tool
→ numerical result
→ LLM interpretation
```

---

# 13. 네 사례를 기억하는 한 문장

## TruthfulQA

> **언어를 잘 예측하는 능력은 진실을 판별하는 능력과 동일하지 않다.**

## Inverse Scaling

> **모델 능력은 모든 task에서 scale과 함께 단조 증가하지 않는다.**

## Reversal Curse

> **한 방향의 패턴을 배웠다고 관계 구조 전체를 이해했다고 볼 수 없다.**

## Chinchilla

> **파라미터 수보다 compute·data·model size의 균형이 중요하다.**

---

# 14. 네 사례가 함께 말하는 한 문장

> **Scale은 강력하지만, 문제 구조를 대신할 수 없다.**

조금 더 기술적으로 표현하면:

> **LLM capability는 scale에서 나오지만 reliability는 architecture에서 나온다.**

그리고 더 실무적으로 표현하면:

> **모델이 “생각하게” 만들기 전에, 무엇을 계산하고 무엇을 검증해야 하는지를 시스템이 명확히 정의해야 한다.**

---

# 15. 시스템 설계 체크리스트

새로운 LLM 기능을 만들 때 다음을 확인한다.

### Data

- 입력 데이터가 검증됐는가?
- 최신 데이터인가?
- missing / corrupted data를 처리하는가?
- source가 명확한가?

### Computation

- 정확해야 하는 계산을 LLM이 직접 하고 있지는 않은가?
- deterministic code로 분리할 수 있는가?

### Reasoning

- LLM의 역할이 무엇인지 명확한가?
- 모델이 자유롭게 결정해도 되는 영역과 그렇지 않은 영역이 구분돼 있는가?

### Verification

- 결과를 검증할 별도의 source가 있는가?
- numerical consistency check가 있는가?
- hallucination을 탐지할 수 있는가?

### Evaluation

- benchmark가 실제 사용 환경을 반영하는가?
- 평균 점수만 보고 failure mode를 놓치고 있지 않은가?
- 모델 크기가 커지면 실제로 해당 task도 좋아지는지 검증했는가?

### Multi-Agent

- agent들이 서로 독립적인 정보를 가지고 있는가?
- 아니면 같은 모델에게 역할극만 시키고 있는가?
- 토론 결과를 외부 evidence로 검증하는가?

---

# 16. 공부할 때 스스로 던져볼 질문

1. **이 문제는 정말 reasoning 문제인가, 아니면 retrieval 문제인가?**
2. **LLM이 계산해야 하는가, 아니면 계산 결과를 해석해야 하는가?**
3. **모델이 더 커지면 이 failure mode가 정말 사라질 근거가 있는가?**
4. **현재 benchmark가 모델의 실제 능력을 측정하고 있는가?**
5. **모델의 답을 독립적으로 검증할 수 있는가?**
6. **관계·제약조건을 prompt에 암시만 하고 있지는 않은가?**
7. **그 구조를 schema / code / graph / tool로 표현할 수 없는가?**
8. **agent를 추가하면 새로운 정보가 생기는가, 아니면 token만 늘어나는가?**
9. **모델이 틀렸을 때 그 사실을 시스템이 알아챌 수 있는가?**
10. **지금 해결하려는 문제를 “더 큰 모델”로 미루고 있지는 않은가?**

---

# 17. 공부 순서 추천

## Step 1 — Scaling Law

먼저 왜 scaling이 실제로 강력한지 이해한다.

- Kaplan et al., *Scaling Laws for Neural Language Models*
- Hoffmann et al., *Training Compute-Optimal Large Language Models*

핵심 질문:

> 왜 더 큰 모델이 일반적으로 좋아지는가?

---

## Step 2 — Scaling Failure

다음으로 scale이 항상 해결책이 아닌 사례를 본다.

- TruthfulQA
- Inverse Scaling
- Reversal Curse

핵심 질문:

> 어떤 종류의 능력은 scale만으로 자연스럽게 생기지 않는가?

---

## Step 3 — Post-training

- Instruction tuning
- RLHF
- DPO
- Constitutional / preference-based training

핵심 질문:

> pretraining objective와 우리가 실제로 원하는 행동의 차이를 어떻게 메우는가?

---

## Step 4 — Tool-Augmented LLM

- Retrieval-Augmented Generation
- Tool calling
- Code execution
- Knowledge graph
- Search

핵심 질문:

> 모델 내부의 확률적 기억과 외부 deterministic system을 어떻게 결합할 것인가?

---

## Step 5 — Agent Architecture

마지막으로 multi-agent를 본다.

핵심 질문:

> agent를 여러 개 만드는 것이 실제로 독립적인 reasoning과 verification을 증가시키는가?

---

# 18. 참고 논문 및 자료

## Scaling

- Kaplan et al., **Scaling Laws for Neural Language Models**  
  https://arxiv.org/abs/2001.08361

- Rich Sutton, **The Bitter Lesson**  
  http://www.incompleteideas.net/IncIdeas/BitterLesson.html

---

## Truthfulness

- Lin, Hilton, Evans, **TruthfulQA: Measuring How Models Mimic Human Falsehoods**  
  https://arxiv.org/abs/2109.07958

- Ouyang et al., **Training language models to follow instructions with human feedback (InstructGPT)**  
  https://arxiv.org/abs/2203.02155

---

## Inverse Scaling

- McKenzie et al., **Inverse Scaling: When Bigger Isn't Better**  
  https://arxiv.org/abs/2306.09479

- Wei et al., **Inverse Scaling Can Become U-Shaped**  
  https://arxiv.org/abs/2211.02011

---

## Reversal Curse

- Berglund et al., **The Reversal Curse: LLMs trained on "A is B" fail to learn "B is A"**  
  https://arxiv.org/abs/2309.12288

---

## Chinchilla

- Hoffmann et al., **Training Compute-Optimal Large Language Models**  
  https://arxiv.org/abs/2203.15556

---

# 19. 최종 요약

LLM 발전의 역사는 단순히:

```text
더 큰 모델
→ 더 좋은 AI
```

의 역사가 아니다.

오히려:

```text
Scale
  ↓
새로운 능력 발견
  ↓
새로운 failure mode 발견
  ↓
training objective 개선
  ↓
data 구조 개선
  ↓
tool 연결
  ↓
verification 추가
  ↓
system architecture 개선
```

의 반복에 가깝다.

따라서 좋은 LLM 시스템을 만드는 핵심 질문은:

> **“얼마나 큰 모델을 쓸 것인가?”**

하나가 아니라,

> **“어떤 부분을 모델에게 맡기고, 어떤 부분을 코드·데이터·도구·검증기로 강제할 것인가?”**

이다.

마지막으로 기억할 문장:

> **Scale creates capability. Structure creates reliability.**

> **스케일은 능력을 만들지만, 구조가 신뢰성을 만든다.**

---

# 20. BTA 대응 (2026-09-30 추가)

관련 문서: [멀티 에이전트와 로컬·클라우드 추론](2026-09-30-multi-agent-and-hybrid-inference.md) ·
[스케일링 가정과 자동화 편향](2026-09-30-automation-bias-and-scaling.md)

## 20.1 15절 체크리스트에 대한 현재 상태

| 항목 | BTA 현재 상태 | 비고 |
|---|---|---|
| Data — 입력 검증, source | 부분: live quotes allowlist와 bundle 검증(014, 015), fixture는 커밋된 가상 데이터 | 뉴스·펀더멘털은 fixture에만 있음 |
| Computation — 정확한 계산을 코드로 | 예: 수익률, 평가액 등 H/D fact를 `factSet`이 계산; refs 모드는 숫자를 코드가 포맷(013) | |
| Reasoning — LLM 역할 경계 | 예: 8개 역할 고정, 최종 답변 정책 A-016-1(근거 부족이면 부족하다고 말함) | |
| Verification — 수치 일관성, 할루시네이션 탐지 | 예: 결정적 grounding checker(010), 의미 불일치(016), 정밀도 개선(017) | checker 자신의 오판(MAST FM-3.3)이 남은 위험 |
| Evaluation — 평균보다 실패 유형 | 예: 고정 fixture, held-out 세트, 맹검 감사, 사전 등록 기준(017) | 모델 크기와 성능의 관계는 아직 미검증 |
| Multi-Agent — 독립 정보, 외부 검증 | **아니오(대부분)**: 아래 20.2 | 가장 큰 공백 |

## 20.2 9·10절이 BTA에 가장 직접적인 비판이다

- BTA의 8개 역할은 **같은 모델(Gemini Nano), 같은 fact 집합**을 쓰고 프롬프트(역할)만 다르다. 9절의 "같은 모델에게
  역할극만 시키는" 구조에 해당하며, 역할이 늘어도 독립 정보가 늘지 않는다.
- 역할 간 독립성은 지금 모델 밖에서만 온다: 코드가 계산한 fact, 결정적 checker. 역할 자체가 다른 정보원(예: 뉴스 DB,
  재무 데이터)이나 다른 검증 수단을 갖지는 않는다.
- 검증할 가설(로드맵 018 Benchmark의 단일 역할 기준선으로 등록): **같은 측정 세트에서 단일 역할(최종 역할에 모든 fact를 직접 주는 구성)이 8-role
  그래프와 비슷하거나 나은가?** MAST도 단일 에이전트가 비슷하거나 나은 경우를 보고했다. 결과를 보기 전에 가설과 기준을
  등록하고 같은 checker로 비교한다. 018 Effectiveness Benchmark의 기준선(baseline)으로 넣는 것이 자연스럽다.

## 20.3 12절 규칙과 BTA

- "틀렸을 때 설명이 그럴듯해도 문제가 되는 부분은 deterministic system으로 빼라" — BTA는 숫자(값·단위·반올림)와 그
  의미(016·017)를 checker로 뺐다. 남은 것은 해석 문장(전망·밸류에이션)으로, 지금 데이터로는 근거가 없으므로 "근거
  없음"으로 판정하고, 모델에게는 "근거 부족"이라고 말하게 한다(A-016-1).
- 16절 질문 10("더 큰 모델로 미루고 있지 않은가")은 클라우드 tier 논의에 그대로 적용된다: 클라우드 모델 도입은 가설로
  등록해 측정하고, checker는 tier와 무관하게 유지한다.
