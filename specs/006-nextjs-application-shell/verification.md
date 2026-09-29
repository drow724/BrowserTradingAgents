# Verification: Feature 006 — Next.js Application Shell Migration

Planning-document corrections applied before T001 (final analyze LOW findings; no production code):
- L1: tasks.md T013 step 6 and T029 use a pre/post `git diff -- <coexistence code paths> | shasum`
  digest; a dirty `git status` alone is not a failure before the T030 commit.
- L2: tasks.md T026/T029 no longer use `grep MUTATION`; `cmp` + T002 hash + `git diff` are the
  authoritative restore proof (option B, no marker).
- L3: contracts/evidence-equivalence.md harness mode adds `environment.availability`.

## Checkpoint A

### T001 Baseline (2026-09-29)

| Item | Value |
|---|---|
| branch | `006-nextjs-application-shell` |
| HEAD | `c64021e3dfdac96a46d96fd00e3c564c0cc09fb4` |
| origin/main | `c64021e3dfdac96a46d96fd00e3c564c0cc09fb4` |
| git status | untracked only: `.claude/`, `.specify/*` tooling, `CLAUDE.md`, `specs/006-nextjs-application-shell/` |
| node / npm | v23.9.0 / 10.9.2 |
| `npm ls --depth=0` | @langchain/core@1.2.13, @langchain/langgraph@1.4.18, @playwright/test@1.63.0, @types/node@22.20.4, akarisp@0.1.0-alpha.2, typescript@5.9.3, vite@8.3.1 |
| scripts | typecheck `tsc --noEmit`, build `vite build`, test `node --test test/*.test.ts`, test:browser `playwright test --project=chromium`, dev `vite`, harness `vite`, test:prompt-api `playwright test --project=prompt-api`, prepare:prompt-api `sh scripts/prepare-prompt-api-profile.sh` |

Vite gates: `npm run typecheck` PASS; `npm run build` exit 0 (chunk-size warning only);
`npm test` 62 (61 pass, 0 fail, 1 skip); `npm run test:browser` 28 passed.

### T002 Protected hashes (63 files)

`git ls-files specs/001-tradingagents-reference-analysis specs/002-langchain-akarisp-integration-validation specs/003-langgraph-akarisp-minimal-graph specs/004-browser-tradingagents-fixture-graph specs/005-browser-market-data-boundary harness src/main.ts src/graph src/integration src/market-data.ts test/standin.ts | xargs shasum -a 256`

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
e7a514d82cc55a24fa3d6cf73003bd5b499c689d7cd31c6ed1a5dd41d5bc4836  src/graph/trading-fixture.ts
69f3df1912f4c677145e3933328939510024f5fba258fb1be9b9ab9d9515598f  src/graph/trading-graph.ts
c243b34ab613a1fc53e3cd577dc72f80b04b9b6b37c5e448499368247509ad35  src/integration/akari-chat-model.ts
209ff6bb3ca3ac68aaee053a2f532b68e4247cdfeee0f6fe8243483566b0e013  src/integration/structured.ts
7a01cad288ff737a98f819829cd635ebd70978de7fba7a4f70aa6355321b2b3d  src/main.ts
f81f500a86efe54065d60e9155841bf9449ffc6c38d1fde5166fd6ad21d3b434  src/market-data.ts
ba2beb00c405dcee61e0671f2aa9171b2e8d10203a8ab7515f887f7ae05a46ae  test/standin.ts
```

### T003 Vite baseline evidence

- `evidence/baseline-vite-standin-fixture-2026-09-29-c64021e.json` (app test (a); revision
  `c64021e…` clean, BROWSER_AUTOMATED, standin, success)
- `evidence/baseline-vite-harness-standin-2026-09-29-c64021e.json` (harness stand-in; revision clean)
- native baseline (read only): `specs/005-browser-market-data-boundary/evidence/real-browser-fixture-2026-09-28-0543a69.json`

### T004 Dependencies

`npm install --save-exact next@16.3.6 react@19.3.0 react-dom@19.3.0` and
`npm install --save-exact -D @types/react@19.3.0 @types/react-dom@19.3.0`: `package.json` gains the
five exact entries; nothing removed (`vite@8.3.1` stays). `npm ls --depth=0` also lists
`@emnapi/runtime@1.11.3` and `@img/sharp-wasm32@0.35.5` as "extraneous" (optional `sharp` platform
packages present in the lock). Vite gates re-run: typecheck PASS, build exit 0, `npm test` 62
(61/0/1), `test:browser` 28 passed.

### T005 `.gitignore`

Added `.next/` and `next-env.d.ts`. `git check-ignore .next/x .next/dev/x next-env.d.ts` lists all
three (rc 0). Note: the task's `git check-ignore -q` with several paths is rejected by git
(`--quiet is only valid with a single pathname`); the non-quiet form was used.
Deviation: `*.tsbuildinfo` also added, because `"incremental": true` (T006) makes `tsc --noEmit`
write an untracked `tsconfig.tsbuildinfo` at the root.

**Checkpoint A: BASELINE_READY.** Protected hashes 63/63 OK after T005.

## Checkpoint B (stopped at T013)

T006–T012 done as written: `tsconfig.json` (T006 options and includes, original formatting kept),
`next.config.ts`, `app/layout.tsx`, `app/page.tsx` (index.html body; the `<tr>` rows sit in the
`<tbody>` the browser inserts anyway, needed to avoid a hydration mismatch), `components/Boot.tsx`
(contract text), `app/harness/page.tsx`, the four `next:*` scripts. `npm run typecheck` PASS.

T013 step 1 (`npm run next:typecheck`) and step 2 (`npm run next:build`) both succeed (`/`,
`/harness` prerendered as static) **but rewrite the tracked `tsconfig.json`** → stop condition.

### Finding F006-001 — Next rewrites `tsconfig.json` (adds `exclude`)

- **Reproduction**: with the T006 `tsconfig.json` (sha1 `213228d2…`), `npx next typegen` prints
  "We detected TypeScript in your project and reconfigured your tsconfig.json file for you …
  exclude was set to ['node_modules']" and rewrites the file (sha1 `a5994012…`, whole file
  reformatted). `npx next build` does the same from the same starting file.
- **Cause**: Next 16 requires a top-level `exclude`. Research R10 listed the options and includes
  Next writes but not `exclude`; the spike's `tsconfig.json` already had `"exclude"`, so the
  rewrite was not observed there. T006 / contract "includes exactly …" are therefore incomplete.
- **Smallest candidate correction** (planning-document + T006): add `"exclude": ["node_modules"]`
  to `tsconfig.json` in T006 (and to R10's list). Verified without keeping it: with that line the
  file stays byte-identical (sha1 `e7e34fad…`) across `next typegen` and `next build`, and
  `tsc --noEmit` passes. `tsconfig.json` was restored to the T006 text (`213228d2…`) afterwards.
- **Resolution** (maintainer approved "수정 적용 후 계속"): T006 in tasks.md, research R10 and
  contracts/shell-boundary.md gain the `exclude` line (planning-document correction), and
  `tsconfig.json` gets it. T013 is rerun from step 1.
- No `src/main.ts`, `harness/main.ts`, graph, integration or AkariSP change is involved.
- Also noted (own tooling, no effect on the finding): the first digest attempt under zsh did not
  word-split the code-path list, so it digested nothing; the next digest run will use `bash`.

### T013 Checkpoint B gate (rerun after F006-001)

L1 digest = `git diff -- <coexistence code paths> | shasum` plus a digest of the untracked
code-path files' contents (`git diff` does not see untracked `app/`, `components/`,
`next.config.ts`), run under `bash`. Value everywhere below: `diff=0cbda24f2999a3db
untracked=82940d1597e86b75`.

| Step | Command | Result | pre = post digest |
|---|---|---|---|
| 1 | `npm run next:typecheck` (from no `.next`, no `next-env.d.ts`) | rc 0; no "reconfigured" message | yes |
| 2 | `npm run next:build` | rc 0; `○ /`, `○ /_not-found`, `○ /harness` prerendered static; no error | yes |
| 3 | static boundary scan (R12a command) | 0 lines; `'use client'` 1; `import(` only the two in `useEffect`; `find app -name 'route.*'` 0; `middleware.*`/`proxy.*` (root, `src/`) 0; `output:\|distDir\|JSON.stringify` in `next.config.ts` 0 | n/a |
| 4 | `npm run next:start -- --port 5180`; `npm run next:dev -- --port 5181` | `/` 200, `/harness` 200, both contain `id="run"` and `id="evidence"`; dev `/` 200 | yes |
| 5 | Vite gates | typecheck PASS, build exit 0, `npm test` 62 (61/0/1), `test:browser` 28 passed | yes |

**Checkpoint B: NEXT_SHELL_IMPLEMENTED.**

## Checkpoint C

- **T014** `playwright.config.ts`: `devSmoke = BTA_DEV_SMOKE === '1'`; one `webServer`
  (`npx next build && npx next start --port ${port}` or `npx next dev --port ${port}`),
  `reuseExistingServer: false`, `timeout: 180_000`, no `env`/`distDir`; projects `chromium`
  (`testIgnore` prompt-api, `grepInvert: /@dev/`) + `prompt-api`, or only `chromium-dev`
  (`grep: /@dev/`). `outputDir` unchanged.
- **T015** `e2e/harness.spec.ts` `/harness/?provider=standin` → `/harness?provider=standin`,
  `/harness/` → `/harness`; `e2e/prompt-api.spec.ts` `/harness/?runner=playwright` →
  `/harness?runner=playwright` and header comment. No assertion changed.
- **T016** app test (a): waits for Run enabled, `countCreates`, then `creates === 1`; revision
  regex `^[0-9a-f]{40}(\+dirty)?$`; `akarisp`/`langchainCore`/`langgraph` equal the installed
  `node_modules` versions. No assertion removed.
- **T017** `npx playwright test --project=chromium -g "full eight-role|stand-in provider"` on
  `next build && next start`: 2 passed. Evidence:
  `evidence/next-standin-fixture-2026-09-29-c64021e-dirty.json`,
  `evidence/next-harness-standin-2026-09-29-c64021e-dirty.json` (revision
  `c64021e…+dirty`, expected: the shell is uncommitted). L1 digest pre = post.
- **T018** `scripts/compare-evidence.mjs`:
  - `--mode app` baseline vs Next app → `EQUIVALENT` (rc 0)
  - `--mode harness` baseline vs Next harness → `EQUIVALENT` (rc 0)
  - Sanity (scratch copies, not kept): an extra key, `logicalRequests` 16 and a quoted revision
    give 3 differences, rc 1; harness `S4_cancel.outcome` FAIL and `MODEL_AVAILABLE` give rc 1.

**Checkpoint C: DETERMINISTIC_EQUIVALENCE_PASS.**

## Checkpoint D

`npx playwright test --project=chromium` on `next build && next start`: **28 passed** (L1 digest
pre = post). Per group:

- **T019** Feature 004 app tests: (a) full eight-role, (b) Cancel during the analysts, (c) native
  BLOCKED, (d) createRuntime failure, (e) two consecutive runs: all PASS.
- **T020** Feature 005 L3: live success; the 11-case failure matrix (network, 401, 403, 429, 500,
  status ERROR, DELAYED, invalid price, one bar, non-JSON, empty key); acquisition timeout; Cancel
  during acquisition; Cancel during the graph; native + live BLOCKED; four mode URLs; key leakage:
  all PASS. `grep -rl l3-dummy-key-not-real test-results/` → 0. No `/api/market` (no route
  handler, T013). Note on wording: every live test routes non-localhost requests through
  `guardNetwork` (aborted), and `net.external` is **asserted** `[]` in test (a), live success and
  the 11 failure cases, exactly as on Vite; no assertion was added or removed here.
- **T021** harness on `/harness`: stand-in S1–S5/S7 PASS, S6 OBSERVED; native-unavailable
  BLOCKED; the F005-002 readiness wait (`#availability` contains `provider: `) unchanged.
- **T022** added `@dev stand-in + fixture under next dev (Strict Mode): one click = one runtime,
  one graph run` to `e2e/app.spec.ts` (creates 1, logicalRequests 8, nodeEvents 16, every node
  executions 1; waits only on Run enabled and `data-state="done"`).
- **T023** `BTA_DEV_SMOKE=1 npx playwright test --project=chromium-dev`: 1 passed; the webServer
  log (`DEBUG=pw:webserver`) shows only `next dev --port 5174`. `npm run test:browser` ×3: 28, 28,
  28 passed; each log shows only `npx next build && npx next start --port 5174` and 0 `next dev`
  lines. Digest pre = post each run.
- **T024** lifecycle (asserted by (b) and the live graph-stage cancel, both PASS on Next):
  caller outcome `cancelled` (the live one also `failure {inference, cancelled}`), both model
  requests end `cancelled`, `snapshotBeforeShutdown` `{ready,0,0}`, `settledBeforeShutdown`
  true, `snapshotAfterShutdown.state` `closed`. `components/Boot.tsx` has no effect cleanup (the
  effect returns nothing; grep for `return` finds only `return null` of the component) (INV-3).

**Checkpoint D: BROWSER_LIFECYCLE_EQUIVALENCE_PASS.**

## Checkpoint E

- **T025** dirty provenance: both T017 records carry
  `revision.browserTradingAgents = "c64021e3dfdac96a46d96fd00e3c564c0cc09fb4+dirty"` (HEAD +
  uncommitted shell). `next.config.ts` code-path list (line 11) contains `app components
  next.config.ts tsconfig.json`. Clean and doc-only cases: T031.
- **T026 M1** (static import of the browser entries in `components/Boot.tsx`, not committed):
  - static scan reports `components/Boot.tsx:2:import '../src/main.ts';` and
    `components/Boot.tsx:3:import '../harness/main.ts';`
  - `npm run next:build` rc 1 **after** "Compiled successfully" and "Finished TypeScript":
    `Error occurred prerendering page "/"`, `ReferenceError: location is not defined` at
    `src/main.ts:26:36` (`new URLSearchParams(location.search)`), i.e. the browser bootstrap
    evaluated on the server. No other failure.
  - restored from the copy: `cmp` identical; `git diff -- components | shasum` equal to the
    pre-mutation value; `next:build` rc 0 again (`/`, `/harness` static). **Effective.**
- **T027 M2** (`__BTA_REVISION__: JSON.stringify(revision)`, not committed): test (a) FAILS on
  the T016 assertion, `Received string: "\"c64021e…+dirty\""` vs `/^[0-9a-f]{40}(\+dirty)?$/`.
  Restored: `cmp` identical; test (a) 1 passed. **Effective.**
- **T028 M3** (`await runtime.shutdown()` moved before the settle poll in `src/main.ts`, not
  committed): (b) "Cancel during the analysts" and the live "Cancel during the graph" both FAIL on
  `expect(r.lifecycle.settledBeforeShutdown).toBe(true)` (received false). Restored: `cmp`
  identical; `shasum -a 256 src/main.ts` = T002 (`7a01cad2…`); `git diff -- src` empty; both
  tests 2 passed. **Effective.**
- **T029 pre-retirement gate** (L1 digest pre = post for every command: `diff=7d12451e58763a3f
  untracked=82940d1597e86b75`):

| Check | Result |
|---|---|
| `npm run next:typecheck` | rc 0 |
| `npm run next:build` | rc 0 |
| `npm test` | 62 (61 pass, 0 fail, 1 skip) |
| `npm run test:browser` (Next prod) | 28 passed |
| `BTA_DEV_SMOKE=1 npx playwright test --project=chromium-dev` | 1 passed |
| T013 static boundary scan | 0 |
| protected hashes `shasum -a 256 -c` | 63/63 OK |
| mutation residue | `cmp` Boot.tsx / next.config.ts / src/main.ts vs copies: identical; `src/main.ts` = T002 hash |
| test-results sentinel `l3-dummy-key-not-real` | 0 files |
| credential `git grep` | 2 lines, both the pattern's own documentation, no credential: `specs/005-…/verification.md:398` (historical table row naming `BTA_MASSIVE_KEY=<literal value>`, present at `c64021e`) and `specs/006-…/tasks.md:309` (the grep command itself); code, `app/`, `components/`, `next.config.ts`, `scripts/compare-evidence.mjs`, evidence: 0 |
| Vite path present | `index.html`, `vite.config.ts`, `vite` dependency and scripts unchanged |

**Checkpoint E: PROVENANCE_AND_MUTATIONS_PASS. State: MIGRATION_VALIDATED.** Next task: T030
(APPROVAL REQUIRED, commit), not executed.

## Checkpoint F

- **T030** (maintainer approved): commit `5eb4fc06f2c56e23d75222784f166ec6aa288b02` on
  `006-nextjs-application-shell` (not pushed). 27 files staged explicitly; `.claude/`,
  `.specify/*`, `CLAUDE.md`, `.local/`, `.next/`, `next-env.d.ts`, `test-results/` excluded.
  After the commit: `git status --porcelain -- <coexistence code paths>` empty; `src/main.ts`
  `7a01cad2…` and `harness/main.ts` `d9ec9319…` = T002; protected 63/63 OK; `index.html`,
  `vite.config.ts` and `vite` still present.
- **T031** at `5eb4fc0`: (1) `npx playwright test --project=chromium -g "full eight-role"` 1
  passed, revision `5eb4fc06f2c56e23d75222784f166ec6aa288b02` (no `+dirty`). (2) With a temporary
  line appended to this file (doc-only change, `git status` shows only it), the same test 1
  passed, revision still `5eb4fc0…` without `+dirty`; the file was restored from a copy. With
  T025, clean / doc-only / code-dirty all behave as under Vite.
- **T032** pre-retirement native gate (maintainer approved), at `5eb4fc06f2c56e23d75222784f166ec6aa288b02`:
  - command `npm run test:prompt-api -- -g "eight-role"`, 2026-09-29T04:00:02Z–04:01:58Z;
    webServer `npx next build && npx next start --port 5174` (no `next dev`); installed Google
    Chrome `channel: 'chrome'`, headless, as in Feature 005 T044. Chrome `--version`:
    **154.0.8037.58** (the record's reduced user agent shows `HeadlessChrome/154.0.0.0`; plan
    mentioned 153, the installed browser has since updated). No credential.
  - result: 1 passed (1.4 m). Evidence saved unedited (`cmp` identical to the test output):
    `evidence/real-browser-next-fixture-pre-retirement-2026-09-29-5eb4fc0.json`
    (sha256 `1eeb4681…c202520`).
  - validation (all PASS): `REAL_BROWSER_PROMPT_API`; provider `native`; availability
    `MODEL_AVAILABLE`; revision `5eb4fc06f2c56e23d75222784f166ec6aa288b02` without `+dirty`;
    `dataSource {mode: fixture, fixture: tradingagents-fixture@1}`; outcome `success`; 8/8 roles
    `done`, executions 1, modelRequests 1; `logicalRequests` 8, `fallbackRequests` 0;
    `snapshotBeforeShutdown` `{ready,0,0}`, `settledBeforeShutdown` true, `snapshotAfterShutdown`
    `{closed,0,0}`; no stand-in text; `Bearer`/`api.massive.com`/dummy key in the record: 0;
    graphMs 51363 (operational only).
    External market requests were not directly instrumented in this native run (fixture mode
    makes none by design); the record contains no Massive URL, but this is not a measured count.
  - after the run: `git status --porcelain -- <coexistence code paths>` empty; digest pre = post
    (both empty-diff). Only `verification.md`/`tasks.md` (outside the code paths) are uncommitted.
  - **State: PRE_RETIREMENT_NATIVE_PASS.** Vite still present; T033 not started.

## Checkpoint G

- **T033** retirement preflight (maintainer approved T033+): every migration-matrix row has a
  passing Next proof recorded above:

| Row | Guarantee | Next proof |
|---|---|---|
| 1–2 | success 8/8, 8/0; fan-out `{ready,1,1}` | T017 app (a), T018 `--mode app` EQUIVALENT, T019 |
| 3 | native unavailable → BLOCKED | T019 (c) |
| 4 | runtime-create failure | T019 (d) |
| 5 | cancel; `{ready,0,0}` before shutdown | T019 (b), T024, M3 (T028) |
| 6 | consecutive runs | T019 (e) |
| 7–12 | Feature 005 live success, 11 failures, timeout, cancels, native+live BLOCKED, four URLs, key leakage | T020 |
| 13 | harness S1–S7, native-unavailable BLOCKED | T017/T018 `--mode harness`, T021 |
| 14 | `npm test` 62 | T029 |
| 15 | revision clean / doc-only / `+dirty` | T016, T025, M2 (T027), T031 |
| 16 | installed-Chrome native + fixture | T032 PASS at `5eb4fc0` (final gate T042 pending) |
| 17 | no server evaluation of browser APIs | T013, M1 (T026) |
| 18 | one runtime per click under Strict Mode | T022, T023 |

  Also at preflight: protected hashes 63/63 OK; `src/main.ts`/`harness/main.ts` = T002; mutation
  residue 0 (T029); coexistence code paths clean at `5eb4fc0`. **PASS**: 18/18.
- **T034** `git rm index.html vite.config.ts`; `npm uninstall vite` (lock drops `vite` and only its
  own tree: rolldown + bindings, lightningcss + bindings, postcss, picomatch, fdir, tinyglobby,
  fsevents, @oxcproject/types; no package added; akarisp/@langchain/*/next/react versions
  unchanged). `harness/index.html` and every INV-1 file kept.
- **T035** scripts: `typecheck` = `next typegen && tsc --noEmit`, `build` = `next build`, `start`
  = `next start`, `dev` = `next dev`, `test:browser:dev` = `BTA_DEV_SMOKE=1 playwright test
  --project=chromium-dev`; `harness` and the four `next:*` removed; `test`, `test:browser`,
  `test:prompt-api`, `prepare:prompt-api` unchanged.
- **T036** `next.config.ts` code paths: `src test harness e2e app components package.json
  package-lock.json next.config.ts tsconfig.json playwright.config.ts` (post-retirement list, as
  in tasks INV-6 / contract). `tsconfig.json` `"*.config.ts"` still covers `next.config.ts` and
  `playwright.config.ts`.
- **T037** `docs/testing.md`: command table (production server gate, `test:browser:dev`, `dev` on
  `http://localhost:3000/`, `/harness`), new "Application shell (Feature 006)" section (Vite
  retired; Boot/effect boundary; `/harness` canonical, `harness/index.html` historical; live path
  still client-side, no `/api/market`, server data boundary = Feature 007; one server per
  Playwright run; default `.next`, one session per checkout; raw-string revision; dev hot-reload
  caveat); key note mentions `NEXT_PUBLIC_*`.
- **T038** audit: `git ls-files index.html vite.config.ts` 0; no `vite` in `package.json`,
  `playwright.config.ts`, `next.config.ts`, `tsconfig.json`; `package-lock.json` has no
  `node_modules/vite`; no `vite`/`VITE_`/`import.meta.env` in `src test harness e2e app
  components`; `docs/testing.md` mentions Vite only as retired/history (2 lines); specs 001–005
  unchanged vs HEAD; `harness/index.html` present; one canonical app page (`app/page.tsx`).

**Checkpoint G: VITE_RETIRED** (not Feature complete).

## Checkpoint H (up to T040)

- **T039** post-retirement gate, fresh install (`rm -rf node_modules .next next-env.d.ts && npm
  ci`; pre-retirement results not reused). L1 digest over the post-retirement code paths, pre =
  post for every command (`diff=5630646533a99a55 untracked=da39a3ee5e6b4b0d`):

| Check | Result |
|---|---|
| `npm ls --depth=0` | akarisp 0.1.0-alpha.2, @langchain/core 1.2.13, @langchain/langgraph 1.4.18, next 16.3.6, react/react-dom 19.3.0, @types/react(-dom) 19.3.0, @playwright/test 1.63.0, @types/node 22.20.4, typescript 5.9.3; no `vite`; no extraneous |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | rc 0 |
| `npm run build` | rc 0; `/`, `/harness` static |
| `npm start -- --port 5180` | `/` 200, `/harness` 200 |
| `npm test` | 62 (61 pass, 0 fail, 1 skip) |
| `npm run test:browser` ×3 (production server) | 28, 28, 28 passed (includes app (a)–(e), Feature 005 L3, harness; revision regex, versions, creates 1) |
| `npm run test:browser:dev` | 1 passed |
| static boundary scan; route handlers; root/`src` middleware/proxy | 0; 0; 0 |
| protected hashes | 63/63 OK; `src/main.ts` `7a01cad2…`, `harness/main.ts` `d9ec9319…` = T002 |
| test-results sentinel | 0 |
| credential `git grep` | 3 lines, all documentation of the pattern (Feature 005 table row, tasks.md command, this file's T029 row); no credential |

  Note (ephemeral evidence): the T039 production assertions (including app (a)'s revision
  format, versions and creates 1) PASSED when they ran. The following `test:browser:dev` run
  cleared `test-results/5174`, so no T039 app or harness `evidence.json` exists now, and none is
  retained or claimed as evidence here (the working tree was `5eb4fc0+dirty` at the time). The
  final canonical native evidence is produced fresh by T042.
  State: **IMPLEMENTATION_COMPLETE** (automated). Not Feature complete: T041–T044 remain.
- **T040** `docs/roadmap.md`: Feature 006 "implementation complete … final native gate pending
  (T042)"; Feature 007 `007-upstream-server-data-boundary` is the next candidate (not started);
  intended-end-state line updated (Vite retired).

Next: T041 (APPROVAL REQUIRED, final commit), not executed.
