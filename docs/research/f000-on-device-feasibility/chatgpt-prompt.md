너는 on-device AI 제품 전략과 ML 실험 설계에 밝은 시니어 리뷰어다. 아래는 내가 진행한 기술 feasibility 연구(F000~F002)의 요약이다. 결과를 비판적으로 검토하고, 다음 결정을 함께 내려 줘.

## 1. 연구 목적

핵심 가설은 다음과 같았다.

> Slack/Mattermost 환경에서 on-device LLM에게 정규화된 State와 제한된 Action Space를 주면, 작은 모델로도 실용적인 정확도와 latency로 업무 명령을 routing할 수 있다.

- Action 집합: SEARCH_MESSAGES, READ_THREAD, SUMMARIZE, EXTRACT_TODOS, FIND_DECISIONS, DRAFT_REPLY, REMIND_LATER, NO_ACTION. 이후 실험에서 CLARIFY(되묻기)를 추가했다.
- 사전 등록한 성공 기준:
  - accuracy 90% 이상
  - routing p95 1초 이하
  - invalid action 1% 미만
  - structured output 99% 이상
  - CLARIFY recall 80% 이상
  - 과잉 되묻기 5% 이하
- 모든 실험은 결과를 보기 전에 기준을 등록했고, 결과를 본 뒤 기준을 바꾸지 않았다.
- 실행 환경: Mac M1 16GB, Chrome 154, Gemini Nano(Chrome Built-in AI의 Prompt API)

## 2. 플랫폼 결과 (실제로 실행해서 확인)

| 대상 | 결과 |
|---|---|
| Slack Desktop / Mobile | 서드파티 코드가 클라이언트 안에서 실행될 공식 경로가 없다. 실행 경로가 0이다 |
| Mattermost Desktop (Electron 43) | `LanguageModel` API는 존재한다. 하지만 실제로는 입력을 그대로 돌려주는 echo stub이다. `typeof` 검사만으로는 거짓 PASS가 나온다 |
| Mattermost 웹 + Chrome | 동작한다. webapp plugin이 채널 메시지를 가져와 Gemini Nano로 추론하고 구조화된 결과를 반환하는 end-to-end 흐름을 확인했다. 실제로 동작하는 경로는 이것 하나뿐이다 |
| Electron 45 alpha | 앱의 main process가 `registerLocalAIHandler`로 utility process를 등록하면, renderer의 Prompt API 호출이 앱의 handler로 전달된다. dummy 모델로 이 연결을 확인했다. 단, 모델은 앱이 직접 공급해야 하고(Gemini Nano 아님), plugin은 이 기능을 켤 수 없다. Mattermost를 포크해야 한다 |
| Mobile (Android ML Kit GenAI, Apple Foundation Models) | 문서로만 확인했다. 원본 앱에는 서드파티 실행 지점이 없어서 포크나 companion 앱이 필요하다 |

## 3. Routing 실험 흐름 (Gemini Nano, 한국어 업무 명령)

| 실험 | 내용 | 결과 |
|---|---|---|
| B1 | Free-form 대 Constrained(State + enum + JSON schema) | Constrained가 accuracy 75.7%에서 87.1%로, p95가 7.5초에서 2.67초로 개선되었다. invalid는 9%에서 0%가 되었다. 존재하지 않는 action을 지어내는 문제가 사라졌다 |
| B2 | State 대신 메타데이터, 코드 guard(전제 조건 검사) 추가 | 89.5%, p95 1.48초. 모델은 대상이 존재하는지 판단하지 못했고(0/10), 코드 guard로만 해결되었다 |
| B3 | latency 원인 분리 | 주원인은 schema를 입력에 주입하는 비용(+252ms)과 JSON 출력 길이(+313ms)였다. constrained decoding 자체는 +101ms에 그쳤다 |
| B4 | action 이름만 출력, string enum, schema 입력 생략 | p95 0.95초로 latency는 해결되었다. accuracy는 89.5%로 1건 차이 미달이었다 |
| B5 | CLARIFY를 모델에 맡김 | 모델은 모호함을 감지하지 못했다(recall 22.5%). action 하나를 추가하자 기존 NO_ACTION 판단까지 회귀했다 |
| F001-E1~E3 | 키워드 규칙 사전 분류기 + 모델 + guard | 첫 독립 test set에서 90.2%로 PASS했지만, 400개 확인 실험(3회 반복)에서 84.6~85.4%로 FAIL이었다. 처음 보는 어휘(인사, 업무 밖 요청, 구어체, 오타)에서 키워드 사전이 일반화되지 않았다 |
| F002-E1 | 학습된 소형 게이트 분류기(char 1–3 TF-IDF + 로지스틱 회귀, 229KB, 브라우저 JS) + Nano + guard | 아래 참조 |

## 4. 최신 결과 (F002-E1)

- 조건: 네 번째 독립 test set n=355, 모델 3회 반복 실행

| 항목 | 결과 |
|---|---|
| Accuracy | 93.8~94.1% (95% CI 하한 90.8% 이상) |
| CLARIFY recall | 87% |
| 과잉 되묻기 | 0% |
| p95 latency | 3회 중 2회가 1.08초로 기준(1초)을 넘었다. 원인은 불명이다 |
| 판정 | PARTIAL (1/3) |

- **LLM 없이 9-way 분류기만 써도 92.7%다.** Nano를 붙였을 때와의 차이는 1.4%p이고, 통계적으로 구분되지 않는다.
- 학습 데이터와 test set은 모두 LLM 에이전트가 작성한 합성 한국어 명령이다. 규모는 학습 1,070개, test 약 1,100개다. 실제 사용자 명령으로는 검증하지 않았다.
- 각 test set은 규칙이나 분류기를 보지 않은 별도 에이전트가 작성했다. 분류기와 규칙은 해시로 동결한 뒤 평가했다.

## 5. 현재 내 해석

- 원래 가설인 "on-device LLM이 routing을 맡는다"는 사실상 기각된다. routing에서 LLM이 더하는 가치가 작고, latency 위험만 키운다.
- 측정 결과가 가리키는 대안 구조는 이렇다. **routing은 소형 분류기가 맡고, LLM은 요약·추출·초안 같은 생성 단계에만 쓴다.**
  - 참고로 생성 단계의 latency는 B1 기준 p95 약 5.9초였다.
  - 추출 품질에도 문제가 있었다. 결정과 제안을 구분하지 못했다.
- 가장 큰 미검증 위험은 합성 데이터와 실제 사용자 명령 사이의 격차다.
- 앞으로 프로젝트의 중심 질문은 "Gemini Nano를 어떻게든 쓰는 방법"이 아니라 이것이다. **"Nano가 baseline(rule/classifier) 대비 유의미한 incremental value를 만드는 작업이 하나라도 있는가?"** 그런 작업이 없다면 중단하는 것이 올바른 실험 결과다.

## 6. 너에게 묻고 싶은 것

1. **실험 설계 비판.** 위 결론에서 과대해석이나 놓친 교란 변수가 있는가?
   - 예: 합성 데이터의 분포 편향, 같은 계열 LLM이 학습 데이터와 test 데이터를 모두 만든 문제, 단일 기기 측정
2. **피벗과 LLM 필요성 판단.** 현재 결과로 보면 routing은 처음부터 LLM이 필요 없는 문제였을 수 있다.
   - 그렇다면 후속 semantic task마다 "LLM이 실제로 필요한가?"를 먼저 검증해야 하는가? 후보 task는 다음과 같다.
     - TODO 추출
     - 결정과 제안 구분
     - 대기 상태(waiting) 판단
     - 답장 필요(needs-reply) 판단
     - 초안 생성
   - "Rule/classifier → Gemini Nano → 강한 LLM" 순으로 비교한다면, task별 incremental value를 재는 실험을 어떻게 설계해야 하는가? 참고로 지금까지 클라우드 LLM 기준선은 한 번도 실행하지 않았다.
   - 내가 "routing은 classifier, generation은 LLM"이라는 흔한 결론으로 너무 빨리 피벗하고 있는지도 비판해 줘.
   - 마지막으로, on-device LLM을 생성 단계에만 쓸 때 사용자가 체감하는 가치와 서버 LLM 대비 약점을 냉정하게 평가해 줘.
3. **실사용 데이터 확보 계획.** 실제 Mattermost/Slack 사용자 명령 100~200개를 개인정보 문제 없이 모으고 라벨링하는 현실적인 방법을 제안해 줘. 사내 파일럿, 설문, 로그 비식별화 등의 장단점을 비교해 줘.
4. **사업성.**
   - Mattermost에는 공식 AI plugin(Agents)이 이미 기본 번들로 들어 있다.
   - 이 상황에서 "GPU 서버 없이 브라우저 안에서 도는 AI"라는 차별점을 살 고객이 있는가?
   - 있다면 누구이고, 망분리 환경에서 Gemini Nano 모델 배포(약 4GB 다운로드) 문제를 어떻게 볼 것인가?
5. **다음 한 걸음.** 중단, 피벗, Electron 45 포크 중 하나만 고른다면 무엇을 추천하는가? 그 이유와 첫 실험의 성공 기준까지 제안해 줘.

답변할 때는 확인된 사실과 추론을 구분해 줘. 내 결론에 동의하지 않는 부분이 있으면 근거와 함께 분명히 말해 줘.
