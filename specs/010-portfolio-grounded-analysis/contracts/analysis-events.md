# Contract: starting a portfolio run (shell ↔ src/main.ts)

- **`bta-analyze`** — a `CustomEvent` dispatched by the shell on `#run`:
  `detail = { input: TradingFixture /* with holdingFacts, question */, analysis: { holding, question, factSetId, facts } }`.
  `src/main.ts` ignores it while a run is in progress (Run disabled), otherwise runs exactly as a click, with this
  input and `dataSource: { mode: 'portfolio-fixture', fixture: 'portfolio-fixture@1' }`. No market-data request.
- **`bta-done`** — a `CustomEvent` dispatched by `src/main.ts` on `#run` after writing the record:
  `detail = record` (the same object written to `#evidence`). The shell uses it to advance an overview.
- A click on `#run` keeps today's behaviour (demo fixture or `?data=live`), unchanged evidence.
- Cancel: the shell sets its overview `cancelled` flag, then clicks `#cancel` (the existing controller).
- Per run: 8 logical requests; runtime created and shut down inside the run; settlement before shutdown.
- Evidence `analysis` block (portfolio runs only): see data-model.md; `nodes[*].reads` lists the keys actually read.
