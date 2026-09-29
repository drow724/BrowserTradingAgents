# Verification: Feature 008 — Pixel Agents Execution Visualization

Raw command output is quoted unedited. Evidence classes follow Constitution VI.

## Checkpoint A — Baseline

### T001 Baseline (2026-09-29)

| Item | Value |
|---|---|
| Branch | `008-pixel-agents-execution-visualization` |
| HEAD | `07f8f3429dc1dd6949ba8a3b959064a8a5f97159` (merge of PR #8) |
| `git status` | `?? specs/008-pixel-agents-execution-visualization/` plus unrelated untracked tooling (`.claude/`, `.specify/*`, `CLAUDE.md`), untouched |
| `next dev` running in this checkout | none (`pgrep -fl "next dev"` empty) |
| INV-6 code-path digest, pre | `da39a3ee5e6b4b0d3255bfef95601890afd80709` (empty tracked diff) |
| INV-6 code-path digest, post | `da39a3ee5e6b4b0d3255bfef95601890afd80709` |

INV-6 code paths: `src test harness e2e app components scripts public package.json package-lock.json
next.config.ts tsconfig.json playwright.config.ts .gitignore .vercelignore`. Paths that do not yet
exist (`scripts`, `public`, `.vercelignore`) are skipped by the digest command.

`npm run typecheck` (rc 0):

```text

Generating route types...
✓ Types generated successfully
```

`npm run build` (rc 0):

```text
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/market
└ ○ /harness


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

**M1 baseline: `/` first-load JS.** These are the script tags in the prerendered
`.next/server/app/index.html`, with sizes in bytes:

```text
229156 static/chunks/0bma92pht_c97.js
183103 static/chunks/0cegfsgm6lvdz.js
112594 static/chunks/0cz1d0mv5g_q7.js
566 static/chunks/1shdvp9v19s54.js
14377 static/chunks/3fntmmi971322.js
16797 static/chunks/3l04zcqx63h3y.js
10913 static/chunks/turbopack-3s0e-ioe1_dnv.js
first-load bytes 567506
```

All `.next/static/chunks` files, in bytes:

```text
229156 0bma92pht_c97.js
183103 0cegfsgm6lvdz.js
112594 0cz1d0mv5g_q7.js
1030 1g5fdivybd0h5.js
566 1shdvp9v19s54.js
732475 2bld04on39a3a.js
215 2vk6juae3qwd_.js
589810 2vmdaykbgv6b5.js
14377 3fntmmi971322.js
16797 3l04zcqx63h3y.js
7695 45anv2i1ypzk7.js
10913 turbopack-3s0e-ioe1_dnv.js
total bytes 1898731
```

Where LangGraph and `ROLES` land today: only `2vmdaykbgv6b5.js` (589 810 bytes) contains
`Bull Researcher` and LangGraph identifiers. It is not a first-load script. It is the chunk that
`components/Boot.tsx`'s dynamic `import('../src/main.ts')` loads.

`npm test` (rc 0):

```text
ℹ tests 107
ℹ suites 0
ℹ pass 106
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
```

`npm run test:browser` (rc 0):

```text
  -  33 [chromium] › e2e/app.spec.ts:455:1 › real Yahoo L4: stand-in + live through /api/market (BTA_REAL_YAHOO=1 only)

  1 skipped
  32 passed (17.0s)
```

`npm run test:browser:dev` (rc 0):

```text
  ✓  1 [chromium-dev] › e2e/app.spec.ts:154:1 › @dev stand-in + fixture under next dev (Strict Mode): one click = one runtime, one graph run (560ms)

  1 passed (3.1s)
```

### T002 Protected hashes

The protected set is `specs/001-*` … `specs/007-*` plus the INV-2 files: 96 files. Command:
`git ls-files specs/001-* … specs/007-* src/main.ts src/graph src/integration src/market-bundle.ts
src/server app/api harness test/standin.ts app/harness/page.tsx components/Boot.tsx | xargs shasum -a
256`.

- **Hash of the list**: `sha256(list)` =
  `6d745a97bd9bc88f5d9a625a9e62501c2d88583bf69240905a0a92eba6f95f1d`.
- **`runGraph` section**: `awk '/^async function runGraph/,0' src/main.ts | shasum -a 256` =
  `922db7527716b5f318776e6aea9fdc4c076c3385b65add03089cc72b89f38ec8`, which matches expected.
- **Other hashes**:

  | File | SHA-256 |
  |---|---|
  | `src/main.ts` (whole file) | `bd34bf98e1e5d41fb7ee2227edf879e24ed905ebd05b98e0e90ab1a55032d4bf` |
  | `package.json` | `fd7f8ad8e781e550cebb356ea236bf4e2b0caf979ea9f2ab31f0731b6c99892f` |
  | `package-lock.json` | `2d6fb2befcfe23abcb01258a0d401fad3338c9b1657a54423a80932ea20b8718` |

- **AkariSP**: `akarisp` `0.1.0-alpha.2` (`package.json`), unchanged.

<details><summary>96 protected file hashes</summary>

```text
d010f87af817b9aa4a96a01d46b475cf9329ea6ca0d0be8b5ee47ad42d205b04  app/api/market/route.ts
1d945190f06f2fab75330f945b0ab7257e6d983a448cdbbd4fffdf37c63ca954  app/harness/page.tsx
1f1e9896186eab6a53a95790d12135b55b537b431fd9853891623696ebc05212  components/Boot.tsx
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
5dc4c1f84ee2c8bf3159991ba5aa9b6ba46576a1623288baa0107a65f9104d0b  specs/005-browser-market-data-boundary/checklists/requirements.md
111326ce2d54c4f8ff6b01e8509d937a4f9219cf4d576e4ad39c72833cb7fc8a  specs/005-browser-market-data-boundary/contracts/evidence.md
fea514154e79fd26c1e44c4dc9404e1d0d7a2a1a36cca1b723966f63f698f7ba  specs/005-browser-market-data-boundary/contracts/market-data.md
474e1face27980d255fc0de5f3febb50c484ddb4eb17443258a0ff03c790e8af  specs/005-browser-market-data-boundary/data-model.md
cc24472c650775c14cd6da76735c34acdf1f4f541ec713d2856af2d56f2c34c8  specs/005-browser-market-data-boundary/evidence/real-browser-fixture-2026-09-28-0543a69.json
2a89012e7cdc2fd92608e96f4c2d5e49645f798cfb01136d3e2fa3d255b879a7  specs/005-browser-market-data-boundary/plan.md
07acd6b3a3879b85a0f789fc286ec95ab99300a4ec743d124d069676fe94f661  specs/005-browser-market-data-boundary/quickstart.md
fd18720dfcdcd5494839b8a77eda442570eacdd58eb6d6fb21721c50ceee132f  specs/005-browser-market-data-boundary/research.md
d75a8feb138114f2b5517072bfd1f726ebb082f4ea46bc1b030dede066b680c5  specs/005-browser-market-data-boundary/spec.md
953a34c8253cff65b014024bc8f42884b88d4dc81a01667453fdddf45c10e3f5  specs/005-browser-market-data-boundary/tasks.md
083f0d708b5d186181fa3934f5bbf2482c3909960e9bccda20aeb6667d23bff8  specs/005-browser-market-data-boundary/verification.md
26c7ae2fe4ef393215308d74ed4b808bc28d0ae3d70d5f2d6c155b5c17df29b3  specs/006-nextjs-application-shell/checklists/requirements.md
7066560ea331851ddba9f71b1a6ea08464e58d9db301e42cdc3cfb0d3d3e466e  specs/006-nextjs-application-shell/contracts/evidence-equivalence.md
b5933d42b5c0962f636eb9d5bd1d2ed925eddc0ac8dcc6425ce974bed37990e7  specs/006-nextjs-application-shell/contracts/shell-boundary.md
520c64684cf217ec5f7b39c476b7e6c25190ad70beea215e35f08fa399b23f4d  specs/006-nextjs-application-shell/evidence/baseline-vite-harness-standin-2026-09-29-c64021e.json
dc526ff2de7d1a7d3d08f25f35643208ce63f6afcd74556a374b4382280ae22b  specs/006-nextjs-application-shell/evidence/baseline-vite-standin-fixture-2026-09-29-c64021e.json
2ae7155bcb2d98eda144e023a05bf5b4cee1a15a3ab8361d7a5f86764dd3762d  specs/006-nextjs-application-shell/evidence/next-harness-standin-2026-09-29-c64021e-dirty.json
5d7b2d3923f02ff041a0f89c89e26e602545baf7c5e542a3128e6006a89a8e4b  specs/006-nextjs-application-shell/evidence/next-standin-fixture-2026-09-29-c64021e-dirty.json
51afc3035aface8d6491be9d1889ec4bac94fac47a4bf40ec06097a7e6f38a2f  specs/006-nextjs-application-shell/evidence/real-browser-next-fixture-2026-09-29-a303192.json
1eeb468197ba564b959dd5655017dc86f286a06b282bc4ec92cf89714c202520  specs/006-nextjs-application-shell/evidence/real-browser-next-fixture-pre-retirement-2026-09-29-5eb4fc0.json
6b21e4a7ee7b1a69f2e2ea36d5331e6876c78b1127675b75c9a9b5a4f404d122  specs/006-nextjs-application-shell/plan.md
4fb25384c5ab08d9c08419438a48f90c848942cd619431ef131efefbf4f9f58f  specs/006-nextjs-application-shell/quickstart.md
f6c20a2191c6fca3b4f2bd66a69e94af7c80a2dba3c93dcc5aca6deeacf5a462  specs/006-nextjs-application-shell/research.md
707336b46e78dca153b29c362db86d48d6d359069603daf86c12a3de2d8970ff  specs/006-nextjs-application-shell/spec.md
9563e16f3eb52eff5191db4a0e7a53a06b76e2b22dddf7bd50ad540feddb1b16  specs/006-nextjs-application-shell/tasks.md
06d61ee7b0ff419ed6d96c13efadee85f04650ebe3bbd93c93a6add265acd8fe  specs/006-nextjs-application-shell/verification.md
87437399a058193fec1ad874e3c48ad3697d57e44060a4ad87103cf2fd29fe7e  specs/007-upstream-server-market-data-boundary/checklists/requirements.md
850fd2e4807cf5d7988ef1ef37cfd0e9feb828d77dd8b0f00138cec13fc3481c  specs/007-upstream-server-market-data-boundary/contracts/market-data-api.md
02a1f137159dfcd72f9d2f2ce4e3c3b53e8efdbae296a08863dec7cf8daa8ac2  specs/007-upstream-server-market-data-boundary/contracts/market-data-errors.md
d50de2c84ca784e1fbae8c2a290fe632131cb2a7354682d8bf439ef044fc995b  specs/007-upstream-server-market-data-boundary/data-model.md
cb65aca976de579bdce98fe254db4c2d08caa0081d863bc14199dcf820d4d9b7  specs/007-upstream-server-market-data-boundary/evidence/controlled-live-standin-2026-09-29-f4d976c-dirty.json
09df8daba9a33dcaeca7cbf76bc0480bf07ac827013a9735d60a00fc50574281  specs/007-upstream-server-market-data-boundary/evidence/real-browser-next-fixture-2026-09-29-4b4925f.json
0b046cf2868bcb33ffc1af45dd7f5f387b6fe8a24eb1fb05b82c0139b1a13d6b  specs/007-upstream-server-market-data-boundary/evidence/real-yahoo-native-2026-09-29-4b4925f.json
8ff6e53b12fc73b796fc520f5168cc5539fa43d8ab0aaa4f979b7926838b67e4  specs/007-upstream-server-market-data-boundary/evidence/real-yahoo-standin-2026-09-29-4b4925f.json
e2f89605f46152e13f4542acec9799e9f3516018c0918a1cdfef2a7584f483c0  specs/007-upstream-server-market-data-boundary/plan.md
01b1717b9571eeda4da4238b318eb59b2b1f5b91d090ba012a554fdde3f95bd7  specs/007-upstream-server-market-data-boundary/quickstart.md
d1f60f90ad13da9bb341872ad5b7f1529d3fe75f94390668cc9c6141d3dc8fc9  specs/007-upstream-server-market-data-boundary/research.md
bc928c4433764df3052cf7b69d8214773c0f0e4edfe56645cd4764d884b85adb  specs/007-upstream-server-market-data-boundary/spec.md
c8b6bb6cf40b6565a756b1bab798b9439c121a2f1f83dc09d67519e31a88c742  specs/007-upstream-server-market-data-boundary/tasks.md
1d22b1e9c682dbfbf211952264d574e8e120355f92f9c06b2bc9da8222917e42  specs/007-upstream-server-market-data-boundary/verification.md
e7a514d82cc55a24fa3d6cf73003bd5b499c689d7cd31c6ed1a5dd41d5bc4836  src/graph/trading-fixture.ts
69f3df1912f4c677145e3933328939510024f5fba258fb1be9b9ab9d9515598f  src/graph/trading-graph.ts
c243b34ab613a1fc53e3cd577dc72f80b04b9b6b37c5e448499368247509ad35  src/integration/akari-chat-model.ts
209ff6bb3ca3ac68aaee053a2f532b68e4247cdfeee0f6fe8243483566b0e013  src/integration/structured.ts
bd34bf98e1e5d41fb7ee2227edf879e24ed905ebd05b98e0e90ab1a55032d4bf  src/main.ts
916e0a475b4c6fd7528cb954457c4a163d74f976919549432282ede9305c5cb4  src/market-bundle.ts
bd729c100b1c62b883b640e13978e463db267c5818ba0487a1d45436afd2e2c9  src/server/market-provider.ts
ba2beb00c405dcee61e0671f2aa9171b2e8d10203a8ab7515f887f7ae05a46ae  test/standin.ts
```

</details>

## Checkpoint B — View model, offline

### Files

| File | Content |
|---|---|
| `src/view/execution-events.ts` | `ExecutionEvent`; record-level `DomFact`s; `mapFacts` (status and node transitions from record text, runtime only on change, run-ended from the final record); `snapshotFacts` (mount snapshot → prefix) |
| `src/view/view-state.ts` | the pure `reduce` and `initialViewState` (data-model rules, including M9: still-working at a failed or cancelled run → `cancelled`); `roleText` and `runText` for the text panel |
| `src/view/pixel-adapter.ts` | local declarations of the pinned message subset; `ROLE_IDENTITY`; `startSequence`; `messagesFor`. The seats are placeholders until T016 |
| `test/fixtures/execution-traces/*.json` | 12 hand-written traces; the legend is in each file |
| `test/execution-view.test.ts` | 24 L1 tests |

### Notes

- **Reading `upstream core/src/messages.ts`**:
  - It was read once through `gh api` at SHA `3537e140` to declare the adapter's local message
    types (`settingsLoaded` fields and the agent message fields).
  - This was source reading only: nothing was installed or downloaded, and nothing was copied
    except field names.
- **Mutation check of the traces**:
  - The M9 rule was temporarily replaced by "still-working → `failed`".
  - 3 traces failed (`failed-with-sibling-working`, `graph-cancel-analysts`,
    `late-event-after-cancel`).
  - After the restore, 24/24 passed.
- **Expected-trace format**: the `expected` entries are a compact hand-written projection of
  `ViewState` (run, stage, 8 role codes, runtime, anomalies), as described in each file's legend.

### T009 — `ROLES` import weight (M1, part 1)

Top-level statements of `src/graph/trading-graph.ts` (`grep -nE '^[a-zA-Z]'`):

```text
7:import { Annotation, END, START, StateGraph, type LangGraphRunnableConfig } from '@langchain/langgraph/web';
8:import { HumanMessage } from '@langchain/core/messages';
9:import type { AkariChatModel } from '../integration/akari-chat-model.ts';
10:import type { TradingFixture } from './trading-fixture.ts';
12:const State = Annotation.Root({
23:export type TradingGraphState = typeof State.State;
25:type OutputKey = Exclude<keyof TradingGraphState, 'input'>;
26:type FixtureKey = 'subject' | 'marketFacts' | 'newsFacts';
27:type ReadKey = FixtureKey | OutputKey;
29:const LABELS: Record<ReadKey, string> = {
38:export const ROLES = [
60:type Role = (typeof ROLES)[number];
61:export type NodeName = Role['node'];
62:export type NodeEvent = { node: NodeName; event: 'start' | 'done' | 'error'; seq: number };
64:const valueOf = (state: TradingGraphState, key: ReadKey) =>
67:const promptFor = (role: Role, state: TradingGraphState) =>
71:export function buildTradingGraph(model: AkariChatModel, onNode?: (e: NodeEvent) => void) {
```

- **Module load**: imports (two value imports: `@langchain/langgraph/web` and
  `@langchain/core/messages`, plus two type-only imports), `Annotation.Root(…)`, `LABELS`, `ROLES`,
  and two arrow-function constants. No graph is built or compiled at module load.
  `buildTradingGraph` is only declared (line 71).
- **Imports and side effects**:
  - no import of `akarisp` or of the bridge value (`AkariChatModel` is `import type`)
  - no import back from `src/view/*`, so there is no cycle
  - no top-level side effect beyond object construction
- **L1 test**: the `src/view/*` modules import neither `akarisp` nor `../main` nor
  `../integration`, and never call `buildTradingGraph`. `ROLE_IDENTITY` has 8 entries.
- **Next**: prerender and chunk evidence at T013.

### T010 — Checkpoint B gate

```text
npm run typecheck: rc 0
Generating route types...
✓ Types generated successfully
npm run build: rc 0
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/market
└ ○ /harness
npm test: rc 0
ℹ tests 131
ℹ pass 130
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
```

- **Test counts**:

  | Count | Tests |
  |---|---|
  | Baseline | 107 |
  | New | 24 (`test/execution-view.test.ts`) |
  | Total | 131: 130 pass, 1 skip (the existing local-replay skip), 0 fail |

- **Protected set**: 96/96 unchanged.
- **Hashes**:
  - `runGraph` = `922db752…`, unchanged
  - `package.json` `fd7f8ad8…` and `package-lock.json` `2d6fb2be…`, unchanged
- **INV-6 tracked diff digest**: `da39a3ee…`. Only new untracked files were added.
- **Changes**: dependency 0, AkariSP 0.
- **Network**: no Pixel Agents package or artifact was fetched.

State: **VIEW_MODEL_DEFINED**.

## Checkpoint C-text — Text observability

### T011 `components/ExecutionView.tsx`, and T012 `app/page.tsx`

**`app/page.tsx`** — the only edit: `import ExecutionView …` and `<ExecutionView />`, placed after the
existing status table. Every existing id is kept (`git diff --stat`: `app/page.tsx | 2 ++`).

**`ExecutionView`** (`'use client'`), in one effect:
- **Off switch**: `?viz=off` means no observer and no section.
- **Missing elements**: if any of `#status`, `#evidence`, `#runtime`, `#mode` or the 8 `#node-*`
  elements is missing, the view shows "status unavailable" and does not observe (M8).
- **Mount**: builds a snapshot from the current DOM (`snapshotFacts`), then starts a read-only
  `MutationObserver`:
  - `childList` on `#status`, `#mode` and each `#node-*`
  - `attributes` (`data-state`, `data-active`, `data-queued`) on `#runtime`
- **Transitions**: read from each record's `addedNodes[0]` Text `data` (H1). `#runtime` is read as its
  latest value, and `data-state` on `#status` is not used.
- **Errors**: caught and logged once. The view keeps the last good text and never rethrows (FR-019).
- **Test visibility**: `data-observers` and `data-anomalies` on the section.
- **Timers**: none (no timer and no rAF).
- **Cleanup**: disconnects the observer.

**Deviation from the contract, now recorded in it**: `#evidence` is read at `done:`, not observed.
`#mode` is observed only to refresh the mode line.

### T013 — Checkpoint C-text gate

**M1, part 2: the static `ROLES` import moved LangGraph into the first-load JS.** The allowed
fallback was applied: the view modules are imported inside the effect, as `Boot` does. No graph file
was moved, and `ROLES` was not extracted. `/` first-load JS (script tags in the prerendered
`index.html`):

| Build | First-load bytes | Where LangGraph and `ROLES` are |
|---|---|---|
| T001 baseline | 567 506 | lazy chunk (`2vmdaykbgv6b5.js`, 589 810), loaded by `Boot`'s dynamic import |
| static `import { ROLES }` in `ExecutionView` | **1 880 777** (+1 313 271) | LangGraph moved into first-load chunks (`03dl5gx741zfe.js` 730 471, `3u18aic0xh551.js` 576 939 now first-load) |
| **dynamic import in `useEffect` (kept)** | **571 295** (+3 789) | lazy chunk `3u18aic0xh551.js` (576 939), shared with `src/main.ts`; `ExecutionView` itself is the 4 355-byte first-load chunk `12-00znzvhlcr.js` |

Static-import first-load list:

```text
730471 static/chunks/03dl5gx741zfe.js
229156 static/chunks/0bma92pht_c97.js
183103 static/chunks/0cegfsgm6lvdz.js
112594 static/chunks/0cz1d0mv5g_q7.js
6427 static/chunks/1o3x8ujz97_yx.js
14377 static/chunks/3fntmmi971322.js
16797 static/chunks/3l04zcqx63h3y.js
576939 static/chunks/3u18aic0xh551.js
10913 static/chunks/turbopack-3s0e-ioe1_dnv.js
```

Kept (dynamic import) first-load list:

```text
229156 static/chunks/0bma92pht_c97.js
183103 static/chunks/0cegfsgm6lvdz.js
112594 static/chunks/0cz1d0mv5g_q7.js
4355 static/chunks/12-00znzvhlcr.js
14377 static/chunks/3fntmmi971322.js
16797 static/chunks/3l04zcqx63h3y.js
10913 static/chunks/turbopack-3s0e-ioe1_dnv.js
```

Prerender: `next build` rc 0; `/` is still `○ (Static)`:

```text
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/market
└ ○ /harness
```

Command results (post-change):

```text
npm run typecheck: rc 0
npm run build: rc 0
npm test: rc 0
ℹ tests 131
ℹ pass 130
ℹ fail 0
ℹ skipped 1
npm run test:browser: rc 0 (existing tests unchanged)

  1 skipped
  32 passed (16.2s)
npm run test:browser:dev: rc 0
  ✓  1 [chromium-dev] › e2e/app.spec.ts:154:1 › @dev stand-in + fixture under next dev (Strict Mode): one click = one runtime, one graph run (771ms)

  1 passed (3.5s)
```

**Stand-in smoke** (`next start` on port 5191, ad-hoc Playwright script in the scratchpad, not
committed; `BROWSER_AUTOMATED`). Raw output:

```text
{
 "label": "stand-in fixture",
 "before": {
  "run": "idle",
  "observers": "1"
 },
 "after": {
  "run": "completed",
  "roles": [
   "✓ Market Analyst: completed",
   "✓ News Analyst: completed",
   "✓ Bull Researcher: completed",
   "✓ Bear Researcher: completed",
   "✓ Research Manager: completed",
   "✓ Trader: completed",
   "✓ Risk Reviewer: completed",
   "✓ Final Decision: completed"
  ],
  "runtime": "state closed · active 0 · queued 0",
  "mode": "provider: standin · data: fixture",
  "observers": "1",
  "anomalies": "0"
 },
 "transitions": [
  "running:wwwwwwww",
  "running:ccwwwwww",
  "running:cccwwwww",
  "running:ccccwwww",
  "running:cccccwww",
  "running:ccccccww",
  "running:cccccccw",
  "completed:cccccccc"
 ],
 "evidence": {
  "outcome": "success",
  "evidenceClass": "BROWSER_AUTOMATED",
  "counts": {
   "graphRuns": 1,
   "nodeExecutions": 8,
   "logicalRequests": 8,
   "fallbackRequests": 0,
   "providerInvocations": "NOT EXPOSED"
  },
  "lifecycle": {
   "settledBeforeShutdown": true,
   "snapshotBeforeShutdown": {
    "state": "ready",
    "active": 0,
    "queued": 0
   },
   "snapshotAfterShutdown": {
    "state": "closed",
    "active": 0,
    "queued": 0
   }
  }
 }
}
{
 "label": "native in Playwright Chromium (BLOCKED)",
 "before": {
  "run": "idle",
  "observers": "1"
 },
 "after": {
  "run": "not run (blocked)",
  "roles": [
   "– Market Analyst: not run",
   "– News Analyst: not run",
   "– Bull Researcher: not run",
   "– Bear Researcher: not run",
   "– Research Manager: not run",
   "– Trader: not run",
   "– Risk Reviewer: not run",
   "– Final Decision: not run"
  ],
  "runtime": "—",
  "mode": "provider: native · data: fixture",
  "observers": "1",
  "anomalies": "0"
 },
 "transitions": [
  "not-run:nnnnnnnn"
 ],
 "evidence": {
  "outcome": "not-run",
  "evidenceClass": "BLOCKED"
 }
}
viz=off: execution-view present = false
off-origin requests: 0
```

Observations:

- **Fixture success**:
  - The panel ends with the run `completed`, 8/8 roles `completed`, runtime
    `state closed · active 0 · queued 0`, mode `provider: standin · data: fixture` and anomalies 0.
  - The evidence shows `graphRuns` 1, 8 logical requests, and
    `{ready,0,0}` → `settledBeforeShutdown` true → `{closed,0,0}`.
- **Fast stand-in renders**: React batches renders, so a fast stand-in run does not paint every
  `working` frame. The rendered log above skips the analysts' `working`. The reducer still receives
  every transition: 0 anomalies, and the L1 traces cover the sequences.
  - For T022 (SC-001) in Checkpoint D, the working period must be made observable by holding the
    stand-in (`__standin.hold()`), not by assuming every frame is painted.
  - Recorded here as an input to D, not a defect.
- **BLOCKED preflight (H1)**:
  - `src/main.ts` writes `running…` and `done: …` in the same task.
  - The view ends with the run `not run (blocked)`, 8/8 `not run` and anomalies 0.
  - If `run-started` had been lost, `run-ended` would have arrived in the idle state as an anomaly
    and the run would have stayed idle. The record-text reading therefore captured both transitions.
- **`?viz=off`**: no `#execution-view` in the DOM.
- **Network**: off-origin requests 0.

**Strict Mode** (`next dev` on port 5192, ad-hoc script):

```text
{"mount":{"observers":"1","mo":{"created":3,"disconnected":0}},"afterRun":{"observers":"1","run":"completed"},"counts":{"graphRuns":1,"nodeExecutions":8,"logicalRequests":8,"fallbackRequests":0,"providerInvocations":"NOT EXPOSED"}}
```

- The view holds exactly 1 observer (`data-observers` 1) before and after a run.
- One click gives `graphRuns` 1 and 8 logical requests.
- The page-wide `MutationObserver` count (3 created) includes observers that are not the view's (Next
  dev tooling). The view-level count is `data-observers`. Checkpoint D T029 adds per-view
  instrumentation.
- Strict Mode's first effect is cleaned up before its dynamic import resolves, so it never creates
  an observer.
- Mounting the view causes 0 graph runs: every smoke page showed `#status` idle and the run `idle`
  until `#run` was clicked.

**Protection**:
- **Protected set**: 96/96 unchanged.
- **Hashes**:
  - `runGraph` `922db752…`, unchanged
  - `src/main.ts` `bd34bf98…`, unchanged
  - `package.json` `fd7f8ad8…` and `package-lock.json` `2d6fb2be…`, unchanged
- **INV-2**: `git diff --stat` shows only `app/page.tsx` (+2), and no INV-2 file.
- **INV-6**: after typecheck, build, test, test:browser and test:browser:dev, the tracked diff is
  still only the intended `app/page.tsx` change. `tsconfig.json`, `next-env.d.ts` (ignored) and the
  others are unchanged.
- **Pixel Agents**: not installed (`node_modules/pixel-agents` absent). No upstream artifact was
  fetched. No iframe code exists.
- **Changes**: dependency 0, AkariSP 0.

State: **TEXT_VIEW_INTEGRATED**, which is the `IMPLEMENTATION_PARTIAL` floor. This is not Feature
completion: Pixel integration has not started. Next: **T014 (APPROVAL REQUIRED)**.

## Checkpoint C0 — Upstream consumable (T014–T018; maintainer approved 2026-09-29)

### T014 — Install and package inspection

The command was `npm install --save-dev --save-exact pixel-agents@1.4.1 --foreground-scripts
--loglevel=info`, with rc 0:

```text
added 82 packages, and audited 139 packages in 2s

44 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
npm info ok
```

**Lifecycle and install scripts**
- The registry `scripts` metadata has no `preinstall`, `install` or `postinstall`. It has `prepare:
  husky`, but npm runs `prepare` only for git or local installs, never for a registry tarball.
- The install log shows no lifecycle script execution.
- No added lockfile entry has `hasInstallScript`.
- **Nothing upstream was executed.** The CLI, the Fastify server, the VS Code extension and the
  upstream scripts were never run.

**Version and lockfile**

- **`package.json` diff**: devDependencies gets `"pixel-agents": "1.4.1"`, exact. `dependencies` is
  unchanged.
- **Lockfile entry `node_modules/pixel-agents`**:
  - version `1.4.1`
  - resolved `https://registry.npmjs.org/pixel-agents/-/pixel-agents-1.4.1.tgz`
  - integrity `sha512-HVKW54CL0sdqNpZ7M+2f1q/1Z/bleljeaybr5o+hAnfdI/8aLXk4NZT4yLLTpdW3KtgdOdzlZMClaPyXYx3wpA==`
  - `dev: true`, license `MIT`
- **Lockfile changes**:
  - **Added**: 82 entries. All are `dev: true` except `ws`, which is `devOptional: true`.
  - **Removed**: 0. **Version changes**: 0.
  - **Root**: the only new direct dependency is `pixel-agents`. The transitive additions are the
    fastify family (fastify, @fastify/cors, static, websocket, pino, ajv, ws, …), as research R1
    predicted.
- **`npm ls pixel-agents`**: `browser-trading-agents@ └── pixel-agents@1.4.1`.
- **New hashes**: `package.json` `ddc91e3a…`, `package-lock.json` `55c816be…`. The additional
  `package.json` changes are the T015 `prebuild`/`predev` lines.

**Provenance**

- **Installed `package.json`**:
  - name `pixel-agents`, version `1.4.1`
  - repository `https://github.com/pixel-agents-hq/pixel-agents`
  - no `gitHead`
- **Pin**: this matches research R1: tag `v1.4.1` = `3537e140c2094761beae748592aeb92ece8edfdd`, with
  the registry's SLSA provenance attestation.

**Package shape (matches research R1/R2)**

- **Entry points**: `main: ./dist/extension.js`, `bin: dist/cli.js`. There is no `exports`, `module`,
  `types` or `browser` field, so there is no reusable component API.
- **Files**: 193 files, under `dist/` (cli, extension, hooks, uninstall, assets, webview) plus
  LICENSE, README, CHANGELOG and icon.
- **`dist/webview/`**: 97 files:
  - `index.html`
  - `assets/index-D-OGLsbn.js` (354 096 bytes) and `assets/index-CriQp6rI.css`
  - `assets/{asset-index.json, default-layout-1.json, furniture-catalog.json}`
  - `assets/{characters (char_0–5.png), floors (9), walls (1), carpets (3), pets (2), furniture (…)}`
  - `fonts/FSPixelSansUnicode-Regular.ttf`
  - README images `office.png`, `characters.png`, `banner.png`, `Screenshot.jpg`
- **Assets**: `dist/webview/assets/` is self-contained. Only the webview directory is served;
  `dist/assets/` is not used.

**Upstream `index.html`** (unmodified source; its `crossorigin` attributes matter for the sandbox
decision):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>webview-ui</title>
    <script type="module" crossorigin src="./assets/index-D-OGLsbn.js"></script>
    <link rel="stylesheet" crossorigin href="./assets/index-CriQp6rI.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

**Font path (F008-005 resolved, differently from research)**
- The built CSS references `url(../fonts/FSPixelSansUnicode-Regular.ttf)`. The path is relative to
  `assets/`, and the file is in `dist/webview/fonts/`.
- Research read the absolute `/fonts/…` path in the webview-ui source CSS. The Vite build rewrote it
  to a relative path.
- Consequence: copying `dist/webview/**` already supplies the font. Nothing is copied to
  `public/fonts/`, and no font rule is needed in `.gitignore` or `.vercelignore`.

**Artifact hash inventory** (the authoritative source, `node_modules/pixel-agents/dist/webview`)
- **97 files**. The inventory digest is `ec6dfa08ce560a7d1aaec965eee7aa0cdb4d43c549f405bc00029f022d8235d6`,
  computed as the SHA-256 of the lines `<sha256>  <path>` sorted by path in byte order.
- **Cross-check**: the value was computed independently in shell (`find … | LC_ALL=C sort | shasum`)
  and by the copy script (`--print-inventory`), with equal results.
- **Pinned**: the value is pinned in `scripts/copy-pixel-agents.mjs`.

Key files:

```text
495ec948bf437aa00a653a6ec1c9171ab4c40512ed9ee203e8ad6038066a303b  ./assets/asset-index.json
9ece93c20765abb876e3dacfe01e0cd1801323eff41c1779be0c47369886c09a  ./assets/characters/char_0.png
f935f033726b06f73dbbe590db5a23cfb20d2d02c1329fd5d67d57a262e9b05e  ./assets/characters/char_1.png
9f63ee7be4577e1d60de3b64d198d387d1c09794bed3a608958e77c7b955575d  ./assets/characters/char_2.png
ee5ebe0847471e4834e367f8a4108e6caf2f402ed506bbfebd90c64a43a79348  ./assets/characters/char_3.png
fcf72626bbee3045d0f3e10bb87a41dab19a331d1affdfc53b483567f9c083aa  ./assets/characters/char_4.png
4b2c639a50e089a4e3b87be440ffb52b5c5c8cfd6473a386f325b25f99db7381  ./assets/characters/char_5.png
ac4a7ea4bb9ddaedead465dd2a9cd0761dc46361f19b1a609cfbf5cd3e7ff616  ./assets/default-layout-1.json
33ea475bf83a861579fa9d5f84e5e384cb90b38e186b55d146785b8d17fa16eb  ./assets/furniture-catalog.json
e5cdede0c0eb8497c1b797d92ee2b2578365666e7fa7c47380911a130ee1531f  ./assets/index-CriQp6rI.css
49234eea7aecd6a1a80344d0a75ce15e173c93522620ac90b98278177d313f8c  ./assets/index-D-OGLsbn.js
3b4e53ff037fc509b24688029948b55111a5e6089f56d669f356864b4dccd819  ./fonts/FSPixelSansUnicode-Regular.ttf
d5dfb668f842561946c9f9ab7655f73adf7dfd1ba6398cb3899dffb7e9cd768b  ./index.html
```

<details><summary>All 97 dist/webview file hashes</summary>

```text
8fe759a8ddc927458a6a6f1b8dac4158d7fe8003a3b1a9b2d00b9e045527c92d  ./Screenshot.jpg
495ec948bf437aa00a653a6ec1c9171ab4c40512ed9ee203e8ad6038066a303b  ./assets/asset-index.json
a3a2b9789dd7b6e4345fe9f6204e668aa3b0ec52ae13cbc567e9abdac708a385  ./assets/carpets/carpet_0.png
5fdc496323782dd846c0fa485b51da8827a907dc85058005905329d8d8d7b05e  ./assets/carpets/carpet_1.png
926017fb0052dd8466b88618a309889edaa5c37b83b3b4f24ea52a00d84ce72e  ./assets/carpets/carpet_2.png
9ece93c20765abb876e3dacfe01e0cd1801323eff41c1779be0c47369886c09a  ./assets/characters/char_0.png
f935f033726b06f73dbbe590db5a23cfb20d2d02c1329fd5d67d57a262e9b05e  ./assets/characters/char_1.png
9f63ee7be4577e1d60de3b64d198d387d1c09794bed3a608958e77c7b955575d  ./assets/characters/char_2.png
ee5ebe0847471e4834e367f8a4108e6caf2f402ed506bbfebd90c64a43a79348  ./assets/characters/char_3.png
fcf72626bbee3045d0f3e10bb87a41dab19a331d1affdfc53b483567f9c083aa  ./assets/characters/char_4.png
4b2c639a50e089a4e3b87be440ffb52b5c5c8cfd6473a386f325b25f99db7381  ./assets/characters/char_5.png
ac4a7ea4bb9ddaedead465dd2a9cd0761dc46361f19b1a609cfbf5cd3e7ff616  ./assets/default-layout-1.json
7ac83e6dafab1d73c2ee346880929718920123a7057b0cd9ee34dec6543eacc2  ./assets/floors/floor_0.png
6199f7135d3f5e233e0f33a925a20e348fcc17e396347799ac7573241c1416b8  ./assets/floors/floor_1.png
ac112a1f1b2bc0068649e7cfd8be47f9c794f343388fb2e4437f140eb2ed0dee  ./assets/floors/floor_2.png
8befc77b71238aa01d19cc73d5fe747831e0e85b1a986838c02df2f76cdf2690  ./assets/floors/floor_3.png
fdf610ffa4583c688ed72cc3b8c8b9496c4843b341c201ead62ba769804a9cbb  ./assets/floors/floor_4.png
b935a21804f12c18e0b0cc4db2ba873e4e39c2c6cf80c59cc9dfa01c00e497bb  ./assets/floors/floor_5.png
dc7dc8722e3a03b28385400b76079c168a5d93d50e7b06f6a40ebd1dd8f178b4  ./assets/floors/floor_6.png
aa44b7de3ced5e0bb2ef3fbd8bd27e9993a83bf8b901c37da2a97c162d7e6dad  ./assets/floors/floor_7.png
653e4534e66844d72ea78fef499c5052ed337f7c10ada4d818d21255ad27bdfe  ./assets/floors/floor_8.png
33ea475bf83a861579fa9d5f84e5e384cb90b38e186b55d146785b8d17fa16eb  ./assets/furniture-catalog.json
738129d621fabc15b100f7129b854d1fe36201dbe92c0800bb1e80cb06793284  ./assets/furniture/BIN/BIN.png
6d3c3d075e3f77bcf4bc2bbd6809bb8b747c34dcc557be881146ca0122dd7e35  ./assets/furniture/BIN/manifest.json
bd05119962080fd4cff6697fec0c3730c5a9c3def01b31ca0fa929971144322e  ./assets/furniture/BOOKSHELF/BOOKSHELF.png
f162c5c78a8e7e3357d99ac8dc9f9e5ebda30e5756474aa8891888eeb39bda7e  ./assets/furniture/BOOKSHELF/manifest.json
830dbba8ac4912858e22eed1e89d4290202113363a934389e54fffb794ad893b  ./assets/furniture/CACTUS/CACTUS.png
78e4ecb0a0ccfe4da323ca5bcb32f1b43a79967f83b573bda44c917bd01605b3  ./assets/furniture/CACTUS/manifest.json
f1ff567d71508dfdba37f2ff94ffde734940b56b3999e29b213ab6774e67b20f  ./assets/furniture/CLOCK/CLOCK.png
10a2596fda4958c436bdc7fbae18bc2bd8fe72d58e1dd7a98b5392e6a9568944  ./assets/furniture/CLOCK/manifest.json
6bed27c8de5a4ce98b3646d233803b3192cc5980c8f4caf779eb1344a87f8e0d  ./assets/furniture/COFFEE/COFFEE.png
8f671ece319b7ee5b462bc2afe7bf072538ad71f08370ebede83ae926c67ccb8  ./assets/furniture/COFFEE/manifest.json
0b0fd17c95b29e3b86da00031452166a1400a534c8adff1dc98bb4e5ce72aad3  ./assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png
acca0880e88e6ada927eddef632559ed7941ce3c5bc2d8a576f4a33dd98034cb  ./assets/furniture/COFFEE_TABLE/manifest.json
b66ba12ce7921b3ab34515c319bc72775c49351d75ad146c6b29adf46459eaa0  ./assets/furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png
854d701f00f9dec17141f266edf12868c1faa396ca88596cb1c2c9dd0fc28a27  ./assets/furniture/CUSHIONED_BENCH/manifest.json
7eba17a7c86115caba0246599988e3169dc766af7814e51c7afa566e0fe40846  ./assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png
30a021a8356125a743be8352da9756ec6d0832e232aca1ae2dd76a5e038a2208  ./assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png
ac2d90e87ce198271f50fd3e9161c4c9b8ea4befd3befdb0c5c9720256febb70  ./assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_SIDE.png
a8a1a949ca45f9b0c65ac2ff2726004ec1a3a60db842f448a6de31a1be9cd8ec  ./assets/furniture/CUSHIONED_CHAIR/manifest.json
4df9ed2b04efb98dbd901d400d65fa5a1729e4508787ad70eb93e747017220ca  ./assets/furniture/DESK/DESK_FRONT.png
b5421b3b3fc30b4a295c67c67d4a138877a1d179b532ffe25973200277107ff9  ./assets/furniture/DESK/DESK_SIDE.png
2f68f60b61f6ee5aaa40b526af7dcf8581072d936b38ae3a0a25e5caa61cf3db  ./assets/furniture/DESK/manifest.json
b27bd0cc4c73dab38eebbf6b8ed68257acb8264d23a8e87c2cf5026138842cda  ./assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png
e3af4890e8f9e140a58b3db79c1718c6bf742ae4dca21aa17b2dcf235465db91  ./assets/furniture/DOUBLE_BOOKSHELF/manifest.json
a6e9c025d0a84e960d3c84d55f18d01585eb8e079cd84f9970de08d636877de2  ./assets/furniture/HANGING_PLANT/HANGING_PLANT.png
200ca5deaef21d2b135dd8d894a4445f96ecf43d325321b904e35c0088c3aed1  ./assets/furniture/HANGING_PLANT/manifest.json
f6355392631f0004ccd49c3d9ddf4df8ef60c59ec8b23d0b3fb1d0dce6c01c2b  ./assets/furniture/LARGE_PAINTING/LARGE_PAINTING.png
906af931475def2450e40d553e2e900b2b2068f5d990b1301433e622942046bf  ./assets/furniture/LARGE_PAINTING/manifest.json
196a4f1748160cdbf69400e370b1d7d1254b49902b8c091bcabd7676934f3149  ./assets/furniture/LARGE_PLANT/LARGE_PLANT.png
3d45775a4c7930f4d53c3436d9eda4527633eb51a572c106acea1f90b4cf5184  ./assets/furniture/LARGE_PLANT/manifest.json
48f3d9aa7f571cc0ce1e5d702977987432bca292995ff67e36d47361d4b6f9a0  ./assets/furniture/PC/PC_BACK.png
a5d6f40f500f14f440cf981950630f5433521faa7578ae0f83684b9ededdc2bf  ./assets/furniture/PC/PC_FRONT_OFF.png
d00d95a9c4718f770dee1a93240be8b7dc6d2e8abab4071179dd79c2d73a9337  ./assets/furniture/PC/PC_FRONT_ON_1.png
dc083d31848be3661b4ea571ee8d8d7e5dcd34cdbcef48d4dd6c444166eb7a69  ./assets/furniture/PC/PC_FRONT_ON_2.png
773c5e0cfee45ad12669c082ff26c0041f12a6369e4622db3eab35685aeabc0f  ./assets/furniture/PC/PC_FRONT_ON_3.png
c327f64a39cc84d3a2c4e97b7165e5a07e355003d0f1a9bca27fc8f8deef9603  ./assets/furniture/PC/PC_SIDE.png
4f33a91b789e22c4e3f5aa05b53eb903581612ef3aa004330143646b8c830f82  ./assets/furniture/PC/manifest.json
b9f845e7930e685161a21ac0f1743c2906cb7cbb0bd6b79ef1e4fb5aafff98c6  ./assets/furniture/PLANT/PLANT.png
94bfbdc7ba97c86517a8b6bcefda8b23b7c10128b479eabc433ba72ba1e136f5  ./assets/furniture/PLANT/manifest.json
b0d2e82fefd1f7ebada9656260571aa3e810db55975495e72a62d9ce8a878b42  ./assets/furniture/PLANT_2/PLANT_2.png
238248bdd213f7f6a18875153ccaee50e5b7d44f916a9f310abbef516197c6ba  ./assets/furniture/PLANT_2/manifest.json
cc2889e6fe22350bbeba94d55157f5bb2a38fe40f3a85ef96429f1af88506585  ./assets/furniture/POT/POT.png
1e6106dd6e888adae7701597f565e0a9c1741d72918708b6421dafcfb7cb7d5e  ./assets/furniture/POT/manifest.json
15f370af43455d303b5ccb21429e298f7a603c3b6db10d6ed9270aa62caa71a3  ./assets/furniture/SMALL_PAINTING/SMALL_PAINTING.png
02f09ec0d22404f102f609f8aabc0ca41f3e4d9af4274206167088db95cd13f6  ./assets/furniture/SMALL_PAINTING/manifest.json
148d161726fb08dc7887e75e91f0332bf69d1aadfc649dce6fbc4b2678f5d0f0  ./assets/furniture/SMALL_PAINTING_2/SMALL_PAINTING_2.png
b023f4e593a868efb5dc98ac283e9a15d923848514849ed6e836944d6605867a  ./assets/furniture/SMALL_PAINTING_2/manifest.json
dc224670ea2c5752830143337fd8b3a080f93980287706d4efd614aaabd4882f  ./assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png
5568526f6393ad643606b0095eceee5b7674b5588d7105144adc3fb99f0a3f42  ./assets/furniture/SMALL_TABLE/SMALL_TABLE_SIDE.png
cfd626759f52304db591b28caab63832813e846a02bd974e4cee43950005e854  ./assets/furniture/SMALL_TABLE/manifest.json
62a40318fce1d3166f1ea3811ca2081b39ad3161974c6bcd2edb0bdaf9b06d08  ./assets/furniture/SOFA/SOFA_BACK.png
7e4c7e98e46d32daa2776651f6f413f68a84252b357b01d722fce6bb2a0ca52f  ./assets/furniture/SOFA/SOFA_FRONT.png
b583fa6261dbbc4c4020c0a887023d3f707a70b7e5524535d541b453b22f9e94  ./assets/furniture/SOFA/SOFA_SIDE.png
aa3615e2e2b9de9766d1936d06f630c0a4053030cef7f9f054f16cba6661b8d6  ./assets/furniture/SOFA/manifest.json
fef9638fd372f081f4c80cc52f9bcb4be8db9db194fa46f88968ec08e5463b4a  ./assets/furniture/TABLE_FRONT/TABLE_FRONT.png
d7868924b6edd92f0b6f135e254fe7c291fe1134c56f84fc3b98b2ca1bc72373  ./assets/furniture/TABLE_FRONT/manifest.json
42fb63a8d8041f602c6cd0e7491be3ea95c3f4699b6a5ba6e47851ba8a473059  ./assets/furniture/WHITEBOARD/WHITEBOARD.png
70c1924a08f76f042a8bcaf0d56e7fd3724e717ea207f5ab31e0ec9c3ea1dd67  ./assets/furniture/WHITEBOARD/manifest.json
b2a889a7e67dd1bd59ce1035daffeda8c0b34e696f07658ee0bc8ae514e1af49  ./assets/furniture/WOODEN_BENCH/WOODEN_BENCH.png
cc37d68a0cd451d4329b8efc43e6b01ac157df69f928751b2eca27c96c07407a  ./assets/furniture/WOODEN_BENCH/manifest.json
244fd28f4650e469d836f4287613e834805d3a00b7e14f68ae8415dd30411d5c  ./assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_BACK.png
fb4c4bf7def68c98e4eedffe1d9ee0cbeaa054fc5bc4aa6785f37cc83b1cd44d  ./assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png
b57e3fd470a60e9f9800e9cdfe629b2a187cc0f936ed81314522a17fc7bb2198  ./assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_SIDE.png
ba184e498776b354b5642f579499c1a60a0b4e5a4fdbe452009d4cca2cc5cc9b  ./assets/furniture/WOODEN_CHAIR/manifest.json
e5cdede0c0eb8497c1b797d92ee2b2578365666e7fa7c47380911a130ee1531f  ./assets/index-CriQp6rI.css
49234eea7aecd6a1a80344d0a75ce15e173c93522620ac90b98278177d313f8c  ./assets/index-D-OGLsbn.js
ccd0ba576f92542087da3a70ace663f21d65fc0969bae7dc5a8d69ec353c07ce  ./assets/pets/claudio/manifest.json
174acbe0a597830bd311c241eed3ac8ad70bd46a55a78b6d9a77ae1728f23185  ./assets/pets/claudio/pet.png
dea53fd2b975ba95ccf3eab6cf147df935d22226b7657afe9eb6373ed39c6f67  ./assets/pets/gitcat/manifest.json
cb4163bc000da739d988dda58402b4a27cea970ae772d0b107bef515af092a68  ./assets/pets/gitcat/pet.png
f2afc6dacc44986a388695a720839ed00da03e9b308d6c727f5292740a62adfa  ./assets/walls/wall_0.png
9d37b623ba7e0ebf7e117c374998c48a23f3ed1fad1fe135b9f185ab3f870bb0  ./banner.png
15064af181fc9a077cfa9fb94de36821be5d3a0c9825c7a584ef5f15ded0c999  ./characters.png
3b4e53ff037fc509b24688029948b55111a5e6089f56d669f356864b4dccd819  ./fonts/FSPixelSansUnicode-Regular.ttf
d5dfb668f842561946c9f9ab7655f73adf7dfd1ba6398cb3899dffb7e9cd768b  ./index.html
30157ffd62cf124925edfd08643f91177055046d9e3c14485e4d6331b035a489  ./office.png
```

</details>

**Parent, top, opener and `document.domain` audit** of `assets/index-D-OGLsbn.js`:

| Pattern | Hits | Executable access to another frame? |
|---|---|---|
| `parent.` | 0 | — |
| `top.` | 0 | — |
| `window.parent` / `window.top` / `frameElement` / `document.domain` | 0 | — |
| `parent` / `top` tokens | 7 / 27 | no: React fiber cache `.parent` (`i.parent===l`), `getBoundingClientRect().top` arithmetic, CSS-in-JS `top:` |
| `opener` | 5 | no: `rel:"noopener noreferrer"` on 5 user-clicked links (changelog, GitHub, Discord, claude.com) |
| `location.href` | 1 | no: React DOM `getActiveElementDeep` walks **child** iframes of its own document |
| `localStorage` / `sessionStorage` / `indexedDB` | 0 | — |
| `acquireVsCodeApi` | 2 | the runtime detection and `PostMessageTransport`, as in research R2 |

Verdict: the upstream bundle has **no code path that reaches the parent DOM**.

**External URL and network audit**

- **Static URLs** in the built JS/CSS:
  - XML namespace constants (`w3.org`)
  - `react.dev/errors`
  - `tailwindcss.com` (a CSS comment)
  - `claude.com`, `discord.gg` and `github.com` link targets, only opened by a user click with
    `target=_blank`
- **Network APIs**:
  - `fetch(`: 1, the Vite modulepreload polyfill; `index.html` has no `modulepreload` link
  - `new WebSocket`: 1, the browser-runtime transport, unused when the shim is present
  - `XMLHttpRequest`, `sendBeacon`, `EventSource`, `importScripts`, `window.open`: 0
- **Measured in the spike**: 0 off-origin requests in every mode, and no telemetry or CDN.
- **Same-origin 404**: `index.html` references `/vite.svg` as a favicon. It is harmless and nothing
  goes off-site.

### T015 — Serving setup

- **`scripts/copy-pixel-agents.mjs`**:
  - **Guards**:
    - `VERCEL` set → prints one line and writes nothing (D4).
    - Otherwise it verifies the source against `PINNED_INVENTORY` and refuses a mismatch.
    - It refuses if upstream ships a file named `bta-host-shim.js`.
  - **Stale output**: it removes every entry in `public/pixel-agents/` **except the shim**.
  - **Copy**: it copies `dist/webview/**` and inserts exactly one
    `<script src="./bta-host-shim.js"></script>` line before the module script.
  - **Verification**: every other file must be byte-identical, and `index.html` must equal the source
    plus that single line. Otherwise it exits non-zero.
- **Results**:
  - run output: `97 files → public/pixel-agents (inventory ec6dfa08…); index.html +1 shim line`
  - `diff` source vs copy: `7a8 > <script src="./bta-host-shim.js"></script>`
  - `cmp` of the copied JS against the source: identical
  - `VERCEL=1` run: `nothing copied`
- **`public/pixel-agents/bta-host-shim.js`** (ours, committed): `acquireVsCodeApi()` → `{ postMessage:
  m => parent.postMessage({source:'pixel-agents', message:m}, location.origin), getState, setState }`.
  In a sandboxed frame, `location.origin` is still the URL's origin (measured below), so the shim
  names the parent page as the only receiver in both modes, never `'*'`.
- **Ignore rules**: `.gitignore` and `.vercelignore` get `public/pixel-agents/*` and
  `!public/pixel-agents/bta-host-shim.js`. There is no font rule (see F008-005).
  - `git check-ignore`: `public/pixel-agents/index.html` and `…/char_0.png` are ignored; the shim is
    not.
  - `git status` shows `public/` only because of the shim. Every generated file is `!!` (ignored).
  - `.vercelignore` also covers a Vercel CLI upload of a local tree that holds generated files.
- **`package.json`**: `"prebuild"` and `"predev"` run the copy. The `npm run build` log shows
  `copy-pixel-agents: 97 files …`.
- **`playwright.config.ts`**: the webServer command is now `node scripts/copy-pixel-agents.mjs && …`
  for both `next build && next start` and `next dev` (H2). No Pixel assertion was added to the
  canonical suites.

### T016 — `src/view/pixel-assets.ts`, and the seats in `src/view/pixel-adapter.ts`

- **Decoder**: browser-only. It uses `createImageBitmap` (`premultiplyAlpha: 'none'`,
  `colorSpaceConversion: 'none'`), `OffscreenCanvas` and `getImageData`, and converts to the hex
  grids of `core/src/messages.ts`.
- **Format source**: the geometry (character 16×32 × 7 frames × 3 directions, wall 16×32 × 16, floor
  16) and the alpha threshold (2) were read from `core/src/assets/{constants,colorUtils,pngDecoder}.ts`
  @ `3537e140` through `gh api`. The format was re-implemented; no code was copied.
- **Messages loaded**: characters, floors, walls, furniture catalog and sprites, and the default
  layout. Carpets and pets are not sent (optional).
- **Seats**: the upstream webview derives them from chair furniture, with seat id = chair uid
  (`webview-ui/src/office/layout/layoutSerializer.ts` `layoutToSeats`). `default-layout-1.json` has 10
  chair items. Eight were fixed per role:

  | Roles | Chairs |
  |---|---|
  | Market, News, Bull, Bear | the four wooden chairs |
  | Manager, Trader | the two cushioned benches |
  | Risk | the sofa front |
  | Final | the sofa back |

  The spike screenshot confirms 8 distinct seats.

### T017 — Iframe spike

The spike was run as throwaway scratchpad scripts, never committed. It used the production build
(`next start`) and a route-fulfilled host page. The real `startSequence` and `messagesFor` built the
messages, and the browser-decoded assets were sent. Screenshots stay local, because they show
upstream sprites (D4).

| Mode | Boot | Parent DOM reachable from the frame | Received from the frame | Off-origin | Console errors |
|---|---|---|---|---|---|
| **A** same-origin, no sandbox | yes: 1 canvas, 8 labeled characters, Market Analyst "working (graph)" | **yes** (`parent.document.getElementById('run')` succeeds) | `webviewReady`, `saveAgentSeats`, `launchAgent` (origin = app) | 0 | 0 |
| **B** `sandbox="allow-scripts"` | **no**: the JS/CSS are blocked by CORS from origin `null` (the upstream `index.html` uses `crossorigin` on both tags) | — | none | 0 | 2 CORS errors |
| **B2** B plus `Access-Control-Allow-Origin: *` on `/pixel-agents/*` responses (injected by the test route only) | **yes**: same rendering as A | **no**: `SecurityError`; `self.origin` = `"null"` | `webviewReady`, `saveAgentSeats`, `launchAgent` (origin `"null"`) | 0 | 0 |

- **Final recheck**: B2 was re-run after the shim was simplified to post to `location.origin`. It
  received the same three messages, with 0 failures and 0 errors.
- **Webview → host inventory (for Checkpoint D T026)**:

  | Message | Trigger |
  |---|---|
  | `webviewReady` | boot |
  | `saveAgentSeats` | sent by itself after `existingAgents` |
  | `launchAgent` | "+ Agent" click |
  | none | Settings click (it opens a local modal) |

  The "Layout" click could not be completed while the Settings modal was open. None of these
  messages was acted on: the host only answered `webviewReady`.
- **Cosmetic observations** (canvas, not the canonical surface):
  - Roles in our `waiting` state are labeled "Idle" by the webview.
  - An "Updated to v1.4!" toast shows despite `lastSeenVersion: '1.4.1'`.
  - Both are expected from F008-002 (the canvas vocabulary). The text panel stays canonical.

### Findings from C0

- **F008-005 — resolved.**
  - The built CSS uses a relative font URL and ships the font.
  - No `public/fonts` copy and no font ignore rule are needed.
- **F008-007 — sandbox requires a serving header (NEW).**
  - Evidence: B fails and B2 works (table above).
  - Cause: the upstream `index.html` loads its module script and stylesheet with `crossorigin`. From
    an opaque-origin frame, these are CORS requests that need `Access-Control-Allow-Origin`.
  - No upstream file needs a change.
  - Minimal adaptation, which touches no upstream code: serve `/pixel-agents/:path*` with
    `Access-Control-Allow-Origin: *` through `next.config.ts` `headers()`. These are public static
    files already served to the same page, so the header exposes nothing new.
  - Plain same-origin mode A is **not** chosen: the frame could reach `parent.document`.
  - Recommendation: **adopt B (`sandbox="allow-scripts"`) + the header** as the canonical isolation
    mode. This touches a file outside the planned C-pixel list (`next.config.ts`), so it is
    presented for maintainer confirmation before T019.
- **F008-008 — canvas vocabulary cosmetics (NEW, LOW).**
  - Non-working roles read "Idle" on the canvas.
  - The webview shows a version toast.
  - Both are left as they are, because hiding them would need upstream changes. The text panel is
    canonical.
- **F008-L1 — OPEN.** C0 used the sprites locally only. No public-redistribution claim is made; D4
  `PUBLIC_DEPLOYMENT_DEFERRED` holds, `.vercelignore` is in place, and the `VERCEL` no-op is
  verified.

### T018 — Checkpoint C0 gate

```text
npm run typecheck: rc 0
npm test: rc 0
ℹ tests 131
ℹ pass 130
ℹ fail 0
ℹ skipped 1
npm run test:browser (webServer now runs the copy step first): rc 0

  1 skipped
  32 passed (17.7s)
npm run test:browser:dev: rc 0

  1 passed (3.5s)
```

**Protection**
- **Protected set**: 96/96 unchanged.
- **Hashes**: `runGraph` `922db752…`, unchanged; `src/main.ts` `bd34bf98…`, unchanged.
- **Code**: `src/graph`, `src/integration`, `/api/market`, the Yahoo adapter, MarketBundle, prompts and
  evidence are unchanged.
- **AkariSP**: changes 0.
- **Dependencies**: `pixel-agents@1.4.1` is the only direct dependency change.
- **Upstream package**: unmodified. The source inventory is still `ec6dfa08…`, and the copied JS
  compares identical.
- **Production Pixel integration**: not started. No iframe is in `ExecutionView`, and the canonical
  suites have no Pixel assertion.

**C0 result: PASS**, with one confirmation requested (F008-007: adopt `sandbox="allow-scripts"` and
the `/pixel-agents/*` CORS header in `next.config.ts`). State: **UPSTREAM_CONSUMABLE**; the Feature
remains `IMPLEMENTATION_PARTIAL`. Next: T019 (C-pixel), after maintainer confirmation.

## Checkpoint C-pixel — Pixel iframe (T019–T020; F008-007 approved 2026-09-29)

Maintainer decision: canonical isolation is **B2**:
- `sandbox="allow-scripts"`, with no `allow-same-origin`
- a CORS header on the Pixel static path only, never on `/api/*`, and absent on Vercel
- trust based on `event.source`, the envelope and the type. The sandbox origin `"null"` is not a
  trust signal.

### T019 — Changes

**`next.config.ts`** (+6 lines):

```ts
...(process.env.VERCEL ? {} : {
  headers: async () => [{ source: '/pixel-agents/:path*', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }] }],
}),
```

- **Locally**: `headers()` returns exactly `[{"source":"/pixel-agents/:path*","headers":[{"key":"Access-Control-Allow-Origin","value":"*"}]}]`.
- **With `VERCEL=1`**: there is no `headers` key at all (the config was imported with Node and
  checked).
- **Measured**:
  - `HEAD /pixel-agents/index.html` → `access-control-allow-origin: *`
  - `/api/market` → no such header (`null`)

**`components/ExecutionView.tsx`**: the iframe host was added. The observer, reducer and text panel
are unchanged.
- **When the iframe is created**: only when all of these hold:
  - not under `prefers-reduced-motion: reduce`. It is never created and then hidden.
  - a same-origin `HEAD /pixel-agents/index.html` returns ok (D4 fallback: otherwise text-only)
  - no earlier view error
  - the adapter and decoder modules load (dynamic import)
- **Iframe**: `src="/pixel-agents/index.html"`, `sandbox="allow-scripts"` (no `allow-same-origin`),
  a title that says it is decorative, and a responsive width with `aspect-ratio` 3/2.
- **Message trust**: a message is accepted only if all of these hold:
  - `event.source === iframe.contentWindow`
  - `data.source === 'pixel-agents'`
  - `data.message.type` is a string
- **Allowlist**: only `webviewReady` gets a response: `startSequence` plus the current state, then
  state diffs through `messagesFor`. Every other type (`saveAgentSeats`, `launchAgent`, …) is counted
  in `data-ignored-requests` and never acted on. Messages that fail the envelope checks are dropped
  and not counted.
- **Posting**: to the frame with target `'*'`, the only target that reaches an opaque origin. The
  payload is view state only.
- **Errors**: an adapter or post error removes the iframe; the text panel stays.
- **Test visibility**: `data-iframes` on the section.
- **Cleanup**: removes the listener and the iframe.

### T020 — Checkpoint C-pixel gate

```text
npm run typecheck: rc 0
npm run build: rc 0 (prerender: / ○ Static); / first-load bytes: 572951 (C-text: 571295)
npm test: rc 0
ℹ tests 131
ℹ pass 130
ℹ fail 0
ℹ skipped 1
npm run test:browser: rc 0 (existing tests unchanged)

  1 skipped
  32 passed (19.7s)
```

**Browser smoke** (`next start` on port 5194, ad-hoc scratchpad script, `BROWSER_AUTOMATED`, stand-in).
Raw output:

```text
{
 "on": {
  "attrs": {
   "sandbox": "allow-scripts",
   "src": "/pixel-agents/index.html",
   "title": "Pixel Agents office (decorative; the text above is authoritative)"
  },
  "iso": {
   "selfOrigin": "null",
   "parentDocument": "SecurityError"
  },
  "accessControlAllowOrigin": {
   "pixel": "*",
   "api": null
  },
  "canvasBefore": [
   "Market Analyst",
   "Idle",
   "News Analyst",
   "Idle",
   "Bull Researcher",
   "Idle",
   "Bear Researcher",
   "Idle",
   "Research Manager",
   "Idle",
   "Trader",
   "Idle",
   "Risk Reviewer",
   "Idle",
   "Final Decision",
   "Idle"
  ],
  "afterClicks": {
   "status": "idle",
   "evidence": "",
   "runtime": "—",
   "ignored": "2"
  },
  "apiRequestsAfterClicks": 0,
  "run": {
   "outcome": "success",
   "counts": {
    "graphRuns": 1,
    "nodeExecutions": 8,
    "logicalRequests": 8,
    "fallbackRequests": 0,
    "providerInvocations": "NOT EXPOSED"
   },
   "lifecycle": {
    "settledBeforeShutdown": true,
    "snapshotBeforeShutdown": {
     "state": "ready",
     "active": 0,
     "queued": 0
    },
    "snapshotAfterShutdown": {
     "state": "closed",
     "active": 0,
     "queued": 0
    }
   }
  },
  "panel": {
   "run": "completed",
   "roles": "completed,completed,completed,completed,completed,completed,completed,completed",
   "ds": {
    "health": "ok",
    "observers": "1",
    "iframes": "1",
    "ignoredRequests": "2",
    "anomalies": "0"
   }
  },
  "canvasAfter": [
   "+ Agent",
   "Layout",
   "Settings",
   "Updated to v1.4!",
   "x",
   "See what's new",
   "v1.4",
   "Settings",
   "x",
   "Open Sessions Folder",
   "Export Layout",
   "Import Layout",
   "Add Asset Directory",
   "Sound Notifications",
   "Watch All Sessions",
   "Instant Detection (Hooks)"
  ],
  "external": [],
  "errors": [
   "Failed to load resource: the server responded with a status of 400 (Bad Request)"
  ]
 },
 "reducedMotion": {
  "iframesCreated": 0,
  "iframesInDom": 0,
  "run": "completed"
 },
 "vizOff": {
  "section": false,
  "iframesCreated": 0
 },
 "forged": {
  "before": "1",
  "after": "1",
  "status": "idle"
 }
}
```

- **Boot**:
  - `data-iframes` is 1.
  - Before the run, the canvas lists the 8 role labels (`agentTeamInfo`), each "Idle", seated at
    the 8 fixed chairs (C0 T016).
  - 0 console errors from the view. The only error line is the smoke's own deliberate probe
    `GET /api/market?symbol=NOPE` → 400, used to read that route's headers.
- **Isolation**: inside the frame, `self.origin` is `"null"`, and `parent.document` throws
  `SecurityError`.
- **Webview controls are inert**: "+ Agent" and Settings were clicked before any run. After that:
  - `#status` idle, `#evidence` empty, `#runtime` `—` (no runtime created, hence no model request)
  - `/api/market` requests 0
  - `data-ignored-requests` 2 (`saveAgentSeats`, `launchAgent`)
- **Run**:
  - The evidence shows `success`, `graphRuns` 1, 8/8 roles and 8 logical requests, with 0 fallbacks,
    and `{ready,0,0}` → `settledBeforeShutdown` true → `{closed,0,0}`.
  - The panel shows the run completed and 8 × `completed`, with anomalies 0.
- **Forged messages**: a same-page `launchAgent` and a forged `webviewReady`, both with the correct
  envelope but the wrong `event.source`, were dropped. `data-ignored-requests` stayed 1 → 1, and the
  status stayed idle.
- **Reduced motion**: 0 iframes created (`document.createElement('iframe')` counted by an init
  script), 0 in the DOM. The text panel completed the run.
- **`?viz=off`**: no section, and 0 iframes created.
- **Network**: 0 off-origin requests.

**Fan-out hold** (second ad-hoc script: `__standin.hold()`, then Run):

```text
{"during":{"panel":["▶ Market Analyst: working (graph)","▶ News Analyst: working (graph)","… Bull Researcher: waiting"],"runtime":"state ready · active 1 · queued 1","canvas":["Market Analyst","working (graph)","News Analyst","working (graph)","Bull Researcher","Idle"]}}
```

- Both analysts show `working (graph)` on the panel and the canvas. No role is shown queued or
  inferring (0/0), and the runtime panel shows `active 1 · queued 1` verbatim (F008-O1, FR-011).
- After the run, all 8 characters sit at their seats with the upstream "Done" check bubble.
- Screenshots stay in the scratchpad only, because they show upstream sprites (D4).

**Findings**
- **F008-008 (extended, LOW, cosmetic)**:
  - While the upstream "Done" bubble is shown, the webview hides the per-character name label.
  - The upstream Settings modal stays open over the canvas until it is closed.
  - The canonical names and states are in the text panel. No change is made, because hiding either
    behavior would need upstream edits.
- **No new blocking finding.**

**Protection**
- **Protected set**: 96/96 unchanged.
- **Hashes**:
  - `src/main.ts` `bd34bf98…`, unchanged
  - `runGraph` `922db752…`, unchanged
  - `package.json` `ddc91e3a…` and `package-lock.json` `55c816be…`, unchanged since C0
- **Dependencies**: no change beyond `pixel-agents@1.4.1`.
- **Upstream**: the source inventory is still `ec6dfa08…`. Upstream JS/CSS modifications: 0.
- **AkariSP**: changes 0.

State: **VIEW_INTEGRATED**. The Feature remains `IMPLEMENTATION_PARTIAL` until checkpoints D, E and F.
Next: T021 (Checkpoint D browser validation).

## Checkpoint D — Browser validation (T021–T032)

### Changes

| File | Change |
|---|---|
| `e2e/execution-view.spec.ts` (new) | T021–T029 and T031 |
| `e2e/view-overhead.spec.ts` + `e2e/replay-dom.ts` (new) | T030 |
| `components/ExecutionView.tsx` | one test-visible counter, `data-mounts`, incremented at effect start, like `data-observers` (it proves Strict Mode's mount → cleanup → mount; no behavior change) |
| `playwright.config.ts` | `workers: 1`, because `app.spec.ts` and `execution-view.spec.ts` both drive the one shared market stub (`/__scenario`); parallel files would race |

All instrumentation is test-side (init scripts, routes, stand-in wrapping). No production test hook was
added.

### Results (production build, `BROWSER_AUTOMATED`, stand-in)

| Task | Result |
|---|---|
| T021 US1 | **PASS**. `sandbox="allow-scripts"`; `parent.document` → `SecurityError`. Inside the frame: `existingAgents.agentMeta` equals `ROLE_IDENTITY` (palette, hue, seat), the 8 `agentTeamInfo` names equal the `ROLES` labels, and all 8 labels are visible. The run gives `success`, `graphRuns` 1, 8 node executions, 8 logical requests, 0 fallbacks; the panel shows completed ×8 and runtime `state closed · active 0 · queued 0`; `data-iframes` 1, `data-observers` 1, anomalies 0. Off-origin requests 0 |
| T022 US2/SC-001/SC-013 | **PASS**. The run was stepped with `__standin` hold/resume. The working sets were `[0,1] → [1] → [2] … [7]`. Every role had exactly one working period, then completed. Bull started only after both analysts were completed. Latency (page write → view DOM state) is below. All ≤ 1000 ms |
| T023 US3/SC-003 | **PASS**. The panel showed Market and News `working (graph)`, and `#view-runtime` showed `state ready · active 1 · queued 1`. 0 roles queued or inferring. The canvas showed "working (graph)" twice |
| T024 US4, acquisition failure | **PASS**. With the stub `server-error`, the failure is `market-data/acquisition/provider-error` and `graphRuns` 0. The panel shows `failed · acquisition` and 8 × `not-run`; no panel state ever had working, queued or inferring |
| T024 US4, acquisition cancel | **PASS**. The run is `cancelled · acquisition` with 8 × `not-run`. Nothing changed 500 ms later, and nothing was ever working |
| T024 US4/SC-006, graph cancel | **PASS**. Bull was held working, then cancelled. The panel shows analysts completed, Bull `cancelled`, 5 × `not-run`, unchanged 500 ms later. The lifecycle was `{ready,0,0}`, then `settledBeforeShutdown` true, then `{closed,0,0}` |
| T024 US4, role failure (test-injected at Bull) | **PASS**. `failed · graph`: analysts completed, Bull failed, 5 × not run |
| T024 US4, Market fails while News is in flight | **PASS as observed — finding F008-009**. LangGraph aborts the sibling branch. The page writes `error` for both nodes (the evidence has `errorKind` `failed` and `cancelled`), so the view shows both analysts as `failed`. Nothing is left working or waiting, and the lifecycle settled |
| T024 US4, `createRuntime` failure, second run, native BLOCKED | **PASS**. `createRuntime` failure → `failed · graph` with 8 × not run. The second run resets and completes. BLOCKED (same-task `running…` → `done:`) → `not run (blocked)` with anomalies 0 |
| T025 US5/SC-002/SC-012, fixture | **PASS**. The evidence is deep-equal after removing exactly the INV-4 fields, across: view on, `?viz=off`, the webview failing (every `/pixel-agents/**` → 404: no iframe), a corrupt sprite (the decoder fails: the host removes the iframe), and the tasks.md host-error injection (the `contentWindow` getter returns an object whose `postMessage` throws). The text panel completed in every case. Note: with the getter injection, `event.source` no longer matches, so the host drops every webview message and never posts. The throwing path is reached by the corrupt-sprite case |
| T025 US5/SC-002, live | **PASS with finding F008-010**. After exactly the INV-4 fields are removed, `dataSource.snapshotDigest` still differs between the two runs. The test proves the only cause: recomputing the ON bundle's canonical SHA-256 with the OFF bundle's `acquiredAt` gives the OFF digest. Everything else is deep-equal. The field was not added to the exclusion list |
| T026 US5/M6 | **PASS**. After "+ Agent" and Settings were clicked: `data-ignored-requests` increased (`launchAgent`); `#status` idle; `#evidence` empty; `#runtime` `—`; `/api/market` requests 0; no `/pixel-agents` re-fetch. Forged messages all had no effect: two with the right envelope from the page window (`webviewReady`, `launchAgent`), and from inside the frame a wrong `data.source`, a missing type, a numeric type, a string `'webviewReady'`, and an unknown type `runGraph`. Only the well-formed unknown type is counted as ignored (+1). `settingsLoaded` was received once, so no forged ready was answered. A Run click afterwards gives `graphRuns` 1 |
| T027 US6 | **PASS**. Fixture and live both end completed. The mode line shows `provider: standin · data: fixture` and `provider: standin · data: live` |
| T028 SC-007 (`@dev`) | **PASS**. `data-mounts` 2 (effect, cleanup, effect), 1 observer, 1 iframe, 1 `<iframe>` in the DOM. One click gives `graphRuns` 1 and 8 logical requests |
| T029 SC-014a | **PASS**. Post-mount baseline `{"iframesCreated":1,"observersCreated":1,"observersDisconnected":0,"messageListeners":1}`. After each of 10 runs, the delta was 0. After each of 5 reloads, the counters equal the baseline. Static scan: no `setTimeout`, `setInterval` or `requestAnimationFrame` in `ExecutionView.tsx`. `usedJSHeapSize` after 10 runs: 24 500 000 (informational). No media-query listener is registered (a one-time `matchMedia().matches` read) |
| **T030 SC-014b** | **FAIL — finding F008-011** (below) |
| T031 | **PASS**. Reduced motion: 0 iframes created, 0 `/pixel-agents` requests, the run completes 8/8, and each role reads `<Label>: completed`. `?viz=off`: no section, 0 iframes, 0 Pixel requests. 375 px: the iframe fits (right edge ≤ 375), all 8 labels are visible, the Run and Cancel centers hit themselves (not covered), and the view adds no page width compared with `?viz=off`. Off-origin requests 0 |

SC-013 raw latency (ms), run 1 of the ×3 suite:

```text
SC-013 latency (ms): [{"what":"node-marketAnalyst:running","ms":0.4},{"what":"node-newsAnalyst:running","ms":0.4},{"what":"node-marketAnalyst:done","ms":1},{"what":"node-newsAnalyst:done","ms":1.2},{"what":"node-bullResearcher:running","ms":0.3},{"what":"node-bullResearcher:done","ms":1.1},{"what":"node-bearResearcher:running","ms":0.4},{"what":"node-bearResearcher:done","ms":1},{"what":"node-researchManager:running","ms":0.3},{"what":"node-researchManager:done","ms":1.3},{"what":"node-trader:running","ms":0.6},{"what":"node-trader:done","ms":1.1},{"what":"node-riskReviewer:running","ms":0.4},{"what":"node-riskReviewer:done","ms":0.9},{"what":"node-finalDecisionMaker:running","ms":0.4},{"what":"node-finalDecisionMaker:done","ms":1.8},{"what":"status:done: BROWSER_AUTOMATED · success","ms":0.2}]
  ✓  33 [chromium] › e2e/execution-view.spec.ts:160:1 › T022 US2/SC-001/SC-013: stepped run — each role works exactly once, in topology order, painted ≤ 1 s after its write (441ms)
```

The latency is measured from the page's own status write (a MutationObserver on `#node-*` / `#status`)
to the view's DOM `data-state` change, which is React's commit. Painting follows within the next frame.

### T030 — SC-014b (D3): FAIL

Method: the `success` trace is replayed as status writes over a fixed 10 s window, with no run, model
or acquisition. The view is alternately OFF (`?viz=off`) and ON, 5 repetitions each, in one browser
process. `busyRatio = ΔTaskDuration / wall`, from Chrome DevTools Protocol `Performance.getMetrics`.
The sandboxed frame shares the page's renderer process (it has no separate CDP target), so the page
metric includes it.

**First measurement (invalid, kept for the record)**:

```text
SC-014b raw {"windowMs":10000,"off":[0.002343024992532112,0.0035433526011560694,0.0022868525896414344,0.003241183502689779,0.002094204341764589],"on":[0.010422053989441179,0.00827973699940227,0.009028981177173587,0.011029089460051803,0.009418741286596297],"medianOff":0.002343024992532112,"medianOn":0.009418741286596297,"deltaPercentagePoints":0.7075716294064185,"pixelFrameInSeparateProcess":false}
```

- Result: +0.71 percentage points.
- Why it is invalid: the canvas was below the fold. Chrome throttles off-screen frames: an in-frame
  `requestAnimationFrame` probe did not tick. So the canvas was not rendering during the window.

**Corrected measurement**: the view is scrolled into view (OFF scrolls to `#result`), and an in-frame
rAF probe must show more than 20 fps before each ON window. It measured **60 fps**. Standalone run:

```text
SC-014b raw {"windowMs":10000,"off":[0.0018423620792670783,0.004003587801474985,0.00279035305818001,0.006607153531931852,0.0029940209267563527],"on":[0.18928230141349794,0.18116237781767405,0.17199093986459577,0.1516836236933798,0.1820860986547085],"medianOff":0.0029940209267563527,"medianOn":0.18116237781767405,"deltaPercentagePoints":17.81683568909177,"pixelFrameInSeparateProcess":false,"pixelFrameFpsBeforeWindow":[60,60,60,60,60]}
      63 |   console.log('SC-014b raw', JSON.stringify({ windowMs: WINDOW_MS, off, on, medianOff: median(off), medianOn: median(on),
```

Full-suite runs ×3:

```text
SC-014b raw {"windowMs":10000,"off":[0.0031231198326526544,0.0038663943409385274,0.0027758070944599446,0.0035655509065550908,0.005251993620414673],"on":[0.19863392768204005,0.1553382836639091,0.1883293132662215,0.14378849795674276,0.16240751819722807],"medianOff":0.0035655509065550908,"medianOn":0.16240751819722807,"deltaPercentagePoints":15.884196729067298,"pixelFrameInSeparateProcess":false,"pixelFrameFpsBeforeWindow":[60,60,60,60,60]}
      63 |   console.log('SC-014b raw', JSON.stringify({ windowMs: WINDOW_MS, off, on, medianOff: median(off), medianOn: median(on),
SC-014b raw {"windowMs":10000,"off":[0.001527952167414051,0.004934050607690775,0.0018304070231444534,0.005137900089739755,0.002436372695565521],"on":[0.1820725677830941,0.1747182452642074,0.17076457085828345,0.19753703519090818,0.17167500498305757],"medianOff":0.002436372695565521,"medianOn":0.1747182452642074,"deltaPercentagePoints":17.22818725686419,"pixelFrameInSeparateProcess":false,"pixelFrameFpsBeforeWindow":[60,60,60,60,60]}
      63 |   console.log('SC-014b raw', JSON.stringify({ windowMs: WINDOW_MS, off, on, medianOff: median(off), medianOn: median(on),
SC-014b raw {"windowMs":10000,"off":[0.001963424357185569,0.004472058970016935,0.0028545526997409846,0.006069748903945795,0.0030093644152221558],"on":[0.1649599162428956,0.13607808915926997,0.15413765948963318,0.17042726185731366,0.1636128389154705],"medianOff":0.0030093644152221558,"medianOn":0.1636128389154705,"deltaPercentagePoints":16.060347450024835,"pixelFrameInSeparateProcess":false,"pixelFrameFpsBeforeWindow":[60,60,60,60,60]}
      63 |   console.log('SC-014b raw', JSON.stringify({ windowMs: WINDOW_MS, off, on, medianOff: median(off), medianOn: median(on),
```

| Run | median OFF | median ON | Δ (percentage points) |
|---|---|---|---|
| standalone | 0.299 % | 18.12 % | **+17.82** |
| suite 1 | 0.357 % | 16.24 % | **+15.88** |
| suite 2 | 0.244 % | 17.47 % | **+17.23** |
| suite 3 | 0.301 % | 16.36 % | **+16.06** |

**Finding F008-011 — SC-014b exceeds 10 percentage points (STOP condition).**
- **Evidence**: in 4/4 measurements, the upstream canvas animating on screen at 60 fps adds about 16–18
  percentage points of main-thread busy time.
- **Cause**: the unmodified upstream webview runs a continuous rAF game loop (idle wandering and
  animation) whenever it is visible. It does so whether or not a run is in progress.
- **Environment caveat**: headless Playwright Chromium (software rendering). Real Chrome with a GPU may
  differ. This was not measured, and no claim is made about it.
- **Not done**: no upstream change, no tuning, no change to the criterion.
- **Options for the maintainer**, all app-local and without upstream edits:
  1. mount the canvas only while a run is active (plus a short tail), and show the text panel otherwise
  2. make the canvas smaller (the canvas cost scales with pixels)
  3. unmount or hide the iframe when it scrolls off-screen (IntersectionObserver)
  4. re-measure in headed Chrome with a GPU, as an additional environment
  5. revise SC-014b

### Other findings

- **F008-009 — the status surface cannot tell a graph-aborted sibling from a failed role (LOW).**
  - `src/main.ts` writes `error` for both, so the view shows both analysts `failed` when one fails and
    LangGraph aborts the other.
  - The evidence record keeps the distinction (`errorKind` `failed` vs `cancelled`), but it is not
    mapped per role.
  - Fixing it needs either a change to the protected execution code or role ↔ request attribution
    (F008-O1). Both are out of scope, so the behavior is documented.
- **F008-010 — the live ON/OFF comparison differs in `dataSource.snapshotDigest` (maintainer
  decision).**
  - The Feature 007 bundle digest includes `acquiredAt`, so two acquisitions of identical data differ.
  - The test proves this is the only cause, and every other field is equal.
  - Options: add `dataSource.snapshotDigest` to the INV-4 list with this proof, or keep the explicit
    proof as it is.
- **F008-008** (cosmetic canvas behavior) and **F008-L1** (asset license, OPEN,
  `PUBLIC_DEPLOYMENT_DEFERRED`) are unchanged.

### T032 — Checkpoint D gate

```text
npm run typecheck: rc 0
npm run build: rc 0; / first-load bytes 572985 (C-pixel 572951; no first-load file contains LangGraph or ROLES)
npm test: rc 0
ℹ tests 131
ℹ pass 130
ℹ fail 0
ℹ skipped 1
npm run test:browser run 1:
  1 failed
  1 skipped
  47 passed (2.4m)
npm run test:browser run 2:
  1 failed
  1 skipped
  47 passed (2.4m)
npm run test:browser run 3:
  1 failed
  1 skipped
  47 passed (2.4m)
npm run test:browser:dev: rc 0
  2 passed (4.8s)
```

- **Browser suite (×3)**: 47 passed, 1 skipped (opt-in real Yahoo) and **1 failed (T030 SC-014b)** in
  every run. The existing Feature 007 tests all passed.
- **Protected set**: 96/96 unchanged.
- **Hashes**: `src/main.ts` `bd34bf98…`, unchanged; `runGraph` `922db752…`, unchanged. AkariSP changes
  0.
- **Dependencies**: `pixel-agents@1.4.1` (dev) is the only direct dependency. `package.json` and the
  lockfile are unchanged since C0.
- **Upstream**:
  - source inventory `ec6dfa08…`
  - the copy script re-verified: 97 files, byte-identical, `index.html` +1 shim line
  - upstream patches 0
- **Off-origin requests**: 0 in every Feature 008 test.
- **Deployment**: none. No screenshot or sprite was committed (D4).

**Checkpoint D: BLOCKED by F008-011 (SC-014b).** Every other item passed. The state stays
`VIEW_INTEGRATED` / `IMPLEMENTATION_PARTIAL`; it was not raised to `CONTROLLED_VIEW_VALIDATED`. T033 is
not started, and a maintainer decision on F008-011 (and F008-010) is required.

## Checkpoint D repair — F008-009 / F008-010 / F008-011 (maintainer decisions, 2026-09-29)

### F008-011 — implementation (SC-014b criterion unchanged)

- **A. Run-scoped lifecycle** (`components/ExecutionView.tsx`): the iframe exists only while the
  observed run state is `running`. Idle and every terminal state (completed, failed, cancelled, not
  run) unmount it immediately; there is no timer or grace period. The lifecycle reads view state only.
- **B. Off-screen lifecycle**: an `IntersectionObserver` on `#view-stage` unmounts the iframe whenever
  the area leaves the viewport, even during a run. When it returns, the iframe remounts and gets the
  current snapshot after `webviewReady`.
- **Caching**: the webview check, the adapter and the decoded sprites load once per view and are
  reused by every mount.
- **C. Compact viewport**: CSS `width: 100%; max-width: 480px; aspect-ratio: 3/2`.

**C, measured (the upstream canvas backing store follows the iframe; no CSS transform).** Scratch
experiment, `next start`, the default Playwright Chromium (headless, software rendering),
`TaskDuration` over 5 s with idle agents:

| iframe viewport | `canvas.width × height` | page busy ratio |
|---|---|---|
| 900×600 (before) | 900×600 | 14.97 % |
| 640×427 | 640×427 | 11.66 % |
| **480×320 (chosen)** | **480×320** | **9.22 %** |
| 400×267 | 400×267 | 9.50 % |
| 320×213 | 320×213 | 9.83 % |

- **Below 480×320 the cost is flat.** A CPU profile attributes about 9–11 % to native `(program)`
  (software raster and compositing) and about 3 % to `drawImage`. This is a per-frame floor, not a
  per-pixel cost.
- **`alwaysShowLabels: false` does not reduce it** (9.66 % → 14.11 %, noise).
- **A `contain: strict` sample is INVALID**: the frame collapsed to 0 × 0 and stopped rendering.
- **480×320 keeps all 8 labels in the canvas.** At a 375 px page width, the backing store is
  359×239 (T031).

### Active-visible SC-014b (canonical, `e2e/view-overhead.spec.ts`)

- **Window setup**: `run-started` and both analysts' starts are written before the window. The
  canvas must be mounted, on screen and animating (≥ 20 fps; measured 61 fps). The rest of the
  `success` trace, apart from `run-ended`, is replayed over the 10 s window. `run-ended` comes only
  after the window closes, and the test asserts the canvas was still mounted at the end of the window
  and unmounted after `run-ended`.
- **Samples**: OFF and ON alternate, 5 each, in the same browser process.
- **Process**: the sandboxed frame is in the page's renderer process in this browser (no separate CDP
  target), so the page metric includes it.
- **Invalid earlier result**: the first +0.71 pp (the canvas was off-screen and throttled) remains
  INVALID evidence.

Raw samples:

```text
SC-014b raw {"windowMs":10000,"off":[0.0015390827517447658,0.003444001196768725,0.001417929796569605,0.0041065696341341835,0.0017755407156383933],"on":[0.15749750598563447,0.1512472571314582,0.14164865403788635,0.17247343765573608,0.14825433871932975],"medianOff":0.0017755407156383933,"medianOn":0.1512472571314582,"deltaPercentagePoints":14.94717164158198,"pixelFrameInSeparateProcess":false,"pixelFrameFps":[61,61,61,61,61],"canvasBacking":{"width":480,"height":320}}
      82 |   console.log('SC-014b raw', JSON.stringify({ windowMs: WINDOW_MS, off, on, medianOff: median(off), medianOn: median(on),
SC-014b raw {"windowMs":10000,"off":[0.001502193419740778,0.004405545581488131,0.0012434773949412468,0.003801993024414549,0.0018554636916027494],"on":[0.14784593139210211,0.09450693405168115,0.11750019948134849,0.11904565845877776,0.1246195890684221],"medianOff":0.0018554636916027494,"medianOn":0.11904565845877776,"deltaPercentagePoints":11.719019476717502,"pixelFrameInSeparateProcess":false,"pixelFrameFps":[61,61,61,61,61],"canvasBacking":{"width":480,"height":320}}
      82 |   console.log('SC-014b raw', JSON.stringify({ windowMs: WINDOW_MS, off, on, medianOff: median(off), medianOn: median(on),
SC-014b raw {"windowMs":10000,"off":[0.0014184284004786598,0.003752366716492277,0.0018266547049441788,0.004650348953140579,0.0014413346613545818],"on":[0.12371575274177468,0.13624678560749529,0.14389908256880735,0.10382116497107521,0.11828233768824177],"medianOff":0.0018266547049441788,"medianOn":0.12371575274177468,"deltaPercentagePoints":12.18890980368305,"pixelFrameInSeparateProcess":false,"pixelFrameFps":[61,61,61,61,61],"canvasBacking":{"width":480,"height":320}}
      82 |   console.log('SC-014b raw', JSON.stringify({ windowMs: WINDOW_MS, off, on, medianOff: median(off), medianOn: median(on),
SC-014b raw {"windowMs":10000,"off":[0.001815907505232732,0.0028006780337022632,0.003132835077229696,0.002396470940085734,0.004231152772237734],"on":[0.1353811802232855,0.14448360083740402,0.1412875947347427,0.1301048387096774,0.10326713216957606],"medianOff":0.0028006780337022632,"medianOn":0.1353811802232855,"deltaPercentagePoints":13.258050218958322,"pixelFrameInSeparateProcess":false,"pixelFrameFps":[61,61,61,61,61],"canvasBacking":{"width":480,"height":320}}
      82 |   console.log('SC-014b raw', JSON.stringify({ windowMs: WINDOW_MS, off, on, medianOff: median(off), medianOn: median(on),
```

| Run | median OFF | median ON | Δ |
|---|---|---|---|
| standalone (after A+B+C) | 0.178 % | 15.12 % | **+14.95 pp** |
| full suite 1 | 0.186 % | 11.90 % | **+11.72 pp** |
| full suite 2 | 0.183 % | 12.37 % | **+12.19 pp** |
| full suite 3 | 0.280 % | 13.54 % | **+13.26 pp** |

Compared with before the repair (+15.9 to +17.8 pp) the cost is lower, but it is **still above 10
percentage points: SC-014b FAIL.**

### Supplemental: headed Google Chrome with GPU (never replaces the canonical gate)

Google Chrome 154.0.8037.58 was run headed with a fresh temporary profile, using the same procedure:

```text
HEADED-GPU supplemental {"browser":"154.0.8037.58","canvasFeature":"unknown","off":[0.010969077306733167,0.01298723319369639,0.0018497357662777946,0.0019380548628428924,0.0039650977263661746],"on":[0.009620125660716067,0.0027692998204667868,0.004993118579834447,0.003503190428713859,0.0035280215396888705],"medianOff":0.0039650977263661746,"medianOn":0.0035280215396888705,"deltaPercentagePoints":-0.0437076186677304}
headed OOPIF check: {"oopif":true,"frameProcessBusyRatio":0.12823400000000001,"fps":76}
```

- In real Chrome, the sandboxed frame is an **out-of-process iframe**. The page main-thread delta is
  about 0 pp (−0.04), but that number **excludes the canvas**.
- The frame's own renderer main thread is about **12.8 % busy** at about 76 fps.
- So the headed run does **not** show a pass. It shows the same cost, moved to another process.

### F008-010 — live ON/OFF comparison

Following the maintainer decision, `dataSource.snapshotDigest` was added to the INV-4 exclusions **for
the live comparison only**. The test also asserts all of these:

| Check | Result |
|---|---|
| The digest difference is caused only by `acquiredAt` | recompute proof |
| Normalized bundle without `acquiredAt` | deep-equal |
| `marketFacts` text | equal |
| `marketFactsDigest`, `marketAsOf`, `analysisDate`, `sessions`, `historySessions`, `provider` | equal |
| `result` | equal |
| `lifecycle` | equal |
| Every other non-volatile field | deep-equal |

The fixture comparison still includes `snapshotDigest` (equal). The Feature 007 digest definition is
unchanged. Result: PASS.

### F008-009 — ambiguous sibling error

- **New derived state**: `stopped`, with the text "error (failed/cancelled unclear)".
- **Where the attribution comes from**: the final record's model-request error kinds (`errorKinds`,
  read from `#evidence`).
- **Attribution rule, applied at `run-ended` to a role that reported `error`**:

  | Record's error kinds | Role is shown as |
  |---|---|
  | run `failed`, kinds non-empty, none `cancelled` | `failed` |
  | run `cancelled`, every kind `cancelled` | `cancelled` |
  | any other combination | `stopped` |

- A role still working at the end is `cancelled` (M9), as before.
- **Unchanged**: `src/main.ts`, the graph, the bridge and AkariSP. No role ↔ request correlation was
  added.
- **Tests**:
  - The new trace `ambiguous-sibling-error` gives `ssnnnnnn`.
  - New L1 attribution cases (26 L1 tests in total).
  - Browser: Market fails while News is in flight → both `stopped`, each shown as
    "error (failed/cancelled unclear)". The record has error kinds `['failed','cancelled']`, and the run
    is `failed · graph`.
  - Bull alone failing still shows `failed`; the graph cancel still shows `cancelled`.
- **Documents updated**:
  - spec FR-007 and FR-008
  - data-model (states, the 13 traces)
  - `contracts/execution-events.md` (`errorKinds`)
  - `contracts/pixel-host-protocol.md` (`stopped` text, lifecycle, compact viewport)
  - `tasks.md` INV-4 (live-only exclusion)

### Regression after the repair

```text
typecheck rc=0
build rc=0
test rc=0
browser 1 rc=1
browser 2 rc=1
browser 3 rc=1
dev rc=0
npm test:
ℹ tests 133
ℹ pass 132
ℹ fail 0
ℹ skipped 1
test:browser run 1:
  ✘  50 [chromium] › e2e/view-overhead.spec.ts:69:1 › T030 SC-014b: median busy-ratio increase ≤ 10 percentage points (active, visible canvas ON vs OFF, same trace and window) (1.8m)
  1 failed
  1 skipped
  48 passed (2.6m)
test:browser run 2:
  ✘  50 [chromium] › e2e/view-overhead.spec.ts:69:1 › T030 SC-014b: median busy-ratio increase ≤ 10 percentage points (active, visible canvas ON vs OFF, same trace and window) (1.8m)
  1 failed
  1 skipped
  48 passed (2.6m)
test:browser run 3:
  ✘  50 [chromium] › e2e/view-overhead.spec.ts:69:1 › T030 SC-014b: median busy-ratio increase ≤ 10 percentage points (active, visible canvas ON vs OFF, same trace and window) (1.8m)
  1 failed
  1 skipped
  48 passed (2.6m)
test:browser:dev:
  2 passed (5.2s)
SC-013 (run 1):
SC-013 latency (ms): [{"what":"node-marketAnalyst:running","ms":0.5},{"what":"node-newsAnalyst:running","ms":0.5},{"what":"node-marketAnalyst:done","ms":1.5},{"what":"node-newsAnalyst:done","ms":1.8},{"what":"node-bullResearcher:running","ms":0.6},{"what":"node-bullResearcher:done","ms":1.7},{"what":"node-bearResearcher:running","ms":0.6},{"what":"node-bearResearcher:done","ms":1.6},{"what":"node-researchManager:running","ms":0.6},{"what":"node-researchManager:done","ms":3.3},{"what":"node-trader:running","ms":2.4},{"what":"node-trader:done","ms":1.3},{"what":"node-riskReviewer:running","ms":0.6},{"what":"node-riskReviewer:done","ms":1.1},{"what":"node-finalDecisionMaker:running","ms":0.4},{"what":"node-finalDecisionMaker:done","ms":3.6},{"what":"status:done: BROWSER_AUTOMATED · success","ms":0.3}]
  ✓  33 [chromium] › e2e/execution-view.spec.ts:182:1 › T022 US2/SC-001/SC-013: stepped run — each role works exactly once, in topology order, reflected ≤ 1 s after its write (658ms)
SC-014a (run 1):
SC-014a usedJSHeapSize after 10 runs: 23100000 baseline counters: {"iframesCreated":0,"observersCreated":1,"observersDisconnected":0,"messageListeners":0,"ioCreated":2,"ioDisconnected":0}
  ✓  46 [chromium] › e2e/execution-view.spec.ts:521:1 › T029 SC-014a: 10 canvas-showing runs and 5 reloads — listeners, observers and iframes return to the baseline (3.3s)
T025 isolation (run 1):
T025 iframes during run: {"on":"1","noWebview":"0","badAsset":"0","hostError":"1"}
first-load bytes: 573286 (no first-load chunk contains LangGraph or ROLES)
```

**Per-test results**
- Every Feature 008 browser test except T030 passes ×3, as does every Feature 007 test (48 passed,
  1 skipped).
- T021: no iframe when idle; canvas 480×320 during the run; unmounted at the end.
- T026: controls and forged messages have no effect during a run.
- The new off-screen test: unmount and remount have no effect on graph runs, requests, the lifecycle
  or `/api/market`.
- The T029 counters count only observers created by app code: Playwright's own injected script creates
  a MutationObserver as well.

**Protection**
- **Protected set**: 96/96 unchanged.
- **Hashes**: `src/main.ts` `bd34bf98…`; `runGraph` `922db752…`.
- **AkariSP**: changes 0.
- **Dependencies**: `pixel-agents@1.4.1` (dev) only.
- **Upstream**: source inventory `ec6dfa08…`, copy re-verified, upstream patches 0.
- **Network**: off-origin requests 0.

### T032 — Checkpoint D gate: **BLOCKED (Case B)**

- All functional regressions pass. SC-014b alone fails: +11.7 to +15.0 pp after A+B+C, against the
  unchanged 10 pp contract.
- The supplemental headed GPU run does not change this: the canvas cost moves to an out-of-process
  frame (about 12.8 % of that process's main thread). It does not disappear.
- The criterion was not relaxed, and upstream was not patched.
- State: `VIEW_INTEGRATED` / `IMPLEMENTATION_PARTIAL`.
- **A maintainer decision on the Feature 008 product requirement is required before T033.**

## Maintainer decision D5 — F008-011 (2026-09-29)

- **Decision**: Option 2 was chosen. Pixel Agents becomes an **explicit on-demand visualizer**.
  Option 1 (close as `IMPLEMENTATION_PARTIAL`) and Option 3 (upstream patch or fork) were rejected.
- **Behavior**:
  - The text execution view is ON and canonical.
  - The Pixel canvas is OFF by default. It is enabled only by the host-owned "Show Pixel Agents"
    control, as page-session state with no storage.
  - The iframe exists only when enabled, the run is running and the area is visible.
  - The A/B/C optimizations are kept.
  - Under reduced motion the toggle is unavailable.
- **SC-014b (original, always-on, ≤ 10 pp): SUPERSEDED_BY_MAINTAINER_DECISION — FAILED.**
  - Headless, active and visible, after A/B/C: +11.72 to +14.95 percentage points.
  - Headed Chrome: the sandboxed Pixel out-of-process iframe's main thread was about 12.8 % busy.
  - Records above are unchanged; the first +0.71 pp result stays INVALID.
- **Replacements**:
  - SC-014b1 (gate): the default mode is within ≤ 2 pp of `?viz=off`.
  - SC-014b2: the explicit Pixel cost is disclosed as `KNOWN_UPSTREAM_COST`, with no threshold.
- **F008-011: RESOLVED_BY_PRODUCT_DECISION.**
  - Mitigation: default off, explicit opt-in, run-scoped, visibility-scoped, a compact 480×320
    canvas, and text only under reduced motion.
  - Known limitation: the explicitly enabled Pixel mode uses measurable rendering resources.
- **F008-009 and F008-010 repairs**: approved as recorded above.
- **Tasks reopened for rework**: T019, T021, T029 and T031. T030 has replacement criteria. T032 is
  pending.

## Checkpoint D after D5 — T019/T021/T029/T030/T031 rework and T032 gate

### Implementation (D5)

`components/ExecutionView.tsx`:
- **Toggle**: a host-owned `#view-pixel-toggle` ("Show Pixel Agents" / "Hide Pixel Agents",
  `aria-pressed`).
  - Its state is `useState` plus a ref. It starts `false` on every load and is never stored: `grep`
    finds no `localStorage`, `sessionStorage` or `document.cookie` in `ExecutionView` or `src/view`
    (0 hits).
  - Under reduced motion it is `disabled`, with the note "unavailable: reduced motion is preferred".
- **Lifecycle**: the iframe exists iff enabled, the run is running and the stage is intersecting.
  Turning it off unmounts at once. A/B/C are kept.
- **No requests while off**: nothing under `/pixel-agents/` is requested until the first mount
  (webview check, adapter, sprites).

### Tests

- **`e2e/execution-view.spec.ts`**: every canvas-dependent test now enables the toggle explicitly.
- **T021 (US1/D5)** covers:
  - a whole default run with 0 iframes and 0 `/pixel-agents` requests
  - opt-in before a run → still 0 while idle
  - storage untouched (`[0, 0, '']`)
  - a running, visible run → the 480×320 sandboxed canvas with the 8 fixed roles and
    `SecurityError` on `parent.document`
  - off during the run → 0 iframes while the run continues
  - on again → remount from the current snapshot (two `working (graph)` labels)
  - evidence `graphRuns` 1, 8/8/0, lifecycle settled
  - terminal → 0 iframes
  - the next run (still enabled) mounts again
  - a reload → off
- **T025** adds the default (text-only, 0 iframes) variant. Five variants were deep-compared against
  the Pixel-enabled run: default, off, webview 404, decoder failure, host error.
- **T031**: under reduced motion the toggle is disabled and no iframe is ever created. The 375 px check
  enables the toggle.
- **`e2e/view-overhead.spec.ts`**: SC-014b1 (the gate) and SC-014b2 (the disclosure).

### Full regression (post-D5)

```text
typecheck rc=0
build rc=0
test rc=0
browser 1 rc=0
browser 2 rc=0
browser 3 rc=0
dev rc=0
npm test:
ℹ tests 133
ℹ pass 132
ℹ fail 0
ℹ skipped 1
test:browser run 1:
  1 skipped
  50 passed (4.3m)
test:browser run 2:
  1 skipped
  50 passed (4.3m)
test:browser run 3:
  1 skipped
  50 passed (4.3m)
test:browser:dev:
  2 passed (4.3s)
first-load bytes: 573927 (no first-load chunk contains LangGraph or ROLES)
SC-013 (run 1):
SC-013 latency (ms): [{"what":"node-marketAnalyst:running","ms":0.5},{"what":"node-newsAnalyst:running","ms":0.5},{"what":"node-marketAnalyst:done","ms":1.1},{"what":"node-newsAnalyst:done","ms":1.3},{"what":"node-bullResearcher:running","ms":0.3},{"what":"node-bullResearcher:done","ms":1.2},{"what":"node-bearResearcher:running","ms":0.4},{"what":"node-bearResearcher:done","ms":1},{"what":"node-researchManager:running","ms":0.4},{"what":"node-researchManager:done","ms":1.4},{"what":"node-trader:running","ms":0.8},{"what":"node-trader:done","ms":1},{"what":"node-riskReviewer:running","ms":0.4},{"what":"node-riskReviewer:done","ms":0.8},{"what":"node-finalDecisionMaker:running","ms":0.3},{"what":"node-finalDecisionMaker:done","ms":2.5},{"what":"status:done: BROWSER_AUTOMATED · success","ms":0.3}]
  ✓  33 [chromium] › e2e/execution-view.spec.ts:219:1 › T022 US2/SC-001/SC-013: stepped run — each role works exactly once, in topology order, reflected ≤ 1 s after its write (593ms)
SC-014a (run 1):
SC-014a usedJSHeapSize after 10 runs: 56800000 baseline counters: {"iframesCreated":0,"observersCreated":1,"observersDisconnected":0,"messageListeners":0,"ioCreated":2,"ioDisconnected":0}
  ✓  46 [chromium] › e2e/execution-view.spec.ts:564:1 › T029 SC-014a: 10 canvas-showing runs and 5 reloads — listeners, observers and iframes return to the baseline (3.1s)
T025 (run 1):
T025 iframes during run: {"on":"1","text":"0","noWebview":"0","badAsset":"0","hostError":"1"}
T031 (run 1):
T031 375px canvas backing: {"width":359,"height":239}
```

### SC-014b1 (the gate): default mode against `?viz=off` — PASS

Same active synthetic trace, 10 s window, same browser process, alternating 5 + 5. The default page
had 0 Pixel iframes and 0 `/pixel-agents/*` requests (asserted in every sample).

```text
SC-014b1 raw {"windowMs":10000,"off":[0.0019019940179461617,0.0032979762735519886,0.0020137532389874428,0.0031181102362204723,0.002440813072937425],"on":[0.006157312331771508,0.006655502392344499,0.007165653343964916,0.007502940297019836,0.006688696172248803],"medianOff":0.002440813072937425,"medianOn":0.006688696172248803,"deltaPercentagePoints":0.42478830993113775,"pixelFrameInSeparateProcess":false,"pixelFrameFps":[0,0,0,0,0],"canvasBacking":null}
SC-014b1 raw {"windowMs":10000,"off":[0.001795295993621686,0.0033503140265177945,0.0016941176470588236,0.002429240582021128,0.0015387453874538748],"on":[0.00688784767221613,0.006285172998304915,0.006136649058108243,0.005698066188197767,0.006080326888578832],"medianOff":0.001795295993621686,"medianOn":0.006136649058108243,"deltaPercentagePoints":0.4341353064486558,"pixelFrameInSeparateProcess":false,"pixelFrameFps":[0,0,0,0,0],"canvasBacking":null}
SC-014b1 raw {"windowMs":10000,"off":[0.0013381883479648843,0.0019189916301315265,0.0013347622370650982,0.0026521088842357166,0.0016025129637016354],"on":[0.004315889154704944,0.004286127167630058,0.005158345789735924,0.004605163476874003,0.0051020143597925805],"medianOff":0.0016025129637016354,"medianOn":0.004605163476874003,"deltaPercentagePoints":0.30026505131723674,"pixelFrameInSeparateProcess":false,"pixelFrameFps":[0,0,0,0,0],"canvasBacking":null}
```

| Run | median `?viz=off` | median default | Δ |
|---|---|---|---|
| 1 | 0.244 % | 0.669 % | **+0.42 pp** |
| 2 | 0.180 % | 0.614 % | **+0.43 pp** |
| 3 | 0.160 % | 0.461 % | **+0.30 pp** |

Every run is ≤ 2 percentage points: **PASS**.

### SC-014b2: explicit Pixel mode — `KNOWN_UPSTREAM_COST` (disclosed; not a pass claim)

Conditions: an active run, the canvas visible, 61 fps, and the 480×320 backing store asserted. The
frame shares the page's process here, so the page metric includes it.

```text
SC-014b2 KNOWN_UPSTREAM_COST raw {"windowMs":10000,"off":[0.0022146132376395537,0.004438328846345598,0.0015471115537848607,0.005879394482621253,0.0021357926221335995],"on":[0.1750076754385965,0.15518390346065622,0.13683802114502294,0.12658181999600876,0.12120999600957702],"medianOff":0.0022146132376395537,"medianOn":0.13683802114502294,"deltaPercentagePoints":13.46234079073834,"pixelFrameInSeparateProcess":false,"pixelFrameFps":[61,61,61,61,61],"canvasBacking":{"width":480,"height":320}}
  ✓  51 [chromium] › e2e/view-overhead.spec.ts:98:1 › T030 SC-014b2: explicit Pixel mode cost, active and visible (KNOWN_UPSTREAM_COST; disclosed, no threshold) (1.8m)
SC-014b2 KNOWN_UPSTREAM_COST raw {"windowMs":10000,"off":[0.0019487435181491822,0.004460281072460879,0.0022454146730462522,0.004723838947578234,0.0018440522484794097],"on":[0.1615009466865969,0.1671218344965105,0.1717015759026531,0.13017180177485294,0.15591764705882355],"medianOff":0.0022454146730462522,"medianOn":0.1615009466865969,"deltaPercentagePoints":15.925553201355063,"pixelFrameInSeparateProcess":false,"pixelFrameFps":[61,61,61,61,61],"canvasBacking":{"width":480,"height":320}}
  ✓  51 [chromium] › e2e/view-overhead.spec.ts:98:1 › T030 SC-014b2: explicit Pixel mode cost, active and visible (KNOWN_UPSTREAM_COST; disclosed, no threshold) (1.8m)
SC-014b2 KNOWN_UPSTREAM_COST raw {"windowMs":10000,"off":[0.0014287423955320635,0.003406240653972685,0.0013473232977768916,0.005855377255058308,0.002425139553429027],"on":[0.1518415703467517,0.12673905236907732,0.14592828685258966,0.15386937880147572,0.1636330806065443],"medianOff":0.002425139553429027,"medianOn":0.1518415703467517,"deltaPercentagePoints":14.941643079332268,"pixelFrameInSeparateProcess":false,"pixelFrameFps":[61,61,61,61,61],"canvasBacking":{"width":480,"height":320}}
  ✓  51 [chromium] › e2e/view-overhead.spec.ts:98:1 › T030 SC-014b2: explicit Pixel mode cost, active and visible (KNOWN_UPSTREAM_COST; disclosed, no threshold) (1.8m)
```

| Run | median `?viz=off` | median Pixel enabled | Δ (known cost) |
|---|---|---|---|
| 1 | 0.221 % | 13.68 % | +13.46 pp |
| 2 | 0.225 % | 16.15 % | +15.93 pp |
| 3 | 0.243 % | 15.18 % | +14.94 pp |

- Supplemental headed Google Chrome (recorded above): the Pixel frame is out-of-process, and its main
  thread is about 12.8 % busy.
- **SC-014b (original)** remains **SUPERSEDED_BY_MAINTAINER_DECISION — FAILED** (+11.72 to +14.95 pp).
  The earlier invalid +0.71 pp stays INVALID.

### Protection

- **Protected set**: 96/96 unchanged.
- **Hashes**: `src/main.ts` `bd34bf98…`; `runGraph` `922db752…`.
- **AkariSP**: changes 0.
- **Dependencies**: `pixel-agents@1.4.1` (dev) only.
- **Upstream**: source inventory `ec6dfa08…`, the copy re-verified (97 files, +1 shim line), upstream
  patches 0.
- **Network**: off-origin requests 0.
- **Deployment**: none.

### T032 — Checkpoint D gate: **PASS**

- Every functional browser test passes ×3: 50 passed, 1 skipped (opt-in real Yahoo).
- dev Strict Mode passes 2/2.
- SC-014b1 passes; SC-014b2 is disclosed.
- **Findings**:
  - F008-011: RESOLVED_BY_PRODUCT_DECISION (D5).
  - F008-009 and F008-010: resolved (approved repairs).
  - F008-008 (cosmetic) and F008-L1 (asset license, OPEN, `PUBLIC_DEPLOYMENT_DEFERRED`): unchanged.

State: **CONTROLLED_VIEW_VALIDATED**. Next: T033 (APPROVAL REQUIRED — commit).
