# BrowserTradingAgents — Final Report (research phase)

**Status: research phase complete, archived 2026-10-01.** The code, fixtures and evidence stay as they are. Details
live in each Feature's `specs/NNN-*/verification.md`; this report only summarises and links.

## Purpose

1. **Dogfood AkariSP** (the constitution's core aim): build a TradingAgents-style multi-agent application that runs
   in the browser and use it as a real workload for AkariSP's public API, lifecycle and concurrency model.
2. **Measure how far a browser LLM goes** (Gemini Nano through the Chrome Prompt API) on a grounded, portfolio-aware
   version of that workload, with a deterministic checker as the judge of grounding.

## Conclusion (stated narrowly)

> On Gemini Nano and BTA's portfolio-question workload, the fixed eight-role multi-agent architecture did not
> demonstrate a grounding benefit over a single role that justifies its latency cost (about 7x). As an observation
> not tested against a pre-registered rule, the kind of error — more than the amount — appeared to differ with the
> role structure.

Not a claim that browser LLMs are useless, and not a claim about trading quality (constitution VIII).

## What the Features established

| Area | Result | Features |
|---|---|---|
| AkariSP integration | A thin LangChain.js / LangGraph.js bridge was enough; parallel branches, fan-in, cancel and cleanup work on the real Prompt API. Two integration rules were found and kept application-side: forward the graph's AbortSignal into nodes (O-1) and check AkariSP settlement before `shutdown()` (O-2). **AkariSP source changes: 0** across all Features. | 002, 003, 004, 006 |
| Runtime reuse | Keeping one runtime per page session is safe and cuts overview time about 8–11 %; preparation saving is ≈ 0 after the first model load. Opt-in, default off. | 012 |
| Per-call constraints | A digit-ban `responseConstraint` removed format violations but collapsed 9 / 33 answers; AkariSP needs no per-task option path (NO_CHANGE). | 013 |
| Data boundary | Server-side market boundary with an upstream-compatible contract (Yahoo), live quotes in the fixture's fact shape, and a local read-only Toss provider with no order path. | 005, 007, 014, 015 |
| Answer format | Numbers by reference cut unsupported numbers per answer (0.283 → 0.051) but the model mostly cites references instead of substituting them (78.8 % format violations). Default stays plain. | 013 |
| Grounding checker | Deterministic claims with metric, basis and direction: 26 / 26 on frozen fixtures but 9–17 % mismatch precision on real answers (016); the pre-registered held-out threshold was not met (017): false alarms fell 11 → 3, yet 8 of 9 meaning errors whose values exist in the facts were missed. The checker catches wrong values (e.g. 10x amounts) and misses paraphrased meanings. | 010, 013, 016, 017 |
| Role structure | 660 native answers, eight roles vs one role, two number modes, five repetitions, pre-registered: **H1 not established** (the blind audit failed its reliability bar); the rule would have given no difference anyway; checker metrics no difference in both modes; one role ≈ 7x faster. | 018 |
| UI | Korean JRPG shell, browser-only portfolio and paper-trade ledger, own office renderer drawn from the execution view state. | 008, 009, 011 |

## Compared with the TradingAgents paper (arXiv 2412.20138)

The paper compares its system with rule-based strategies (Buy & Hold, MACD, KDJ+RSI, ZMR, SMA) over about three
months, with no single-LLM baseline, no ablation of roles or debate and no repeated runs. It shows that the system beat
those rules in that window; it does not isolate the effect of the multi-agent structure. Feature 018 asked that
question directly (same model, same facts, eight roles vs one role) and could not establish an effect. The two are not
directly comparable: different models (GPT-4o family vs Gemini Nano) and different targets (returns vs grounding).

## Limitations

- One model (Gemini Nano, Chrome 152–154), one device, one fictional portfolio fixture and one 25-question set.
- Run-to-run variation is large (up to 12 percentage points between two repetitions of the same configuration);
  five repetitions of 33 answers still leave small effects undetectable.
- Hand audits were done by one auditor (Claude); the only reliability check (018) failed its bar, with every
  disagreement in one direction and at least part of it caused by the conversational re-judging procedure (F018-R1).
- The checker cannot read amounts written in Hangul numerals (F018-R2) and misses most paraphrased meaning errors
  (F017-R5).
- No trading-outcome metric: no look-ahead-free historical window exists (constitution VIII, XV).
- The eight-role graph is an adaptation of TradingAgents v0.5.1 (parallel analysts, no tools, fixture facts), not a
  replica.

## Method kept for other projects

- Pre-register hypotheses, metrics, sample size and decision rules before results; freeze rules with hashes; keep
  tuning sets apart from held-out sets; hash blind judgements before joining keys or checker output; report "not met"
  and "not established" as results (constitution XIV, XV).
- Porting a structure designed for large models onto a small model does not by itself help; measure the bottleneck
  first.
- Deterministic verification is necessary, and rule-based verification alone has clear limits.
- For hand audits: a per-item form, two independent auditors and a calibration round before the sample.

## Reproduction

- Commands, flags and scripts: [docs/testing.md](docs/testing.md).
- Evidence, hashes and findings per Feature: `specs/NNN-*/verification.md` (e.g. [018](specs/018-effectiveness-benchmark/verification.md)).
- Governance: [constitution](.specify/memory/constitution.md) 1.2.0; roadmap and decisions: [docs/roadmap.md](docs/roadmap.md);
  research notes: [docs/research/](docs/research/).

## Conditions for reopening

1. **A larger browser model** (e.g. WebLLM with a 7–8B model on WebGPU, or a stronger built-in model): re-run the
   Feature 018 frame with only the model changed.
2. **The F018-R3 hypothesis** ("role structure changes the kind of error"), pre-registered on new data with a new,
   calibrated two-auditor procedure.
3. **A look-ahead-free historical fact window**, which would allow paper-trading outcomes as pre-registered
   experiment metrics (constitution VIII).
4. **Much faster inference**, making larger samples practical.
5. Open candidates left on the roadmap: trust calibration in the UI; Features 009 and 010 rows still marked in
   progress there.
