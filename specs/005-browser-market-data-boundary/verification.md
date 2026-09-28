# Verification: Feature 005 — Browser Market Data Boundary

## Checkpoint A — baseline, protected hashes, R0 (2026-09-28)

### T001 Baseline

- Branch `005-browser-market-data-boundary`; HEAD = `origin/main` =
  `cca9c9a1abdcfa47d60f43d34fca43b07255fd0a` (PR #5, Feature 004 merged).
- `git status --short`: untracked only — `specs/005-browser-market-data-boundary/` (this Feature's
  docs) and unrelated Spec Kit/Claude tooling (`.claude/`, `.specify/*`, `CLAUDE.md`). Tracked dirty
  files: 0. Code paths (`index.html src test harness e2e package.json package-lock.json
  vite.config.ts`): clean — no Feature 005 production change yet.
- `npm ls`: `akarisp@0.1.0-alpha.2`, `@langchain/core@1.2.13`, `@langchain/langgraph@1.4.18`.
- Feature 004 gates: typecheck exit 0; build PASS (`dist/index.html` + `dist/assets/`); `npm test`
  43/43; `npm run test:browser` 7/7.

### T002 Protected hashes (`shasum -a 256`, 47 tracked files)

specs/001 5, specs/002 13, specs/003 13, specs/004 12, harness 2, `src/graph/trading-graph.ts`,
`src/integration/akari-chat-model.ts`. Re-checked in T042 and T053 with `shasum -a 256 -c`.

```text
791971c27ab834f44075697eeae5af3a4997163f78e2cb6b4b219ec8b1ec67f0  harness/index.html
d9ec9319b249d39b6fb37c38f3be7dfebac0a7a92ce8b11df3bdcdff2a9651e6  harness/main.ts
1532dc6476e7abff69d1d7293ed6706012e26b5340e5be5004a350a896430703  specs/001-tradingagents-reference-analysis/checklists/requirements.md
714ec8e5ff479bd9d351ca637f8f052298f118bf762e6ca5bc24cf72714f0981  specs/001-tradingagents-reference-analysis/plan.md
324b1361ad829cc120e1d4c0424cdba58379a129b3f887c62d74ee9bd452ddea  specs/001-tradingagents-reference-analysis/research.md
3878b0af91dc8b2def895178895fb75b59be43bbf30061903e80684b4a35bdb8  specs/001-tradingagents-reference-analysis/spec.md
acd8ba84ced817211910af3ec38154c16e554ddd8fb5e130cd19b173359ee50b  specs/001-tradingagents-reference-analysis/tasks.md
d4bec122fb9207335858bad2399bd6ac64a6bd899fb6485e4194945d5c309b3d  specs/002-langchain-akarisp-integration-validation/checklists/requirements.md
87940542f59477aef2d08341b83d441b0ca97c9480d8ad5cd9578da5aa76babf  specs/002-langchain-akarisp-integration-validation/contracts/bridge.md
a355f02926cdd347fde02bc38d6bc8b31ff452cba8e559783df19b8ccf38aac6  specs/002-langchain-akarisp-integration-validation/contracts/evidence.md
4f52433f3d1ac403a1dddbddf766b4d6eb244b9d73a7a19a660bf6a8ea5cce48  specs/002-langchain-akarisp-integration-validation/data-model.md
7dd24a07d61a60608d9f48fb6e18cfc3cc07082242a4b6d9666820ab87a037e9  specs/002-langchain-akarisp-integration-validation/evidence/browser-automated-2026-09-28.json
8cbc3c573d48277bc9bcf89860a8c5d59e352cdabaa56efff49d402db042a292  specs/002-langchain-akarisp-integration-validation/evidence/real-browser-2026-09-28-ce3f946.json
e62c9a7d1daa055039759254279fba89ede46e693589f5551db633c7dc6225db  specs/002-langchain-akarisp-integration-validation/evidence/real-browser-2026-09-28.json
f2e8a366503840eac54c3bf8898d1a69560cb7c7806e65365f9541507ff1a949  specs/002-langchain-akarisp-integration-validation/plan.md
9ae780e47a9ff8d79ec07870aac6db716e555f274a377f479cd653071cba0bea  specs/002-langchain-akarisp-integration-validation/quickstart.md
9d95802b184ded45e464169643a85846a8095fd4e83666dde78933f5e23f7c96  specs/002-langchain-akarisp-integration-validation/research.md
a6a06bd042e8a42fa83771759ec8b7df915f8fedb393ba1af8b890369b5872df  specs/002-langchain-akarisp-integration-validation/spec.md
406c3ae54c0bc8711a9f1dc5dc01f4d3ea8f77146c1f90bfff581733afa88be5  specs/002-langchain-akarisp-integration-validation/tasks.md
80e396313a5f637002dc4787eaca358a57acc765630dc30cf6c9561fa5f77291  specs/002-langchain-akarisp-integration-validation/verification.md
0d14cfc25fb8eb805991d3d3d93f02b2164efe95014a87bab06bdbfd923723b4  specs/003-langgraph-akarisp-minimal-graph/checklists/requirements.md
4fabebf3b0d97d45c6de8258fc3e6cbfb0ffec951651683bdf0d613dd1fec8a9  specs/003-langgraph-akarisp-minimal-graph/contracts/evidence.md
f18ecc6a28387fcb39889b8e11ee2d4910cab5d75c4151a52a7c2664defef175  specs/003-langgraph-akarisp-minimal-graph/contracts/graph.md
d29e4634760eebc5f5605ce17056e0c07009b72406abe7b3bab33530d4c0e1f8  specs/003-langgraph-akarisp-minimal-graph/data-model.md
2c83260d0f1cff02edc9d45b554507969df59285ca5a087c4c363852ca4579ff  specs/003-langgraph-akarisp-minimal-graph/evidence/browser-automated-2026-09-28-4e64472.json
1c3306adc44aed0f6388a50491682ff42fa56477006df9cfb172c2896429cc67  specs/003-langgraph-akarisp-minimal-graph/evidence/browser-automated-2026-09-28.json
84ec0eb5818668d918730881766c48b61e7c95c202e5990ea0690c77747d00ab  specs/003-langgraph-akarisp-minimal-graph/evidence/real-browser-2026-09-28-4e64472.json
99949901743079a57c010e4d352b41782736f965c7518c5f5fce248dbbf6e11b  specs/003-langgraph-akarisp-minimal-graph/plan.md
bc3f94673136f7c33d00896e50760bb3d62dcbfb730f15753874adddb00f00f7  specs/003-langgraph-akarisp-minimal-graph/quickstart.md
bb9efa0b97ae6875153cdd6555d2391e4ae0fd6f892caed2e2517a7dc0029376  specs/003-langgraph-akarisp-minimal-graph/research.md
cc5a442da0c2aa0de0d67fab101cd9073d3ac6b3090659ffa65aa75c7065bc7a  specs/003-langgraph-akarisp-minimal-graph/spec.md
71e66b39b0d1d3c0c54921f854ac522d71e054fa5fddd23a127188e32b258017  specs/003-langgraph-akarisp-minimal-graph/tasks.md
035b02aefbe56658b81861f1863e23f14b6cb1dd7918e6ef137af4339654b7e7  specs/003-langgraph-akarisp-minimal-graph/verification.md
2a0e395c1703be7c964c5bd2d9fb802b6b80860efbaaf5583df594f7619e0245  specs/004-browser-tradingagents-fixture-graph/checklists/requirements.md
35b982ae35b4894d5bdd544f9c9bb58e5caebb4f5ad0440158d82a19966e15fa  specs/004-browser-tradingagents-fixture-graph/contracts/evidence.md
74309f4c8019e4ff0ba858828075dab21a0955fd463e3bd49e54469ec7a96d69  specs/004-browser-tradingagents-fixture-graph/contracts/graph.md
a159cf3d0ae1c0f7903a1eff74d9c73548fa0d180a8ea314486cf20e46c66f9d  specs/004-browser-tradingagents-fixture-graph/data-model.md
c6471f02773dfacaab6f5116de03b265ceb97bd49dc0dec92d1666d34d385c1f  specs/004-browser-tradingagents-fixture-graph/evidence/browser-automated-2026-09-28-a0584fd.json
d32ad68438b9bcd6388da8340b7230b7fa1ff4a1fbfcd3ab5837acd53c30c017  specs/004-browser-tradingagents-fixture-graph/evidence/real-browser-2026-09-28-a0584fd.json
dabe803f5bdaeb0be4881db4d5aae70ff9a73adf3bfcf81d62c4260728a1a5d2  specs/004-browser-tradingagents-fixture-graph/plan.md
e1f0cc58e72fb4bb8635d62fb2811d72f09762cbe38ff362e40a62cace005fa7  specs/004-browser-tradingagents-fixture-graph/quickstart.md
ee115463b5a908aaccd2e30024a572ac096c35ea69001983ed85c638bb1861c4  specs/004-browser-tradingagents-fixture-graph/research.md
8e1b732d1bf79355d2306c34e1c4f315daf6c1f5977fdf867cd64ec51c1a8d2b  specs/004-browser-tradingagents-fixture-graph/spec.md
67998c88b17f1ae8e220d560b6bbbdf63d5eaddbd960f39c866ca4a30309c4ec  specs/004-browser-tradingagents-fixture-graph/tasks.md
f8e7e7c13c66dfa82b2c0d038b6dcbf2e1510e69eec98d48d4d86e24f7a30d50  specs/004-browser-tradingagents-fixture-graph/verification.md
69f3df1912f4c677145e3933328939510024f5fba258fb1be9b9ab9d9515598f  src/graph/trading-graph.ts
c243b34ab613a1fc53e3cd577dc72f80b04b9b6b37c5e448499368247509ad35  src/integration/akari-chat-model.ts
```

### T003 R0 browser CORS probe (no credential)

One-off script in the session scratchpad (not committed); source reproduced below. Runner: Node +
Playwright's bundled Chromium (`@playwright/test` 1.63.0), headless; Vite dev server on port 5179;
page `http://localhost:5179/?provider=standin` (app origin). Request: `GET` with a fake,
non-credential `Authorization: Bearer …` literal — a non-simple header, so the browser must pass a
CORS preflight before the GET. No real credential exists in this session.

```js
// R0 (Feature 005 T003): browser CORS preflight + error-response probe. One-off, not committed.
// Uses a fake bearer only. Proves nothing about authenticated success responses.
const { spawn } = require('node:child_process');
const REPO = '/Users/songjaegeun/git/BrowserTradingAgents';
const { chromium } = require(`${REPO}/node_modules/@playwright/test`);

const PORT = 5179;
const et = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d);
const now = new Date();
const to = et(now);
const from = et(new Date(now.getTime() - 10 * 86_400_000));
const url = `https://api.massive.com/v2/aggs/ticker/IBM/range/1/day/${from}/${to}?adjusted=true&sort=asc`;

(async () => {
  const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: REPO, stdio: 'ignore' });
  try {
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/?provider=standin`);
    const result = await page.evaluate(async (u) => {
      const out = { origin: location.origin, requestedAt: new Date().toISOString() };
      try {
        const res = await fetch(u, { headers: { Authorization: 'Bearer r0-dummy-not-a-key' } });
        out.fetch = 'resolved';
        out.status = res.status;
        out.type = res.type;
        out.contentType = res.headers.get('content-type');
        try { const body = await res.json(); out.jsonReadable = true; out.bodyKeys = Object.keys(body); out.bodyStatus = body.status; out.bodyError = body.error; }
        catch (e) { out.jsonReadable = false; out.jsonError = String(e); }
      } catch (e) {
        out.fetch = 'rejected';
        out.error = `${e.name}: ${e.message}`;
      }
      return out;
    }, url);
    console.log(JSON.stringify({ browser: `chromium ${browser.version()}`, endpointShape: '/v2/aggs/ticker/IBM/range/1/day/{from}/{to}?adjusted=true&sort=asc', from, to, method: 'GET (with Authorization → CORS preflight required)', ...result }, null, 2));
    await browser.close();
  } finally {
    vite.kill();
  }
})();
```

Observed (2026-09-28T11:23:24Z, revision `cca9c9a` + uncommitted Feature 005 docs only):

```json
{ "browser": "chromium 153.0.8010.12", "origin": "http://localhost:5179",
  "endpointShape": "/v2/aggs/ticker/IBM/range/1/day/{from}/{to}?adjusted=true&sort=asc",
  "from": "2026-09-18", "to": "2026-09-28",
  "fetch": "resolved", "status": 401, "type": "cors", "contentType": "application/json",
  "jsonReadable": true, "bodyKeys": ["status", "request_id", "error"],
  "bodyStatus": "ERROR", "bodyError": "Unknown API Key" }
```

### T004 R0 gate: **PASS**

The browser passed the preflight and JavaScript read the HTTP error status and JSON body
(`type: "cors"`). Scope: **browser preflight/error-response compatibility only**. Not shown:
authenticated success-response CORS (L4), account validity, permitted use (P-1), market-data success
(L4/L5). `TECHNICAL_PURE_BROWSER_VIABILITY` stays CONDITIONAL PASS. F005-001: not raised.

### T005 `.local/` protection

`.gitignore` gains one line `.local/`. `git check-ignore` → `.local/replay/x.json` ignored;
`specs/005-…/evidence/*.json` and `src/*` not ignored (scope not widened).

**Checkpoint A: PASS.** Next allowed: T006 (Checkpoint B).

## Checkpoint B — L1 deterministic data boundary (2026-09-28)

### Files

- `src/market-data.ts` (new, Massive-specific, no provider interface): `LIVE_INSTRUMENT`,
  `MarketSnapshot`/`Session`/`MarketDataFailure`, `etDate`, `acquireDailyBars`, `normalize`,
  `renderMarketFacts`, `snapshotDigest`, `marketFactsDigest`, `replayArtifact`, `buildLiveInput`.
- `src/graph/trading-fixture.ts`: `NEUTRAL_NEWS` added; `FIXTURE` unchanged (deep-equal test).
- `test/market-data.test.ts` (new, 18 tests).
- Not touched: `src/main.ts`, `index.html`, `src/graph/trading-graph.ts`, `src/integration/*`, AkariSP,
  `package*.json`.

### Results — `node --test test/market-data.test.ts`: 18 tests, 17 pass, 1 skipped, 0 fail

| Task | Proof |
|---|---|
| T008 | 7 bars → last 5 ascending; snapshot keys exactly `symbol, currency, sessions, asOf`; session keys exactly `date, open, high, low, close, volume`; 2 and 3 bars kept; same body → deep-equal; `status` `DELAYED`/`ERROR`/unknown/`ok`/number/missing/null body → `provider-error`; `results` missing/non-array → `invalid-data`; 0–1 bar → `unavailable`; missing `o h l c v t`, `NaN`, `Infinity`, 0, negative, string price, negative or non-integer volume, non-integer `t`, null bar → `invalid-data`; descending, duplicate, future (> `receivedAt` ET date) → `invalid-data`; same-day OK |
| ET | midnight-ET `t` → own date; 23:59 ET → previous date; both DST changes (2025-11-02, 2026-03-08); also PASS under host `TZ` Pacific/Kiritimati, Pacific/Pago_Pago, Asia/Seoul |
| T010 | exact text `On the 2026-09-25 close IBM traded at 104.00 USD, +0.73% from the previous session's 103.25 (market fact L1). Over the last 5 sessions it ranged from 99.00 to 105.00 on average daily volume of 1100000 shares (market fact L2).`; repeatable; no `"results"`, `"vw"`, `"t":`, `request_id`, `{`; negative change rendered `-5.00%` |
| T012 | `sha256:` + 64 hex; stable; same content with different key order → same digest (explicit canonical serialization); one changed close → different digest; digests contain no market value |
| T013 | `buildLiveInput` = `{ id: live-market@1, subject: 'International Business Machines Corp. (IBM)', marketFacts: <rendered>, newsFacts: NEUTRAL_NEWS.text }`; neutral text names no company (`IBM`, `International Business`, `Northwind` absent); `FIXTURE` deep-equals Feature 004 |
| T014 | empty key → `credential-missing`, 0 fetch calls; exactly 1 call to `…/range/1/day/2026-09-18/2026-09-28?adjusted=true&sort=asc` (ET window), key absent from URL and from the result, header `{ Authorization: 'Bearer <key>' }`; 401/403 → `unauthorized`, 429 → `rate-limited`, 500/404 → `provider-error`, each 1 call (no retry); non-JSON 200 → `invalid-data`; rejection → `network`; run abort → `cancelled`; 20 ms limit → `timeout` |
| T016 | synthetic replay artifact `{snapshot, marketFacts, snapshotDigest, marketFactsDigest}` re-digests and re-renders to itself, no `Bearer`/`Authorization`; `.local/replay/` check **skipped** (no local artifact exists before owner-run L4/L5) |

No-network proof: the test file replaces `globalThis.fetch` with a function that throws; every
acquisition test injects its own stub; the suite passes, so no test reached the network. Real
credential: none (the only key is the literal `l1-dummy-key-not-real`).

Recorded deviations:
- Order: `src/market-data.ts` was written before its tests ran (tasks order test → implementation
  per pair). All tests were written against the contracts, and Mutation C shows they bite.
- `MarketDataFailure.kind` includes `cancelled`. contracts/evidence.md lists it under market-data;
  T006's list omitted it.
- A test bug (a default parameter turned `status: undefined` into `'OK'`) was found by the first run
  and fixed in the test. The missing-status case now omits the field. No production change.

### T017 Mutation C — raw provider bars bypass normalization (not committed)

`src/market-data.ts` copied → `normalize` returned `sessions: results.slice(-5)` (Massive bar objects)
→ 7 FAIL, including T008 "only application field names", T010 "exact deterministic text", digests,
live input and replay → restored from the copy, `cmp` identical, `MUTATION` marker 0 → 17/17 pass.

### T018 Checkpoint B gate

typecheck exit 0; `npm test` 61 tests: 60 pass, 1 skipped (local replay), 0 fail (Feature 004 43 +
Feature 005 18). T002 protected hashes: `shasum -c` 47/47 OK. `import.meta.env`, `VITE_`, storage and
`console` in `src/market-data.ts`: 0. `src/main.ts` and `index.html` do not reference the new module.

**Checkpoint B: PASS.** Next allowed: T019 (Checkpoint C).

## Checkpoint C — application integration (2026-09-28)

### Changes

- `index.html` (T019):
  - The false sentence "Nothing is sent anywhere" is replaced. Fixture mode (default) makes no
    market-data request. Live mode (`?data=live`) requests end-of-day IBM bars from Massive at run
    time with the typed key. "live" means fetched at run time, not real-time; news stays a
    committed neutral text.
  - New elements: `#mode`, `#key-row` (`<input id="key" type="password" autocomplete="off">`,
    hidden unless live), `#market`, `#replay`.
- `src/main.ts` (T020–T023):
  - `data` is parsed from `?data` independently of `provider`.
  - The run `AbortController` is now created in `run()` and passed to `runGraph`, so Cancel covers
    acquisition.
  - Order: native preflight (provider = native only), then data (fixture → `FIXTURE`; live →
    `prepareLive`: acquire → normalize → replay/digests), then `runGraph(input)`, which is the only
    place `createRuntime` is called.
  - A live failure or cancel returns a market-data record before `runGraph`: 0 runtimes,
    `logicalRequests` 0, `lifecycle: null`.
  - Inference-side records carry `failure {boundary: 'inference', kind}`: `native-unavailable`
    (BLOCKED), `runtime-create`, `model` (TaskError), `graph`, `cancelled`.
  - Every record has `dataSource.mode`. Fixture records keep `fixture` and the full `result`. Live
    records carry the `dataSource` provenance and both digests, with no values, and `result`
    `{present, length}` for either provider.
  - A live success shows the snapshot in `#market` and the replay artifact in `#replay`, never in
    `#evidence`.
  - The key is read from `#key` inside the `acquireDailyBars(...)` call expression only.
  - The `runGraph` lifecycle block (settle poll → `snapshotBeforeShutdown` → `shutdown()`) is
    unchanged in the diff.
- `src/market-data.ts`: `replyProvenance(body)` (so `main.ts` never reads Massive field names) and
  `ageHours(asOf, receivedAt)`, with one L1 test (EDT and EST closes).
- Not changed: `src/graph/trading-graph.ts`, `src/integration/*`, AkariSP, `package*.json`.

### T024 Checkpoint C gate

- typecheck exit 0; build PASS (`dist/index.html` + `dist/assets/`)
- `npm test` 62: 61 pass, 1 skipped (local replay), 0 fail
- `npm run test:browser` 7/7. The Feature 004 cases are unchanged because fixture is the default mode.
- T002 protected hashes 47/47 OK.
- `import.meta.env` / `VITE_` / storage / `document.cookie` in `src/`: 0. `console.` in
  `src/main.ts` and `src/market-data.ts`: 0.
- No real Massive request and no credential in this checkpoint. The live path is exercised by
  Checkpoint D with controlled responses.

**Checkpoint C: PASS.** Next allowed: T025 (Checkpoint D).

## Checkpoint D — L3 browser, controlled responses (2026-09-28)

### Setup (`e2e/app.spec.ts`; test-side only, no production test hook)

- `guardNetwork`: every non-`localhost` request is aborted and recorded. Massive requests are
  answered by `page.route('https://api.massive.com/**')` with synthetic bodies (invented prices, e.g.
  184.61; `t` = midnight ET). Real network: 0 in every test (`net.external` is asserted empty).
- `countCreates`: wraps the installed stand-in's `LanguageModel.create`. AkariSP's `createRuntime`
  calls it eagerly, so the count is the number of runtimes created.
- Key: the literal `l3-dummy-key-not-real`. No real credential.

### Results — 21 new tests, first run all PASS

| Task | Test | Result |
|---|---|---|
| T025 | Feature 004 test (a) extended | `dataSource {mode: fixture, fixture}`; `input` fixture ids; finalDecision echo contains `Northwind Lamps Ltd. (fictional)` and `news fact N1`; 0 Massive and 0 external requests; all Feature 004 assertions unchanged — PASS |
| T026 | stand-in + live success (**first execution of the live path**) | request: 1 GET to `…/IBM/range/1/day/<ET today−10>/<ET today>?adjusted=true&sort=asc`, `authorization: Bearer <dummy>`, key not in URL. Record: `BROWSER_AUTOMATED`, 8 roles done ×1 (incl. News), 8/0/NOT EXPOSED, settled before shutdown `{ready,0,0}` → `closed`, creates 1, `input {live-market@1, neutral-news@1}`, no `fixture`, `dataSource` provenance (`httpStatus 200`, `providerStatus OK`, `requestId`, `bars 7`, `asOf 2026-09-25`, times, `ageHours`), `result` = `{present, length}` only. `#evidence` contains none of the prices, `market fact L`, `stand-in reply`, `Authorization`, `Bearer`, key. `#replay` = `{snapshot, marketFacts, snapshotDigest, marketFactsDigest}`; `marketFacts` equals the expected text exactly; digests equal the record's and re-hash in Node; no key. `#result` echo: IBM subject, neutral news text, no Northwind, no `news fact N` — PASS |
| T027 | failure matrix (11 cases) | network abort → `network`; 401 and 403 → `unauthorized`; 429 → `rate-limited`; 500, `status ERROR`, `status DELAYED` → `provider-error`; invalid price and non-JSON → `invalid-data`; 1 bar → `unavailable`; empty key → `credential-missing` (0 requests). Each: `failed`, boundary market-data, **creates 0**, `logicalRequests 0`, `lifecycle null`, nodes waiting, no `result`/`fixture`/digest, exactly 1 request (no retry), empty `#replay`, no Northwind, Run re-enabled — 11 PASS |
| T028 | timeout (`page.clock.fastForward(30 000)`) | `timeout`, creates 0, 0 requests to the model — PASS |
| T029 | Cancel during acquisition | `cancelled`, boundary market-data, creates 0, `logicalRequests 0`, `lifecycle null` — PASS |
| T030 | Cancel during the graph (acquisition succeeded; stand-in held at `{active 1, queued 1}`) | `cancelled`, boundary inference, creates 1, both requests `cancelled`, Bull…Final waiting, no `result`, snapshot digest kept, `settledBeforeShutdown` true, before `{ready,0,0}`, after `closed` — PASS |
| T031 | native + live in Chromium | `BLOCKED`, `not-run`, `failure {inference, native-unavailable}`, `dataSource {mode: live}` only, 0 Massive requests — PASS (ordering proof, not a native PASS) |
| T032 | four mode URLs | `#mode` text and record `provider`/`dataSource.mode` correct for all 4; key field visible only for live; classes `BROWSER_AUTOMATED` (stand-in) / `BLOCKED` (native in Chromium) — 4 PASS. The two native modes are proven by T044 and T051, not here |
| T033 | leakage | after one success and one failure: dummy key absent from `#evidence` (also `Authorization`, `Bearer`), `#replay`, `#market`, `#result`, localStorage, sessionStorage, `document.cookie`, context cookies, serialized HTML, page URL, request URLs and console. Present only in the outgoing `authorization` header — PASS. After the suites: `grep -r l3-dummy-key-not-real test-results/` = 0 files |

### Mutations (not committed; restored from a scratchpad copy of `src/main.ts`)

| Mutation | Change in `src/main.ts` | Designated test | Observed | Restore |
|---|---|---|---|---|
| A — silent fallback | on a market-data failure run `runGraph(…, FIXTURE, …)` | T027 (and T028/T029) | 13 FAIL: `outcome` Expected "failed", Received "success" | `cp` back, `cmp` identical, `MUTATION` 0 |
| B — runtime before acquisition | `await createRuntime(RUNTIME_OPTIONS)` before `prepareLive` | T027, T029 creates assertions | 13 FAIL, e.g. `expect(await creates(page)).toBe(0)` Received 1 (T029 and matrix); native BLOCKED test unaffected (PASS) | `cmp` identical, `MUTATION` 0 |
| D — credential leak | `dataSource.endpoint` gets `?apiKey=<field value>` | T033 | FAIL: `#evidence` contains the dummy key | `cmp` identical, `MUTATION` 0 |

Post-restore: the full browser suite passes (below).

### T037 Checkpoint D gate

| Command | Result |
|---|---|
| `npm run test:browser` ×3 | 28 passed; **1 failed + 27 passed**; 28 passed |
| `--repeat-each=5` (all) | 138 passed, 2 failed — both `e2e/harness.spec.ts` "stand-in provider" (`#status` stayed `idle`, 30 s test timeout) |
| `e2e/app.spec.ts --repeat-each=5` | **130/130** (Feature 004 + Feature 005 app tests stable) |
| `e2e/harness.spec.ts --repeat-each=20` alone | 39 passed, 1 failed (same test, same symptom, no app test running) |
| typecheck / build / `npm test` | exit 0 / exit 0 / 62: 61 pass, 1 skipped, 0 fail |
| T002 protected hashes | 47/47 OK (`trading-graph.ts`, `akari-chat-model.ts` unchanged) |
| `dist/` scan | dummy key 0; the only `apiKey=` hit is bundled LangSmith client code (`this.apiKey=` from `@langchain/core`'s dependency), not application code. T040's pattern will be narrowed to the application's own forms. |

```text
Finding ID: F005-002
Feature: 005-browser-market-data-boundary (observed); origin Feature 002 harness
Scenario: npm run test:browser — e2e/harness.spec.ts "stand-in provider: S1–S5 and S7 PASS, S6 observed"
Observed: intermittently `#status` stays `idle` and the test hits its 30 s timeout (1/3 suite runs;
  2/5 repeats; 1/20 repeats with harness.spec.ts alone)
Expected: the Run click starts the harness run
Reproduction: npx playwright test --project=chromium e2e/harness.spec.ts --repeat-each=20
Evidence class: BROWSER_AUTOMATED
Data mode: n/a (harness has no data mode)
Market-data source involved: none
LangGraph contract involved: none
LangChain contract involved: none
AkariSP contract involved: none
Analysis: harness/index.html renders `<button id="run">` enabled, and harness/main.ts registers its
  click handler only after top-level awaits (availability check, dynamic stand-in import). A click
  that lands before registration is lost. This is the click-before-handler race fixed for the
  canonical app in Feature 003 ("Run disabled until init") but never in the frozen Feature 002
  harness. Feature 005 does not touch harness/, e2e/harness.spec.ts or anything the harness imports.
  The larger browser suite (7 → 28 tests) raises parallel load and makes the race visible.
Application workaround possible?: yes — (a) make e2e/harness.spec.ts wait for a harness-ready signal
  before clicking (test-only change), or (b) disable the harness Run button until init (changes a
  T002-protected historical file; not proposed).
Core change required?: NO
Confidence: HIGH (reproduces with the harness spec alone; symptom = click lost)
Status: CLOSED 2026-09-28 — test synchronization defect (fix approved by the maintainer, option a;
  see "F005-002 resolution" below).
```

**Checkpoint D: PASS for the Feature 005 scope** (T025–T036; app.spec 130/130 stable). T037 gate
stability is affected only by the pre-existing Feature 002 harness race F005-002 (OPEN). Next allowed:
T038 (Checkpoint E), after the maintainer decides on F005-002.

### F005-002 resolution — test synchronization only (2026-09-28)

- **Not a Feature 005 production defect.** `harness/` is unchanged (T002 hashes). Harness behaviour is
  unchanged. `src/main.ts` is byte-identical to its post-Checkpoint-D copy.
- **Cause**: the e2e test could click Run before `harness/main.ts` attached the click handler. An
  enabled button did not mean the handler was attached.
- **Readiness signal**: already observable, no new hook. `harness/main.ts` line 239 queues
  `browserAvailability.then(… #availability = "provider: …")`, and line 240 then synchronously calls
  `addEventListener('click', …)`. A promise reaction runs only after the module's synchronous
  remainder, so `#availability` containing `provider: ` implies the handler exists. This holds for
  the stand-in and native paths.
- **Change**: `e2e/harness.spec.ts` `run()` adds
  `await expect(page.locator('#availability')).toContainText('provider: ')` before the click. No
  sleep, retry, skip or exclusion; no assertion changed.
- **Validation**:

| Run | Result |
|---|---|
| `e2e/harness.spec.ts --repeat-each=60` alone (previously 1/40 failed) | 120/120 |
| whole browser suite `--repeat-each=5` (the load under which 2/5 failed) | 140/140 |
| `e2e/app.spec.ts --repeat-each=5` | 130/130 |
| `npm run test:browser` ×3 consecutive | 28/28, 28/28, 28/28 |
| T002 protected hashes | 47/47 OK (incl. `harness/index.html`, `harness/main.ts`) |

### Narrowed `dist/` credential scan (replaces the broad `apiKey=` pattern for T040)

The scan targets what the contract forbids, not identifier names in third-party code:
- the distinctive test sentinels (`l3-dummy-key-not-real`, `l1-dummy-key-not-real`,
  `r0-dummy-not-a-key`)
- `BTA_MASSIVE_KEY` and `VITE_` (secret injection into the bundle)
- the application's own forbidden serializations (`apiKey=${`, `?apiKey=`, a serialized
  `"Authorization":"Bearer …` value)

Result on the current build: all 0. The remaining `` `Bearer ${t}` `` hits are header-building
templates (the app's `acquireDailyBars` and bundled library code), not values. LangSmith's
`this.apiKey=` property is not a finding and is not allowlisted. At owner-run L4/L5, the owner checks
for the actual key with a method that never prints it: count-only `grep -c` fed from the silent-read
variable.

## Checkpoint E — stabilization (2026-09-28)

### T038 `e2e/prompt-api.spec.ts`

- The canonical native test also asserts `dataSource.mode === 'fixture'`, and stays credential-free.
- New owner-run test `native Prompt API: live market data run (owner-run L5)`:
  - skipped unless `BTA_MASSIVE_KEY` is set (`env -u BTA_MASSIVE_KEY …` → 1 skipped, no Chrome
    launched)
  - fills `#key` and asserts the SC-016 gate fields
  - writes the evidence and asserts, with boolean checks only, that the file contains no key,
    `Authorization` or `Bearer`
- File-level `test.use({ trace: 'off', video: 'off', screenshot: 'off' })`. `test.use` inside a
  describe is rejected for `trace`, and these are the config defaults anyway; the tests' own
  persistent contexts are never recorded.
- `-g "eight-role"` lists only the canonical fixture test.

### T039 Targeted secret scan

The questions are "is a secret value or a forbidden injection surface present", not identifier names.

| Check | Count |
|---|---|
| `src/`: `import.meta.env`, `VITE_`, `localStorage`, `sessionStorage`, `document.cookie` | 0 |
| `src/market-data.ts` + `src/main.ts`: `console.` | 0 |
| `src/`: `?apiKey=`, `apiKey=${` | 0 |
| `src/main.ts`: reads of `#key` | 1, as the argument of `acquireDailyBars(...)` only |
| `dist/`: `l3-dummy-key-not-real`, `l1-dummy-key-not-real`, `r0-dummy-not-a-key`, `BTA_MASSIVE_KEY`, `VITE_`, `?apiKey=`, `apiKey=${`, `"Authorization":"Bearer` | 0 each |
| `dist/` broad lexical `apiKey=` (information only) | 1 file: third-party `this.apiKey=` property (LangSmith client in `@langchain/core`'s tree). Not a leak and not allowlisted: the question changed to the forbidden values and surfaces above |
| `git grep -nE "Bearer [A-Za-z0-9_]{16,}"` | 0 |
| `BTA_MASSIVE_KEY=<literal value>` in src/test/e2e/docs/specs | 0 |
| `test-results/`: dummy sentinels | 0 |
| tracked `test-results/`, `.local/`, `dist/` | 0 |

Evidence and replay serialization of credentials is covered by L3 T026/T033 (0) and Mutation D.

### T040 Scope audit

| Check | Result |
|---|---|
| `git diff cca9c9a -- src/integration src/graph/trading-graph.ts package.json package-lock.json` | empty |
| `fetch(` in `src/` | only `src/market-data.ts` |
| `interface .*Provider`, `Registry`, `Factory` in `src/` | 0 |
| tool calling, retrieval, server, proxy, cache, retry in `src/` | 0. The 2 grep hits are "no retry" comments (`src/market-data.ts`, Feature 002 `structured.ts`) |
| news acquisition | none; news comes only from `FIXTURE` or `NEUTRAL_NEWS` |
| real-time claims in `src/` and `index.html` | 0 ("live" = fetched at run time, end-of-day) |
| FR-026: tests asserting model wording or live values | 0. Live records are checked for absence of values; the stand-in echo is used only for subject/news provenance |
| AkariSP, second provider, broker, graph redesign, trading claims | none |

### T041 `docs/testing.md`

- The test table covers the L1 test file, the L3 controlled live mode and the owner-run test skip.
- New section "Data modes": the four URLs; live = end-of-day data fetched at run time; the native
  preflight applies to native only; no fixture fallback.
- Key handling: never in source, `.env*` or `VITE_*`; Chrome password-manager note.
- The `.local/replay/` artifact.
- The owner-run L4/L5 procedure, gated by P-1, including the silent-read subshell commands for zsh
  and bash (verified with a dummy value).
- A count-only real-key check: `grep -rcF -f <(printf '%s\n' "$BTA_MASSIVE_KEY") …`. The pattern
  goes through a file descriptor, so the key is never a process argument. Verified in zsh and bash
  with a dummy value (hit = 1, clean = 0).

### Final audits for IMPLEMENTATION_COMPLETE

- **Lifecycle**:
  - The `runGraph` settle → `snapshotBeforeShutdown` → `shutdown()` block is unchanged since
    Feature 004.
  - Live graph-stage cancel (T030): caller cancelled; AkariSP settled on its own; before shutdown
    `{ready,0,0}`, `settledBeforeShutdown: true`; `closed` only after.
  - The Feature 004 fixture cancel test is also green. `closed 0/0` is never used as cleanup proof.
- **Acquisition ordering**: `run()` does the native preflight only for provider = native, then
  selects data. For live: `prepareLive` (acquire → normalize → replay/digests → `buildLiveInput`).
  Only then `runGraph` → `createRuntime`. Acquisition failure or cancel → creates 0 (T027–T029).
  Mutation B (runtime before acquisition) broke exactly these assertions.
- **Evidence and replay**:
  - Every record has `dataSource.mode` (T025, T027, T031, T032).
  - A successful live record has provenance + `snapshotDigest` + `marketFactsDigest` (T026, SC-009).
    Failed and BLOCKED records carry no snapshot fields (T027, T031).
  - Live `result` holds `{present, length}` only, and the record has no prices or stand-in echo
    (T026).
  - The replay holds snapshot + `marketFacts` + matching digests and no key (T026, T033; L1 T016).
- **Mode axes**: provider and data are parsed independently. Stand-in + live runs in Chromium without
  the Prompt API (T026). Native + live is BLOCKED before any request (T031). Fixture makes 0 Massive
  requests (T025). Mutation A (silent fallback) broke T027–T029.
- **Mutations**: A, B (L3), C (L1) and D (L3) were each effective and restored with `cmp`; `MUTATION`
  residue in `src e2e test` is 0.
- **Findings**:
  - F005-001: not raised.
  - F005-002: CLOSED. It was a pre-existing harness E2E synchronization defect exposed under
    increased suite load: the fix is in `e2e/harness.spec.ts` only; the production harness is
    unchanged (hashes); assertions unchanged; no sleep, retry or skip.
  - F005-P1: OPEN external prerequisite (L4/L5 only).

### T042 Checkpoint E gate

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 (`dist/index.html` + `dist/assets/`) |
| `npm test` | 62: 61 pass, 1 skipped, 0 fail. The skip is the intended local-replay check (no `.local/replay/*.json` before owner-run L4/L5; the synthetic replay case runs) |
| `npm run test:browser` ×3 | 28/28, 28/28, 28/28 (harness included, no skip) |
| T002 protected hashes | 47/47 OK |

**IMPLEMENTATION_COMPLETE = true** (R0 + L1–L3 PASS, mutations effective, audits clean, hashes
identical).

**FEATURE_COMPLETE = false.** Not yet proven:
- native + fixture at a clean revision (T044)
- P-1 (T045)
- real Massive + stand-in, including authenticated success-response CORS (L4, T048)
- native + real Massive = SC-016 (L5, T051)
- the final audit (T052–T056)

### T043 Commit (APPROVAL REQUIRED)

Maintainer approved (2026-09-28). Local commit `9da4164cfee82c2c31501572b178d47a59d9ad3f` on
`005-browser-market-data-boundary`, no push. Excluded: `.claude/`, `.specify/*` tooling, `CLAUDE.md`,
`.local/`, `test-results/`, `dist/`, scratchpad files (R0 probe). Code paths clean afterwards
(`git status --porcelain -- index.html src test harness e2e package.json package-lock.json
vite.config.ts` empty). The T043 record itself is committed in a documentation-only follow-up
commit (no code-path change); T044 runs at that follow-up HEAD. Any code/test change before T044
requires a new clean commit.
