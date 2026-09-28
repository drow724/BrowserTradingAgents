// NODE_INTEGRATION (stand-in): the Feature 004 role graph (real LangGraph '/web' entry) → real
// AkariChatModel → real `akarisp@0.1.0-alpha.2` runtime → stand-in `globalThis.LanguageModel`.
// Not browser evidence, not Prompt API evidence. L1–L6 of specs/004…/contracts/graph.md.
// Role provenance is proven deterministically (test/trading-graph.test.ts); this file is lifecycle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, TaskError, type Runtime } from 'akarisp';
import { AkariChatModel, type BridgeEvent } from '../src/integration/akari-chat-model.ts';
import { FIXTURE, type TradingFixture } from '../src/graph/trading-fixture.ts';
import { buildTradingGraph, ROLES, type NodeEvent, type NodeName } from '../src/graph/trading-graph.ts';
import { installStandIn } from './standin.ts';

const RUNTIME_OPTIONS = { limit: 1, queueCapacity: 32 };
const OPTS = { timeout: 15_000 };
const AFTER_ANALYSTS: NodeName[] = ['bullResearcher', 'bearResearcher', 'researchManager', 'trader', 'riskReviewer', 'finalDecisionMaker'];

async function until(predicate: () => boolean, what: string, ms = 2000) {
  const end = Date.now() + ms;
  while (!predicate()) {
    if (Date.now() > end) assert.fail(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}

// Settlement = AkariSP drained its work by itself: still `ready`, 0 active, 0 queued. Must be
// observed BEFORE shutdown(), which would otherwise cancel remaining work and read closed 0/0.
const settled = (runtime: Runtime) => until(() => {
  const s = runtime.snapshot();
  return s.state === 'ready' && s.active === 0 && s.queued === 0;
}, 'AkariSP work did not settle before shutdown');

// One graph run = one runtime + one model for all eight roles; always shut down.
async function owner(fn: (ctx: {
  runtime: Runtime;
  model: AkariChatModel;
  graph: ReturnType<typeof buildTradingGraph>['graph'];
  bridge: BridgeEvent[];
  count: (node: NodeName, event?: NodeEvent['event']) => number;
  standin: ReturnType<typeof installStandIn>;
  onNode: { fn?: (e: NodeEvent) => void };
}) => Promise<void>) {
  const standin = installStandIn();
  const runtime = await createRuntime(RUNTIME_OPTIONS);
  const bridge: BridgeEvent[] = [];
  const nodes: NodeEvent[] = [];
  const onNode: { fn?: (e: NodeEvent) => void } = {};
  const model = new AkariChatModel({ runtime, onEvent: (e) => bridge.push(e) });
  const { graph } = buildTradingGraph(model, (e) => { nodes.push(e); onNode.fn?.(e); });
  const count = (node: NodeName, event: NodeEvent['event'] = 'start') =>
    nodes.filter((e) => e.node === node && e.event === event).length;
  try {
    await fn({ runtime, model, graph, bridge, count, standin, onNode });
  } finally {
    standin.resume();
    await runtime.shutdown();
    standin.uninstall();
  }
}

const starts = (bridge: BridgeEvent[]) => bridge.filter((e) => e.event === 'start').length;
const ends = (bridge: BridgeEvent[]) =>
  bridge.filter((e) => e.event !== 'start').map((e) => (e.event === 'error' ? `error:${e.errorKind}` : 'done'));

// The bridge emits `start` before calling runtime.run(), so wait (≤ 1 s) until both analyst requests
// are inside AkariSP before reading the fan-out snapshot. Measured, never adjusted.
async function fanOutSnapshot(runtime: Runtime, bridge: BridgeEvent[]) {
  await until(() => starts(bridge) === 2, 'both analyst requests to start');
  const t0 = Date.now();
  let s = runtime.snapshot();
  while (s.active + s.queued !== 2 && Date.now() - t0 < 1000) {
    await new Promise((r) => setTimeout(r, 5));
    s = runtime.snapshot();
  }
  return { snapshot: s, pollMs: Date.now() - t0 };
}

test('L1 eight roles on the real runtime: 8 logical requests, ready 0/0 before shutdown', OPTS, () =>
  owner(async ({ runtime, model, graph, bridge, count }) => {
    const state = await graph.invoke({ input: FIXTURE });
    for (const r of ROLES) {
      assert.match(state[r.writes], /^stand-in reply to: /, r.writes);
      assert.equal(count(r.node, 'done'), 1, r.node);
    }
    assert.equal(model.logicalRequests, 8); // measured by the bridge, one model for all roles
    assert.equal(starts(bridge), 8);
    assert.deepEqual(ends(bridge), Array(8).fill('done'));
    // No fallback path: logical requests == role executions, observed fallbacks 0.
    assert.equal(model.logicalRequests - ROLES.reduce((n, r) => n + count(r.node), 0), 0);
    await settled(runtime);
    assert.deepEqual(runtime.snapshot(), { state: 'ready', active: 0, queued: 0, ...RUNTIME_OPTIONS });
  }));

test('L2 analyst fan-out reaches the AkariSP queue: active 1, queued 1 under limit 1', OPTS, (t) =>
  owner(async ({ runtime, graph, bridge, standin }) => {
    standin.hold();
    const run = graph.invoke({ input: FIXTURE });
    const { snapshot, pollMs } = await fanOutSnapshot(runtime, bridge);
    t.diagnostic(`fanOutSnapshot ${JSON.stringify(snapshot)} after ${pollMs} ms poll`);
    // Graph fan-out + AkariSP backpressure only; native-provider concurrency is not observed.
    assert.deepEqual(snapshot, { state: 'ready', active: 1, queued: 1, ...RUNTIME_OPTIONS });
    standin.resume();
    await run;
    await settled(runtime);
  }));

// Regression B: settlement is asserted on a `ready` runtime before shutdown().
test('L3 abort during analysts: caller rejects; nothing downstream; AkariSP settles before shutdown', OPTS, (t) =>
  owner(async ({ runtime, graph, bridge, count, standin }) => {
    standin.hold();
    const controller = new AbortController();
    const run = graph.invoke({ input: FIXTURE }, { signal: controller.signal });
    const { snapshot } = await fanOutSnapshot(runtime, bridge);
    assert.deepEqual([snapshot.active, snapshot.queued], [1, 1]);
    controller.abort(new Error('caller abort'));
    let result: unknown;
    await assert.rejects(run.then((r) => { result = r; }));
    assert.equal(result, undefined, 'no finalDecision after abort');
    // Separately from the caller's rejection: AkariSP drains on its own (stand-in still held).
    await settled(runtime);
    assert.deepEqual(ends(bridge), ['error:cancelled', 'error:cancelled']);
    for (const n of AFTER_ANALYSTS) assert.equal(count(n), 0, n);
    t.diagnostic(`request outcomes ${JSON.stringify(ends(bridge))}`);
    await runtime.shutdown();
    assert.deepEqual(runtime.snapshot(), { state: 'closed', active: 0, queued: 0, ...RUNTIME_OPTIONS });
  }));

test('L4 abort while Trader waits in the provider: Risk/Final never run; settles before shutdown', OPTS, (t) =>
  owner(async ({ runtime, graph, bridge, count, standin, onNode }) => {
    onNode.fn = (e) => { if (e.node === 'trader' && e.event === 'start') standin.hold(); };
    const controller = new AbortController();
    const run = graph.invoke({ input: FIXTURE }, { signal: controller.signal });
    const t0 = Date.now();
    await until(() => standin.waitingPrompts() === 1, "Trader's prompt waiting in the provider"); // bounded 2 s
    t.diagnostic(`Trader waiting after ${Date.now() - t0} ms`);
    controller.abort(new Error('caller abort'));
    let result: unknown;
    await assert.rejects(run.then((r) => { result = r; }));
    assert.equal(result, undefined, 'no finalDecision after abort');
    await settled(runtime);
    assert.deepEqual(ends(bridge), [...Array(5).fill('done'), 'error:cancelled']); // Market, News, Bull, Bear, RM; Trader
    assert.equal(count('riskReviewer'), 0);
    assert.equal(count('finalDecisionMaker'), 0);
  }));

test('L5 News fails (plain Error in the provider): TaskError(failed), nothing downstream, runtime ready', OPTS, (t) =>
  owner(async ({ runtime, graph, count }) => {
    const input: TradingFixture = { ...FIXTURE, newsFacts: `${FIXTURE.newsFacts} STANDIN_FAIL` };
    await assert.rejects(graph.invoke({ input }), (e) => e instanceof TaskError && e.code === 'failed');
    for (const n of AFTER_ANALYSTS) assert.equal(count(n), 0, n);
    assert.equal(runtime.snapshot().state, 'ready', 'an ordinary provider failure must not break the runtime');
    await settled(runtime);
    // Observation only: the sibling Market analyst may finish or be cancelled.
    t.diagnostic(`Market: ${count('marketAnalyst', 'done') ? 'done' : count('marketAnalyst', 'error') ? 'error' : 'unsettled'}`);
  }));

test('L6 shutdown after success: resolves twice, closed 0/0 (lifecycle only)', OPTS, () =>
  owner(async ({ runtime, graph }) => {
    await graph.invoke({ input: FIXTURE });
    await settled(runtime);
    await runtime.shutdown();
    await runtime.shutdown();
    assert.deepEqual(runtime.snapshot(), { state: 'closed', active: 0, queued: 0, ...RUNTIME_OPTIONS });
  }));
