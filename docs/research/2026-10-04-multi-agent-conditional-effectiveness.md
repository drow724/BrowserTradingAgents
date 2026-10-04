# 멀티 에이전트 효과의 조건 — 논문 4편, Feature 018, F000 실험 종합

작성: 2026-10-04 · 성격: 논문 4편은 원문 PDF 전체를 읽고 수치를 확인했다(그림 값은 눈대중). BTA 수치는
[Feature 018 verification](../../specs/018-effectiveness-benchmark/verification.md), F000 수치는
[f000-on-device-feasibility/final-report.md](f000-on-device-feasibility/final-report.md)에서 가져왔다.

## 요약

1. **Nano 수준 모델에서는 구조(역할 분리, 토론)보다 모델 능력과 결정론적 계층이 훨씬 큰 변수다.** 논문 4편,
   Feature 018, F000이 같은 방향을 가리킨다.
2. **BTA의 8-role은 논문의 debate가 아니다.** 순차 파이프라인이고, 단일 모델(동질)이며, 투표나 judge가 없고,
   기준선과 compute를 맞추지 않았다(8회 호출 대 1회). 논문 결과는 판단 기준으로만 쓴다.
3. **다음으로 정보량이 큰 실험은 모델만 바꾸는 것이다.** Nano 1-role 대 WebLLM 1-role. 하이브리드(WebLLM이 최종
   역할, Nano가 7 역할)는 그 다음이다.

## 논문 4편

### Yang et al. 2025, Revisiting MAD as Test-Time Scaling ([arXiv 2505.22960](https://arxiv.org/abs/2505.22960))

- 설정: Qwen2.5 1.5B–32B, GPT-4o 계열. 수학(GSM8K, MATH500, AIME), 안전(유해 프롬프트 37, MultiJail 50).
  SC·SR과 생성 횟수를 최대 16회로 맞춤(토큰은 맞추지 않음).
- 수학: MATH500에서는 모든 크기에서 SC ≥ MAD(3B 72.1 대 72.0, 32B 84.0 대 83.6). MAD가 앞선 곳은 약한 모델 ×
  어려운 문제(3B AIME 8.9 대 11.1)뿐. MAD는 병렬 샘플의 검증자처럼 작동(한 에이전트만 맞았을 때 64%).
- 다양성: 수학에서는 강약을 섞으면 개별 점수의 조화평균 근처로 수렴하고 약한 쪽이 강한 쪽을 설득(BoF 20%).
- 안전: 고쳐 쓰기를 반복할수록 공격 성공률이 오름(SR이 가장 심함, MAD는 14B 외 모두 상승). 이종 모델을 섞으면
  가장 안전한 쪽으로 수렴(BoF 75%).

### Wu, Li, Li 2025, Can LLM Agents Really Debate? ([arXiv 2511.07784](https://arxiv.org/abs/2511.07784))

- Knight–Knave–Spy 퍼즐(4–9명, 크기별 300개), gpt-5-nano/mini, gemini-2.5-flash, qwen 등 3인 팀. OLS R²=0.39.
- 초기 정확도 β=0.60(가장 큼). 강한 동질 팀은 크기 4–6에서 약 1.0, 약한 동질 팀은 약 0.05에서 0. 확신도 공개,
  순서, 깊이는 유의하지 않음. 인원 수 β=0.066은 그림과 어긋남(논문에서 설명 없음).
- 과정: 올바른 다수에 있던 에이전트는 97% 넘게 유지, 틀린 다수에 맞선 교정은 3.6–34.4%. 근거가 타당한 의견을
  따를 때 교정 90% 초과, 아니면 55% 미만.
- 한계: 토론 없는 단일 에이전트 기준선 없음.

### Ki et al. 2025, Multiple LLM Agents Debate for Equitable Cultural Alignment ([arXiv 2505.24671](https://arxiv.org/abs/2505.24671))

- 7–9B 모델 7개, 21쌍, NormAd-ETI(75개국 2.6K). 1회 교환 후 불일치면 Gemma-2-27B judge.
- 단일 평균 66.4/67.5 → Debate-Only 최종 76.3(21쌍 중 20쌍에서 우세). parity 0.960 → 0.972.
- "7–9B ≈ 27B": LLaMA-3+Gemma-2 79.7 대 27B 단독 79.2. **모든 최종 점수에 27B judge가 개입**하며, 최종 답이 두
  에이전트를 모두 이긴 경우는 11/21.
- 라운드 1→5 이득 없음. 조합에 따라 붕괴(InternLM-2.5 28.3까지).

### HPTSA, Teams of LLM Agents can Exploit Zero-Day Vulnerabilities ([arXiv 2406.01637](https://arxiv.org/abs/2406.01637))

- 버전 주의: v1(2024-06, Fang et al.)은 15개·4.5×, v2(2025-03, 제1저자 Yuxuan Zhu)는 14개·4.3×, pass@5 42%,
  pass@1 18%.
- planner → team manager → 전문 에이전트 6종(각자 도구·문서). ablation: 전문 에이전트 제거 2.1×, 문서 제거 2.1×,
  계층 없이 무작위 13× 하락. 이득의 원천은 역할별로 다른 도구·문서와 긴 탐색의 계획.
- 한계: n=14, 신뢰구간 없음, 성공 수동 판정.

## 세 근거의 수렴

| 패턴 | 논문 | BTA 018 | F000 |
|---|---|---|---|
| 강한 구성요소가 결과를 정함 | 초기 정확도 β=0.60, 27B judge | 같은 Nano 8개가 1개를 이기지 못함 | Haiku가 판단(strict F1 +0.165)과 생성(usable +40%p 이상) 모두 압도(순환성 주의) |
| 판단 경계는 모델에 맡기면 안 됨 | 타당한 의견을 따를 때만 교정 | 사실 범위를 넘는 판단, 사실 부정, 평가액을 가격으로 씀 | 대상이 없는데도 행동(0/10), 모호함 감지 9/40, 결정과 제안 혼동 |
| 결정론적 계층이 가장 큰 레버 | MAD 이득은 검증자 역할 | refs 모드가 current보다 오류가 적음, 헌법 XIV checker | guard로 0/10 → 10/10, 분류기 단독 92.7% |
| 작은 변화에 민감, 표본 운이 큼 | 조합에 따라 붕괴 | 모드에 따라 방향이 뒤집힘, 반복 간 편차 0.21–0.24 | enum 하나로 clear 228→216, E2 PASS가 E3에서 뒤집힘 |
| 여러 구성요소 시스템은 ablation해야 귀속 가능 | judge 효과 미분리 | single-role 기준선 | 분류기 단독 측정으로 Nano 효과가 작음을 확인 |

## Feature 018 해석에 추가되는 근거

- **8-role의 지연:** F000 B3에서 Nano 지연의 주원인은 입력 prefill(schema 주입 +252ms)과 출력 길이(토큰당 약
  55ms)였고 constrained decoding은 +101ms였다. 8-role은 역할의 출력이 다음 역할의 입력이 되어 두 비용이 쌓인다
  (52초 대 7초와 맞는 구조, 추론).
- **"State를 주는 것 ≠ 모델이 State를 쓰는 것"(F000 B1)** 은 BTA의 값 의미 혼동과 같은 현상이다.
- **F018-R3(8-role이 refs 모드에서 사실 밖 판단을 더 냄)** 은 Yang et al.의 "고쳐 쓰기가 제약에서 멀어지게 함",
  Wu et al.의 "설득력 있지만 타당하지 않은 의견을 따름"과 닮았다. 사후 해석이다.
- **평가 신뢰도:** 018은 사람–Claude 일치 0.414로 기준 미달. F004의 κ 0.83은 같은 Opus의 재심사(자기 일관성)라
  평가자 간 신뢰도보다 약하고, F003·F004는 gold와 Haiku가 같은 Claude 계열이다.

## WebLLM을 가장 강한 참여자로 두는 조합

- 문헌상 가장 유리한 배치는 강한 모델을 최종 결정 지점에 두는 것(Ki et al.의 judge). 위험은 서사 흡수(F018-R3)와
  약한 쪽의 설득(Yang et al.).
- **WebLLM 단독 1-role이 필수 기준선이다.** F002에서 분류기 단독을 재지 않았다면 하이브리드 93.8%를 Nano 덕분으로
  읽었을 것이다. 헌법 XV의 "한 번에 한 요인"에도 해당한다.
- **7–8B가 Nano와 Haiku 사이 어디인지는 어느 프로젝트에서도 측정되지 않았다.** 남은 핵심 미지수다.
- 하드웨어: F000에서 Nano 추론 중 GPU 사용률 p50 94–95%, 모델 파일 4GB, 실제 메모리는 UNKNOWN. M1 16GB에서
  Nano와 WebLLM 7B(4bit)를 함께 올리면 동시 실행은 어렵고 순차 실행에서도 메모리 압박이 예상된다(추론).
- 증거 분류: 헌법 VI의 `REAL_BROWSER_PROMPT_API`와 `WEBLLM_REAL_PROVIDER`가 한 run에 섞이는 경우는 정해져 있지
  않다. spec에서 먼저 정해야 한다.
- F000 10절의 "더 큰 로컬 모델이면 넘는가"와 같은 질문이다. runtime(Electron 45 + GGUF 대 브라우저 WebLLM)이 달라
  수치는 그대로 옮길 수 없다.

## 권장 순서

1. 감사 신뢰도 보완(F018-R1): 항목별 양식, 독립 감사자 2명, 보정 라운드.
2. Nano 1-role 대 WebLLM 1-role(한국어 가능한 후보 1개), 018과 같은 세트·checker, 사전 등록.
3. WebLLM이 확실히 나을 때만: WebLLM 1-role 대 하이브리드.
4. 병행 가능한 저비용 레버: current 모드에서도 숫자를 코드가 렌더링하는 범위를 넓힌다.

## F000 원자료

[f000-on-device-feasibility/](f000-on-device-feasibility/)에 원본 폴더(`무제 폴더/research/f000`, 2026-10-03)를
그대로 옮겼다. `probes/electron45-localai/node_modules`(272MB)만 제외했고 `package-lock.json`으로 복원할 수 있다.
`probes/mattermost-plugin/seed.env`는 로컬 Mattermost preview의 테스트 계정 정보다.
