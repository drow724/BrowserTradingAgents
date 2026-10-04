# F000-A 플랫폼 실현 가능성 보고서

- 일자: 2026-10-03
- 실행 환경: macOS 15.7.4, Apple M1 16GB, Chrome 154.0.8037.93, Xcode 26.3, Node 23.9
- 범위: Phase A만 수행. Phase B는 승인 전까지 시작하지 않는다.

증거 표기는 다음과 같다.

| 표기 | 의미 |
|---|---|
| **V** | VERIFIED. 이 머신에서 직접 실행해 확인함 |
| **D** | DOCUMENTED. 공식 문서나 소스에서 확인함 |
| **I** | INFERRED. 문서와 구조를 근거로 추론함 |
| **U** | UNKNOWN. 판단할 근거가 없음 |

## 판정: CONDITIONAL

> **업데이트 (2026-10-03, Mattermost plugin probe):** "Mattermost 웹(Chrome) + webapp plugin" 경로에서 context 획득부터 on-device 추론, 결과 반환까지 실제로 동작했다(**V**). 원본 서버와 공식 plugin 메커니즘만 사용했고 수정은 없다. 따라서 이 경로는 GO 조건을 충족한다.
>
> 다만 이 경로는 원래 타깃인 "Desktop 앱"이 아니라 "Chrome 브라우저"이고, Chrome 하드웨어 조건(16GB RAM 등)과 Gemini Nano 다운로드가 필요하다. 그래서 전체 판정은 **CONDITIONAL(Mattermost 웹/Chrome 한정 GO)**로 둔다.

수정하지 않은 Slack·Mattermost 클라이언트 6종 중 어느 것에서도 우리 코드가 on-device model을 호출할 수 없다. 남은 경로는 다음 두 가지뿐이다.

- Mattermost 포크(fork) 빌드
- 별도 companion 앱과 서버 API의 조합

Slack은 클라이언트 내부 경로가 전혀 없다. Slack에 대해서는 사실상 NO-GO다.

## 플랫폼 매트릭스

| 플랫폼 | 우리 코드 실행 지점 | 로컬 모델 | 실제 probe | 결과 | 막히는 이유 |
|---|---|---|---|---|---|
| Slack Desktop | 없음. 앱은 모두 서버측(Bolt, Events API, Deno RoS)이다 (D) | Electron 44.4.5(I, 비공식 출처)이며 Gemini Nano가 없다. Prompt API는 에코 stub이다 (V, 동일 계열 Electron 43 기준) | Slack 미설치. 동일 엔진으로 대체 실행 | **FAIL** | renderer 주입 경로가 없다. 주입은 API 약관 위반 소지가 있다 (D/I) |
| Mattermost Web (Chrome 148+) | webapp plugin (**V**) | Chrome Gemini Nano (**V**) | 로컬 서버 + plugin으로 end-to-end 실행 (**V**) | **PASS** (조건부) | Chrome 전용, 하드웨어 조건, 모델 다운로드 4GB, 추출 latency 약 8초 |
| Mattermost Desktop | webapp plugin JS가 Desktop renderer에서 실행된다 (D) | Electron 43.3.0의 `LanguageModel`은 에코 stub이다 (**V**) | Electron 43.3.0 renderer에서 `create()`/`prompt()` 실행 (**V**) | **FAIL** (원본 앱) / **CONDITIONAL** (포크) | 실제 모델을 쓰려면 호스트 앱 main process가 `registerLocalAIHandler`로 모델을 직접 공급해야 한다. 이 기능은 Electron 45 alpha에만 있다 (D). plugin은 이를 켤 수 없다 |
| Slack Android | Slack 내부에는 없다 (I). companion 앱과 Web API 조합만 가능하다 | ML Kit GenAI Prompt API(Beta)는 일부 기기에서만 동작한다 (D) | NOT_TESTABLE (기기 없음) | **CONDITIONAL** (companion 전용) | foreground 전용(`BACKGROUND_USE_BLOCKED`), 비공개 quota, 비마켓 앱의 `conversations.history` 1 req/min 제한 (D) |
| Mattermost Android | 원본 앱에는 mobile plugin이 없다 (D). 포크 빌드에 native module을 넣을 수 있다 (D/I) | ML Kit GenAI (D) | NOT_TESTABLE | **CONDITIONAL** (포크) | 포크를 계속 유지해야 하고 push 서버를 직접 운영해야 한다 (D). 지원 기기가 소수이고 Beta다 |
| Slack iOS | Slack 내부에는 없다 (I). companion 앱이나 share extension만 가능하다 | Foundation Models는 iOS 26 이상, iPhone 15 Pro 이상에서 동작한다 (D) | NOT_TESTABLE (기기 없음. 이 Mac은 macOS 15라 FM을 실행할 수 없다) | **CONDITIONAL** (companion 전용) | 백그라운드와 배터리 상태에서 rate limit이 걸린다 (D, 포럼). 컨텍스트는 4,096 토큰이다 |
| Mattermost iOS | 포크 빌드에 Swift module을 넣을 수 있다 (D/I) | Foundation Models (D) | NOT_TESTABLE | **CONDITIONAL** (포크) | 포크 유지 부담, push 서버 운영, 기기 제한 |

## 실제로 실행한 것 (VERIFIED)

probe 코드와 원본 로그는 [probes/electron-prompt-api/](probes/electron-prompt-api/)에 있다.

**Electron 43.3.0 (Chromium 150), Mattermost Desktop master와 같은 버전.** 실행 조건은 `contextIsolation`, `sandbox`, `nodeIntegration:false`이다.

- `typeof LanguageModel`, `Summarizer`, `Translator`, `LanguageDetector`가 모두 `"function"`이다.
- `Writer`, `Rewriter`, `Proofreader`는 `undefined`이다.
- `LanguageModel.availability()`는 `"downloadable"`을 반환한다.
- `LanguageModel.create()`는 306ms 만에 성공한다.
- `prompt()`의 응답은 다음과 같다.

  ```
  On-device model is not available in Chromium, this API is just echoing back the input
  ```

  호출 뒤에는 availability가 `"available"`로 바뀐다.
- Chrome AI 관련 `--enable-features` 플래그를 켜도 결과가 같다.

**Electron 43 `electron.d.ts`.** `localAI`나 `LanguageModel` 관련 API가 없다.

**사용자 Chrome 프로필.** Gemini Nano가 이미 다운로드되어 있다 (`OptGuideOnDeviceModel/2025.8.8.1141`, 4.0GB).

**Chrome 154 대조군 (PASS).** 같은 probe 페이지를 사용자 Chrome에서 Claude in Chrome으로 실행했다. 원본 로그는 [chrome-output.log](probes/electron-prompt-api/chrome-output.log)에 있다.

- `LanguageModel.availability()`와 `Summarizer.availability()`가 모두 `"available"`이다.
- `create()`는 17,738ms가 걸렸다. 첫 세션의 모델 로드다.
- 첫 `prompt()`는 3,413ms가 걸렸고 `"OK\n"`이라는 실제 답이 나왔다. 에코가 아니다.
- warm prompt를 5회 실행했다. 매번 새로 `clone()`한 세션을 썼다. 결과는 376, 287, 281, 300, 280ms다.
- `responseConstraint`(enum JSON schema)에 한국어 명령 "이 스레드 요약해줘"를 넣었다. 1,661ms 만에 `{"action": "SUMMARIZE"}`가 나왔다.
- `contextWindow`는 9,216이다.
- 측정하지 않은 항목: 메모리, CPU/GPU 사용량, n=1 이상의 분포. 이 항목들은 Phase B에서 측정한다.

같은 Chromium 계열인데도 Chrome에서는 실제 Gemini Nano가 응답하고 Electron에서는 에코 stub이 응답한다. 이 결과로 "API는 Chromium에, 모델은 Chrome에만 있다"는 사실을 V로 확정한다.

**Mattermost webapp plugin + Chrome 154 (PASS).** 코드는 [probes/mattermost-plugin/](probes/mattermost-plugin/)에 있다. 빌드 없는 JS 한 파일이며, 결과는 [output.log](probes/mattermost-plugin/output.log)에 있다.

- 로컬 Mattermost preview(Docker, amd64 에뮬레이션)에 plugin을 `mmctl`로 설치했다. 테스트 계정 정보는 `seed.env`에 있다.
- plugin 코드의 실행 흐름은 다음과 같다.
  1. Redux store에서 현재 채널 id를 얻는다.
  2. same-origin REST로 최근 메시지를 가져온다. 9건, 17ms가 걸렸다.
  3. `LanguageModel.prompt()`에 `responseConstraint`로 8개 action enum과 `decisions[]`를 지정해 호출한다.
  4. 구조화된 JSON 결과를 반환한다.
- 서버 CSP(`script-src 'self'`)는 Prompt API를 막지 않았다.
- cold 실행: `create`는 16.6초, `prompt`는 8.7초가 걸렸다. warm 실행: `create`는 약 0ms, `prompt`는 8.2초가 걸렸다. 2회 측정이므로 분포로 보면 안 된다.
- 두 번 모두 `action`은 `FIND_DECISIONS`로 정확했다.
- 추출 품질에는 문제가 있었다. "제안"("~가 좋을 것 같아요")과 "질문"("~어떻게 할까요?")까지 결정 사항에 넣었고, 두 실행의 결과도 서로 달랐다. 이 문제는 Phase B의 측정 대상이다.
- 추출 latency 8초는 사전 등록 기준(3초 이하)을 크게 넘는다. 아직 Phase B 결과는 아니지만 위험 신호다.
- 채널 헤더 버튼은 icon을 `null`로 등록해 화면에 렌더되지 않았다. UI 경로는 확인하지 않았지만 feasibility 판정에는 무관하다.
- 확인하지 않은 것: Mattermost Desktop 앱 안에서의 동작. 위 Electron probe 결과에 따르면 같은 plugin이 Desktop 앱에서는 에코 stub을 받을 것으로 보인다(I).

## 실행하지 못한 것

| 항목 | 상태 | 이유 |
|---|---|---|
| Slack·Mattermost Desktop 앱 실물 | NOT_RUN | 이 머신에 설치되어 있지 않다 |
| Android 전체, iOS 전체, Apple FM on macOS | NOT_TESTABLE | 대상 기기가 없다. 이 Mac은 macOS 15.7이라 Foundation Models에 필요한 macOS 26 조건을 충족하지 못한다 |

## 문서로만 확인한 것 (DOCUMENTED)

- Chrome의 실제 구현은 `chrome/browser/ai/`(optimization_guide)에 있다. `content/`의 기본 구현은 `EchoAIManagerImpl`이다. 이 내용이 위 V 결과의 원인을 설명한다.
  - https://chromium.googlesource.com/chromium/src/+/HEAD/content/public/browser/content_browser_client.cc
- Chrome Prompt API는 Chrome 148부터 web에서 stable이다(표 기준이며, 같은 페이지 본문과 상충함). 요구 조건은 macOS 13 이상, RAM 16GB 또는 VRAM 4GB 초과, 여유 공간 22GB다.
  - https://developer.chrome.com/docs/ai/get-started
- Electron PR #50659 `localAIHandler`는 2026-07-09에 merge되었다. Electron 45 alpha에만 들어 있고 실험 기능이다. 호스트 앱이 utility process에서 모델을 공급해야 한다. Gemini Nano는 포함되지 않는다.
  - https://github.com/electron/electron/pull/50659
- Mattermost Desktop의 구성은 다음과 같다. `WebContentsView`가 서버 URL을 로드하고, `app.enableSandbox()`를 호출한다. `enableBlinkFeatures`나 `registerLocalAIHandler` 호출은 없다.
- Mattermost webapp plugin은 web과 desktop에서만 실행되고 mobile에서는 실행되지 않는다.
  - https://docs.mattermost.com/developers/integrate/plugins/components/mobile
- Mattermost mobile은 Apache 2.0이고 "Build your own app" 가이드가 있다. 단 push proxy를 직접 운영해야 한다.
  - https://docs.mattermost.com/developers/contribute/more-info/mobile/build-your-own
- Slack 앱은 서버측에서만 실행된다. Slack API 약관은 보안 우회와 리버스 엔지니어링을 금지한다.
  - https://docs.slack.dev/workflows/run-on-slack-infrastructure
  - https://slack.com/terms/api
- Slack은 2025-05-29부터 비마켓 신규 앱의 `conversations.history`와 `conversations.replies`를 1 req/min, 15건/req로 제한한다.
  - https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps
- ML Kit GenAI의 사양은 다음과 같다.
  - 전 API가 Beta이고 지원 기기가 한정된다.
  - top foreground 앱에서만 추론할 수 있다.
  - 앱별 quota가 있다(`BUSY`, `PER_APP_BATTERY_USE_QUOTA_EXCEEDED`).
  - Prompt 입력은 4,000 토큰 미만이다.
  - https://developers.google.com/ml-kit/genai
- Apple Foundation Models의 사양은 다음과 같다.
  - OS 26 이상이 필요하다.
  - availability 값은 `deviceNotEligible`, `appleIntelligenceNotEnabled`, `modelNotReady`다.
  - 컨텍스트는 4,096 토큰이다.
  - `@Generable`로 구조화 출력을 보장한다.
  - 백그라운드이면서 배터리 상태일 때 rate limit이 걸린다.
  - https://developer.apple.com/documentation/foundationmodels
  - https://developer.apple.com/forums/thread/789788

## 차단 제약

1. **Desktop.** Slack과 Mattermost 원본 앱 어디에도 실제 모델이 없다. Electron에서 모델을 쓰려면 호스트 앱이 직접 모델을 넣어야 하므로 포크가 필요하다. 이 경로는 Electron 45 alpha의 실험 API에 의존하고, 모델 배포와 업데이트도 우리 책임이 된다.
2. **Mobile.** 두 제품 모두 원본 앱에 서드파티 native code를 실행할 지점이 없다. 남는 방법은 Mattermost 포크나 companion 앱이다.
3. **Slack.** 클라이언트 내 실행 경로가 0이다. companion 앱이 메시지를 가져오려면 Web API를 써야 하는데, 비마켓 앱은 rate limit 때문에 사실상 쓸 수 없다. Marketplace 등록이 필요하다(I).
4. **모델 제약.** 모든 후보가 기기 제한, Beta 상태, foreground 전용, 약 4K 토큰 컨텍스트라는 제약을 갖는다. 그래서 Phase B의 State는 작아야 한다.

## 반증된 가정

- **"Electron이므로 Gemini Nano를 쓸 수 있다"는 가정은 틀렸다 (V).** API 표면은 존재하지만 에코 stub이다.
- **`typeof LanguageModel` 검사로 availability를 판단할 수 있다는 가정도 틀렸다 (V).** 이 검사는 거짓 PASS를 낸다. `availability()`조차 `downloadable`에서 `available`로 바뀐다. 실제 `prompt()` 응답까지 확인해야 판정할 수 있다. 이 기준을 이후 모든 probe의 PASS 조건으로 고정한다.
- **"Mattermost는 plugin이 있으니 mobile도 된다"는 가정은 틀렸다 (D).** webapp plugin은 mobile에서 실행되지 않는다.
- **조사 에이전트의 "Electron 43에는 LanguageModel이 없다"는 주장은 V 증거로 수정했다.** 기본 상태에서 존재하며 stub으로 동작한다.

## 후속 발견 (구현하지 않음)

**Mattermost 웹(Chrome 148 이상)과 webapp plugin 조합.** Chrome 페이지 컨텍스트에서 Gemini Nano를 실제로 호출할 수 있음을 확인했다(V). plugin JS가 Mattermost 웹 페이지 안에서 같은 API를 호출할 수 있는지는 아직 확인하지 않았다(I). Mattermost CSP가 Prompt API를 막을 가능성은 낮다고 본다(I). 이 조합은 원본 앱에 수정 없이 공식 plugin 메커니즘으로 "context 획득 → 추론 → 결과 반환"을 할 수 있는 유일한 후보다. 다만 타깃 목록의 "Desktop 앱"이 아니라 "브라우저"에서 동작하는 경로다.

## 권장 다음 단계

승인이 필요하다.

Phase B를 "Mattermost 웹 + Chrome Gemini Nano" runtime으로 진행한다. 위 plugin 경로에서 쓴 `LanguageModel` 호출을 그대로 벤치마크 harness로 옮긴다. 이 결과로 latency 위험(추출 약 8초)과 정확도를 함께 판정한다.

## 재현

```bash
cd research/f000/probes/electron-prompt-api && npm i electron@43.3.0 && (python3 -m http.server 8765 --bind 127.0.0.1 &) && npx electron create.js
```

Chrome 대조군은 위 서버를 띄운 상태에서 Chrome으로 `http://127.0.0.1:8765/probe.html`을 연다. 그다음 DevTools 콘솔에서 아래를 실행한다.

```js
await (await LanguageModel.create()).prompt('Reply with one word: OK')
```
