// DETERMINISTIC_TEST: the Feature 004 role graph (real LangGraph '/web' entry) → real AkariChatModel →
// fake Runtime. No AkariSP runtime, no provider, no browser. G1–G16 of specs/004…/contracts/graph.md.
// Assertions touch only fake output tokens (out-*), fixture sentinels (M1/N1…) and request structure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskError, type Runtime, type TaskResult } from 'akarisp';
import { AkariChatModel } from '../src/integration/akari-chat-model.ts';
import { FIXTURE } from '../src/graph/trading-fixture.ts';
import { buildTradingGraph, ROLES, type NodeEvent, type NodeName } from '../src/graph/trading-graph.ts';

type Message = { role: string; content: string };
type Call = {
  node: NodeName;
  input: Message[];
  content: string;
  signal?: AbortSignal;
  resolve: (output: string) => void;
  reject: (error: unknown) => void;
  outcome?: 'resolved' | unknown;
};
// What the fake answers for a call: a string resolves it, an Error rejects it, undefined holds it.
type Answer = (call: Call) => string | Error | undefined;

const nodeOfPrompt = (content: string) => {
  const role = ROLES.find((r) => content.startsWith(`You are the ${r.label}.`));
  assert.ok(role, `unrecognised prompt: ${content.slice(0, 60)}`);
  return role.node;
};
const token = (node: NodeName) => `out-${ROLES.find((r) => r.node === node)!.writes}`;
const answer: Answer = (call) => token(call.node);

// Feature 003 fake Runtime: one deferred per run(); rejects TaskError('cancelled') when its signal
// aborts (immediately if already aborted); bounded settlement wait.
function fakeRuntime(initial?: Answer) {
  const calls: Call[] = [];
  let auto = initial;
  const apply = (call: Call) => {
    const a = auto?.(call);
    if (a instanceof Error) call.reject(a);
    else if (a !== undefined) call.resolve(a);
  };
  const runtime = {
    run: (input: Message[], options?: { signal?: AbortSignal }) =>
      new Promise<TaskResult>((res, rej) => {
        const signal = options?.signal;
        const content = input.map((m) => m.content).join('\n');
        const call: Call = {
          node: nodeOfPrompt(content), input, content, signal,
          resolve: (output) => {
            if (call.outcome) return;
            call.outcome = 'resolved';
            res({ output, timing: { total: 1 } } as TaskResult);
          },
          reject: (error) => {
            if (call.outcome) return;
            call.outcome = error;
            rej(error);
          },
        };
        calls.push(call);
        const cancel = () => call.reject(new TaskError('cancelled', { total: 1 } as TaskResult['timing'], signal?.reason));
        if (signal?.aborted) return cancel();
        signal?.addEventListener('abort', cancel, { once: true });
        apply(call);
      }),
    snapshot: () => ({ state: 'ready', active: 0, queued: 0, limit: 1, queueCapacity: 32 }),
    shutdown: async () => {},
  } as unknown as Runtime;

  // Bounded: a run() that never settles is an orphaned AkariSP task, reported as a failure.
  async function settled(ms = 2000) {
    const end = Date.now() + ms;
    while (calls.some((c) => !c.outcome)) {
      if (Date.now() > end) assert.fail('run() not settled — orphaned');
      await new Promise((r) => setTimeout(r, 5));
    }
  }
  // Switch answering on (or change it) and apply it to calls already waiting.
  const setAuto = (a: Answer) => {
    auto = a;
    for (const c of calls) if (!c.outcome) apply(c);
  };
  return { runtime, calls, settled, setAuto };
}

async function until(predicate: () => boolean, what: string, ms = 2000) {
  const end = Date.now() + ms;
  while (!predicate()) {
    if (Date.now() > end) assert.fail(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}
const ticks = () => new Promise((r) => setTimeout(r, 30));

function setup(auto?: Answer) {
  const fake = fakeRuntime(auto);
  const model = new AkariChatModel({ runtime: fake.runtime });
  const events: NodeEvent[] = [];
  const { graph, modelRequests } = buildTradingGraph(model, (e) => events.push(e));
  const count = (node: NodeName, event: NodeEvent['event'] = 'start') =>
    events.filter((e) => e.node === node && e.event === event).length;
  const call = (node: NodeName) => fake.calls.find((c) => c.node === node);
  const request = (node: NodeName) => call(node)!.content;
  return { ...fake, model, events, graph, modelRequests, count, call, request };
}

const OPTS = { timeout: 10_000 };
const DOWNSTREAM_OF_ANALYSTS: NodeName[] = ['bullResearcher', 'bearResearcher', 'researchManager', 'trader', 'riskReviewer', 'finalDecisionMaker'];
const SENTINELS = ['(market fact M1)', '(market fact M2)', '(news fact N1)', '(news fact N2)'];
const has = (text: string, parts: string[]) => { for (const p of parts) assert.ok(text.includes(p), `missing ${p}`); };
const lacks = (text: string, parts: string[]) => { for (const p of parts) assert.ok(!text.includes(p), `must not contain ${p}`); };
const seqOf = (events: NodeEvent[], node: NodeName, event: NodeEvent['event']) =>
  events.find((e) => e.node === node && e.event === event)!.seq;

// Role table ------------------------------------------------------------------------------------

test('role table: 8 roles, unique nodes and outputs, reads exactly as contracted', () => {
  const contract: Record<NodeName, string[]> = {
    marketAnalyst: ['subject', 'marketFacts'],
    newsAnalyst: ['subject', 'newsFacts'],
    bullResearcher: ['subject', 'marketReport', 'newsReport'],
    bearResearcher: ['subject', 'marketReport', 'newsReport', 'bullArgument'],
    researchManager: ['subject', 'bullArgument', 'bearArgument'],
    trader: ['subject', 'researchDecision', 'marketReport'],
    riskReviewer: ['subject', 'traderPlan', 'researchDecision', 'marketReport', 'newsReport'],
    finalDecisionMaker: ['subject', 'riskReview', 'researchDecision', 'traderPlan'],
  };
  assert.equal(ROLES.length, 8);
  assert.equal(new Set(ROLES.map((r) => r.node)).size, 8);
  assert.deepEqual(new Set(ROLES.map((r) => r.writes)), new Set(['marketReport', 'newsReport', 'bullArgument',
    'bearArgument', 'researchDecision', 'traderPlan', 'riskReview', 'finalDecision']));
  for (const r of ROLES) assert.deepEqual([...r.reads].sort(), [...contract[r.node]].sort(), r.node);
});

// US1 -------------------------------------------------------------------------------------------

test('G1 success: nine fields filled by their own roles; each role executes once', OPTS, async () => {
  const s = setup(answer);
  const state = await s.graph.invoke({ input: FIXTURE });
  assert.deepEqual(state.input, FIXTURE);
  for (const r of ROLES) {
    assert.equal(state[r.writes], `out-${r.writes}`, r.writes);
    assert.equal(s.count(r.node), 1, r.node);
  }
});

test('G10 accounting: 8 logical requests = Σ node requests = run() calls; 0 fallbacks; one user message each', OPTS, async () => {
  const s = setup(answer);
  await s.graph.invoke({ input: FIXTURE });
  const nodeRequests = Object.values(s.modelRequests).reduce((a, b) => a + b, 0);
  assert.equal(s.model.logicalRequests, 8); // bridge counter, measured
  assert.equal(nodeRequests, s.model.logicalRequests);
  assert.equal(s.calls.length, s.model.logicalRequests);
  assert.equal(s.calls.length - nodeRequests, 0); // no fallback path: observed fallbacks 0
  for (const c of s.calls) assert.deepEqual(c.input.map((m) => m.role), ['user'], c.node);
});

test('G16 empty analyst output: News answers "" → run completes; Bull still gets the News label', OPTS, async () => {
  const s = setup((c) => (c.node === 'newsAnalyst' ? '' : answer(c)));
  const state = await s.graph.invoke({ input: FIXTURE });
  assert.equal(state.newsReport, '');
  assert.ok(state.finalDecision);
  assert.match(s.request('bullResearcher'), /^News report: $/m);
});

// US2 -------------------------------------------------------------------------------------------

test('G2 analyst independence: each analyst sees only its own facts and no role output', OPTS, async () => {
  const s = setup(answer);
  await s.graph.invoke({ input: FIXTURE });
  const market = s.request('marketAnalyst');
  const news = s.request('newsAnalyst');
  has(market, ['(market fact M1)', '(market fact M2)', FIXTURE.subject]);
  lacks(market, ['(news fact N1)', '(news fact N2)', 'out-']);
  has(news, ['(news fact N1)', '(news fact N2)', FIXTURE.subject]);
  lacks(news, ['(market fact M1)', '(market fact M2)', 'out-']);
});

test('G3 fan-out: both analyst requests are submitted before either completes', OPTS, async () => {
  const s = setup();
  const run = s.graph.invoke({ input: FIXTURE });
  await until(() => s.calls.length === 2, 'two analyst requests');
  // Graph-level submission only; says nothing about provider/native parallelism.
  assert.deepEqual(s.calls.map((c) => c.node).sort(), ['marketAnalyst', 'newsAnalyst']);
  assert.ok(s.calls.every((c) => !c.outcome));
  s.setAuto(answer);
  await run;
});

for (const first of ['marketAnalyst', 'newsAnalyst'] as const) {
  const second = first === 'marketAnalyst' ? 'newsAnalyst' : 'marketAnalyst';
  test(`G4 fan-in barrier (${first} first): Bull waits for ${second}, then runs once`, OPTS, async () => {
    const s = setup();
    const run = s.graph.invoke({ input: FIXTURE });
    await until(() => s.calls.length === 2, 'two analyst requests');
    s.call(first)!.resolve(token(first));
    await until(() => s.count(first, 'done') === 1, `${first} done`);
    await ticks();
    assert.equal(s.count('bullResearcher'), 0, `Bull must not start while ${second} is held`);
    assert.equal(s.calls.length, 2);
    s.call(second)!.resolve(token(second));
    await until(() => s.count('bullResearcher') === 1, 'Bull start');
    s.setAuto(answer);
    await run;
    assert.equal(s.count('bullResearcher'), 1);
  });
}

// US3 -------------------------------------------------------------------------------------------

test('G5 Bull, then Bear: Bull reads both reports; Bear reads the actual Bull output', OPTS, async () => {
  const s = setup((c) => (c.node === 'bullResearcher' ? undefined : answer(c)));
  const run = s.graph.invoke({ input: FIXTURE });
  await until(() => !!s.call('bullResearcher'), 'Bull request');
  const bull = s.request('bullResearcher');
  has(bull, ['out-marketReport', 'out-newsReport', 'has not spoken yet']);
  lacks(bull, [...SENTINELS, 'out-bearArgument']);
  await ticks();
  assert.equal(s.call('bearResearcher'), undefined, 'no Bear request while Bull is unresolved');
  s.call('bullResearcher')!.resolve('bull-said-7f3a'); // a value only Bull produced
  s.setAuto(answer);
  await run;
  assert.ok(seqOf(s.events, 'bearResearcher', 'start') > seqOf(s.events, 'bullResearcher', 'done'));
  const bear = s.request('bearResearcher');
  has(bear, ['bull-said-7f3a', 'out-marketReport', 'out-newsReport']);
  lacks(bear, SENTINELS);
});

test('G6 Research Manager: reads Bull and Bear arguments only', OPTS, async () => {
  const s = setup(answer);
  await s.graph.invoke({ input: FIXTURE });
  const rm = s.request('researchManager');
  has(rm, ['out-bullArgument', 'out-bearArgument']);
  lacks(rm, ['out-marketReport', 'out-newsReport', ...SENTINELS]);
});

// US4 -------------------------------------------------------------------------------------------

test('G7 Trader: after Research Manager; reads research decision + market report only', OPTS, async () => {
  const s = setup(answer);
  await s.graph.invoke({ input: FIXTURE });
  assert.ok(seqOf(s.events, 'trader', 'start') > seqOf(s.events, 'researchManager', 'done'));
  const trader = s.request('trader');
  has(trader, ['out-researchDecision', 'out-marketReport']);
  lacks(trader, ['out-newsReport', 'out-bullArgument', 'out-bearArgument', ...SENTINELS]);
});

test('G8 Risk Reviewer: after Trader; reads trader plan, research decision, both reports', OPTS, async () => {
  const s = setup(answer);
  await s.graph.invoke({ input: FIXTURE });
  assert.ok(seqOf(s.events, 'riskReviewer', 'start') > seqOf(s.events, 'trader', 'done'));
  const risk = s.request('riskReviewer');
  has(risk, ['out-traderPlan', 'out-researchDecision', 'out-marketReport', 'out-newsReport']);
  lacks(risk, ['out-bullArgument', 'out-bearArgument', ...SENTINELS]);
});

test('G9 Final Decision: after Risk Reviewer; reads risk review, research decision, trader plan', OPTS, async () => {
  const s = setup(answer);
  const state = await s.graph.invoke({ input: FIXTURE });
  assert.ok(seqOf(s.events, 'finalDecisionMaker', 'start') > seqOf(s.events, 'riskReviewer', 'done'));
  const final = s.request('finalDecisionMaker');
  has(final, ['out-riskReview', 'out-researchDecision', 'out-traderPlan']);
  lacks(final, ['out-marketReport', 'out-newsReport', 'out-bullArgument', 'out-bearArgument', ...SENTINELS]);
  assert.equal(state.finalDecision, 'out-finalDecision');
});

// US5 -------------------------------------------------------------------------------------------

// Regression A: fails if a node stops forwarding config.signal ('/web' entry = no implicit propagation).
test('G11 signal forwarding: every run() receives a signal, and it aborts with the caller', OPTS, async () => {
  const s = setup();
  const controller = new AbortController();
  const run = s.graph.invoke({ input: FIXTURE }, { signal: controller.signal });
  await until(() => s.calls.length === 2, 'two analyst requests');
  for (const c of s.calls) assert.ok(c.signal, `${c.node}: run() received no AbortSignal — node did not forward config.signal`);
  controller.abort(new Error('caller abort'));
  await assert.rejects(run);
  for (const c of s.calls) assert.equal(c.signal!.aborted, true);
  await s.settled();
});

test('G12 cancel during analysts: caller rejects, then (separately) both settle cancelled; nothing downstream', OPTS, async () => {
  const s = setup();
  const controller = new AbortController();
  const run = s.graph.invoke({ input: FIXTURE }, { signal: controller.signal });
  await until(() => s.calls.length === 2, 'two analyst requests');
  controller.abort(new Error('caller abort'));
  let result: unknown;
  await assert.rejects(run.then((r) => { result = r; }));
  assert.equal(result, undefined, 'no finalDecision after abort');
  await s.settled(2000); // caller rejection is not settlement
  for (const c of s.calls) assert.ok(c.outcome instanceof TaskError && c.outcome.code === 'cancelled', c.node);
  for (const n of DOWNSTREAM_OF_ANALYSTS) assert.equal(s.count(n), 0, n);
});

test('G13 cancel while Trader runs: Trader settles cancelled; Risk Reviewer and Final Decision never run', OPTS, async () => {
  const s = setup((c) => (c.node === 'trader' ? undefined : answer(c)));
  const controller = new AbortController();
  const run = s.graph.invoke({ input: FIXTURE }, { signal: controller.signal });
  await until(() => !!s.call('trader'), "Trader's run() call"); // Trader genuinely in progress
  controller.abort(new Error('caller abort'));
  let result: unknown;
  await assert.rejects(run.then((r) => { result = r; }));
  assert.equal(result, undefined, 'no finalDecision after abort');
  await s.settled(2000);
  const trader = s.call('trader')!;
  assert.ok(trader.outcome instanceof TaskError && trader.outcome.code === 'cancelled');
  assert.equal(s.count('riskReviewer'), 0);
  assert.equal(s.count('finalDecisionMaker'), 0);
});

test('G14 News fails: caller gets the same error; Bull and everything after never run', OPTS, async (t) => {
  const s = setup();
  const err = new TaskError('failed', { total: 1 } as TaskResult['timing'], new Error('controlled'));
  const run = s.graph.invoke({ input: FIXTURE });
  await until(() => s.calls.length === 2, 'two analyst requests');
  s.call('newsAnalyst')!.reject(err);
  await assert.rejects(run, (e) => e === err);
  for (const n of DOWNSTREAM_OF_ANALYSTS) assert.equal(s.count(n), 0, n);
  const market = s.call('marketAnalyst')!;
  market.resolve(token('marketAnalyst')); // release explicitly; no-op if LangGraph already cancelled it
  await s.settled(2000);
  t.diagnostic(`Market outcome: ${market.outcome === 'resolved' ? 'done' : (market.outcome as TaskError).code}`);
});

test('G15 Trader fails: caller gets the same error; Risk Reviewer and Final Decision never run', OPTS, async () => {
  const err = new TaskError('failed', { total: 1 } as TaskResult['timing'], new Error('controlled'));
  const s = setup((c) => (c.node === 'trader' ? err : answer(c))); // failure injected at Trader only
  await assert.rejects(s.graph.invoke({ input: FIXTURE }), (e) => e === err);
  assert.equal(s.count('riskReviewer'), 0);
  assert.equal(s.count('finalDecisionMaker'), 0);
  for (const n of ['marketAnalyst', 'newsAnalyst', 'bullResearcher', 'bearResearcher', 'researchManager'] as const) {
    assert.equal(s.count(n, 'done'), 1, n); // observation: earlier roles completed
  }
});
