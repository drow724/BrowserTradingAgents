# 멀티 에이전트 구조와 로컬·클라우드 추론 조합 — 선행 연구 정리

작성: 2026-09-30 · 성격: 빠른 조사(체계적 문헌 조사 아님). 대부분 초록과 검색 요약을 근거로 했고, 원문을 직접 확인한
것은 TradingAgents 4.3절뿐이다.

## 요약

1. **멀티 에이전트의 이득은 보장되지 않으며, 구조가 나쁘면 단일 에이전트보다 못할 수 있다.** 실패는 14가지 유형,
   3개 범주(시스템 설계, 에이전트 간 불일치, 검증 부족)로 나타난다. (MAST, Cemri et al., 2025)
2. **Minions 연구에서는 큰 클라우드 모델이 과제를 잘게 나누고 로컬 모델이 병렬로 실행할 때, 클라우드 단독 성능의
   약 98%(97.9%)를 훨씬 적은 비용(평균 5.7배 절감)으로 냈다.** 두 모델이 단순히 대화만 주고받으면 87%에 그쳤다.
   과제는 긴 문서 추론(금융·의료·과학 QA)이다. (Minions, ICML 2025)
3. **큰 클라우드 모델로 바꿔도 금융 수치 오류는 사라지지 않았다.** FinanceBench 표본 150건에서 검색을 붙인
   GPT-4-Turbo도 81%를 틀리거나 답을 거부했다(2023년 모델 기준). 근거 검증은 모델 크기와 관계없이 필요하다.

## 근거

| 주제 | 연구 | 내용 |
|---|---|---|
| 멀티 에이전트 실패 | Why Do Multi-Agent LLM Systems Fail? (MAST) | 14개 실패 유형, 3개 범주; 같은 모델의 단일 에이전트가 비슷하거나 나은 경우도 있음 — 문제는 모델보다 구조 |
| 로컬·클라우드 협업 | Minions (Stanford Hazy Research) | 8B 로컬 모델 + GPT-4o; 단순 대화 87 % (비용 30.4배 절감), 클라우드가 과제 분해 97.9 % (5.7배 절감) |
| 작은·큰 모델 라우팅 | Hybrid LLM (Microsoft, ICLR 2024) | 질문 난이도 예측으로 라우팅, 품질 저하 없이 큰 모델 호출 최대 40 % 감소 |
| 개인정보 기준 라우팅 | Privacy-Preserving LLMs Routing 등 | 민감 데이터는 로컬, 비식별 질의만 클라우드 — 아직 체계적 검증은 부족(요약만 확인) |
| 브라우저 추론 | WebLLM (arXiv 2412.15803) | WebGPU로 같은 기기 네이티브 성능의 최대 약 80 %; 품질·근거성은 다루지 않음 |
| 원 프레임워크 | TradingAgents (arXiv 2412.20138) | 실험 모델은 `gpt-4o-mini`, `gpt-4o`(quick), `o1-preview`(deep) — 모두 클라우드; 백본 비교·로컬 비교·할루시네이션 측정 없음 |
| 금융 수치 오류 | FinanceBench (arXiv 2311.11944) | 검색을 붙인 GPT-4-Turbo가 150건 중 81 % 오답 또는 거부 |

## MAST 실패 분류 상세 (14개 유형, 3개 범주)

출처: Cemri et al., *Why Do Multi-Agent LLM Systems Fail?* (arXiv 2503.13657, HTML판 기준). 7개 MAS 프레임워크(ChatDev,
MetaGPT, HyperAgent, AppWorld, AG2, Magentic-One, OpenManus)의 실행 기록 1,642건을 주석; 초기 분석은 5개 프레임워크
150건 이상, 전문가 주석자 6명; 최종 주석자 간 일치도 κ = 0.88. 비율은 전체 실패 중 해당 유형의 비중이다(논문
버전에 따라 수치가 다를 수 있음). "BTA 관련" 열은 이 문서 작성자의 해석이다.

### FC1. 시스템 설계 문제 (43.9 %)

구조 결정, 프롬프트 명세, 상태 관리에서 생기는 실패.

| ID | 유형 | 정의 | 비율 | BTA 관련 |
|---|---|---|---|---|
| FM-1.1 | 과제 명세 불이행 | 과제의 제약·요구사항을 따르지 않음 | 11.8 % | 최종 답변 정책(한국어, A-016-1)을 어기는 답; 숫자 모드 형식 위반(Feature 013) |
| FM-1.2 | 역할 명세 불이행 | 맡은 역할의 책임·제약을 따르지 않음 | 1.5 % | 하위 역할이 최종 결정을 내리는 경우 |
| FM-1.3 | 단계 반복 | 이미 끝난 단계를 불필요하게 반복 | 15.7 % | 고정 그래프라 구조적으로 막힘 |
| FM-1.4 | 대화 이력 손실 | 맥락이 잘려 최근 상호작용을 무시 | 2.8 % | 역할 간 전달은 그래프 상태로 명시 |
| FM-1.5 | 종료 조건 인식 실패 | 상호작용을 끝내야 할 기준을 모름 | 12.4 % | 그래프 종료가 코드로 정해져 있어 해당 적음 |

### FC2. 에이전트 간 불일치 (31.95 %)

소통 실패, 조율 붕괴, 상충하는 행동에서 생기는 실패.

| ID | 유형 | 정의 | 비율 | BTA 관련 |
|---|---|---|---|---|
| FM-2.1 | 대화 재시작 | 예상치 못하게 대화를 다시 시작해 맥락을 잃음 | 2.2 % | 해당 적음(단방향 그래프) |
| FM-2.2 | 명확화 요청 실패 | 불명확·불완전한 정보에 추가 정보를 요청하지 못함 | 6.8 % | 자료에 없는 질문(trap)에서 "근거 부족"이라 말하지 못함 |
| FM-2.3 | 과제 이탈 | 의도한 목표에서 벗어남 | 7.4 % | 질문과 무관한 일반론으로 흐르는 답 |
| FM-2.4 | 정보 누락 | 다른 에이전트의 결정에 필요한 정보를 공유하지 않음 | 0.85 % | 상류 역할의 사실이 최종 답에서 빠짐 |
| FM-2.5 | 다른 에이전트 입력 무시 | 다른 에이전트의 입력을 고려하지 않음 | 1.9 % | Bear 논거를 무시한 최종 결정 |
| FM-2.6 | 추론·행동 불일치 | 논리적 추론과 실제 행동이 어긋남 | 13.2 % | 토론 결론과 최종 권고가 다른 경우 |

### FC3. 과제 검증 (24.15 %)

품질 관리 부족, 검증 장치 부족, 조기 종료에서 생기는 실패.

| ID | 유형 | 정의 | 비율 | BTA 관련 |
|---|---|---|---|---|
| FM-3.1 | 조기 종료 | 필요한 정보 교환이나 목표 달성 전에 대화를 끝냄 | 6.2 % | 해당 적음(고정 단계) |
| FM-3.2 | 검증 없음·불완전 | 결과·출력의 확인을 생략 | 8.2 % | 결정적 grounding checker가 담당 |
| FM-3.3 | 잘못된 검증 | 핵심 정보나 결정을 제대로 교차 확인하지 못함 | 9.1 % | checker 자체의 오탐·누락(F016-R1, F017 fixture D 실패 사례) |

- BTA 관점 요약: 고정 그래프(constitution III)는 FC1의 반복·종료 문제와 FC2의 재시작을 구조적으로 줄이고, 결정적
  checker는 FC3을 맡는다. 남는 위험은 명세 불이행(FM-1.1), 추론·행동 불일치(FM-2.6), 그리고 checker 자신의 잘못된
  검증(FM-3.3)이며 — Feature 016·017이 다룬 것이 FM-3.3이다.

## BTA에 주는 의미

- 로컬·클라우드 조합 연구는 주로 **비용과 정확도**를 본다. 개인 데이터(보유 자산)가 밖으로 나가는 경계를 명시하고
  **결정적 checker로 근거성(unsupported, 의미 불일치, 해석 claim)을 tier별로 재는 연구는 찾지 못했다.**
- TradingAgents는 클라우드 모델만으로 실험했다. 같은 8-role 구조에서 로컬(Gemini Nano)과 클라우드 모델을 같은
  측정 세트·checker로 비교하면 원 논문에 없는 결과가 된다(로드맵 018 Benchmark와 연결).
- 오케스트레이션은 앱이 소유하는 현재 방향(constitution III)과 MAST의 결론이 맞는다. Minions의 "큰 모델이 과제 분해"
  사례는 모델이 흐름을 나누는 경우지만, 그 역할은 작은 모델이 아니라 큰 클라우드 모델이 맡았다.
- 클라우드 tier는 constitution XIII(명시적 승격, 조용한 대체 금지, 실행별 tier 기록)과 개인정보 경계 ADR이 선행 조건.

## 출처

- [Why Do Multi-Agent LLM Systems Fail? (arXiv 2503.13657)](https://arxiv.org/abs/2503.13657)
- [Minions: Cost-efficient Collaboration Between On-device and Cloud Language Models (arXiv 2502.15964)](https://arxiv.org/pdf/2502.15964) · [ICML 2025](https://icml.cc/virtual/2025/poster/43949) · [GitHub](https://github.com/HazyResearch/minions)
- [Hybrid LLM: Cost-Efficient and Quality-Aware Query Routing (ICLR 2024)](https://proceedings.iclr.cc/paper_files/paper/2024/hash/b47d93c99fa22ac0b377578af0a1f63a-Abstract-Conference.html)
- [Privacy-Preserving LLMs Routing (arXiv 2604.15728)](https://arxiv.org/html/2604.15728v1) · [A Survey on Collaborative Mechanisms Between Large and Small Language Models (arXiv 2505.07460)](https://arxiv.org/pdf/2505.07460)
- [WebLLM: A High-Performance In-Browser LLM Inference Engine (arXiv 2412.15803)](https://arxiv.org/abs/2412.15803)
- [TradingAgents: Multi-Agents LLM Financial Trading Framework (arXiv 2412.20138)](https://arxiv.org/html/2412.20138)
- [FinanceBench: A New Benchmark for Financial Question Answering (arXiv 2311.11944)](https://arxiv.org/html/2311.11944v1)
