// NODE_INTEGRATION (stand-in): the Feature 003 graph (real LangGraph '/web' entry) → real
// AkariChatModel → real `akarisp@0.1.0-alpha.2` runtime → stand-in `globalThis.LanguageModel`.
// Not browser evidence, not Prompt API evidence. L1–L5 of contracts/graph.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, TaskError, type Runtime } from 'akarisp';
import { AkariChatModel, type BridgeEvent } from '../src/integration/akari-chat-model.ts';
import { FIXTURE, type MinimalGraphInput } from '../src/graph/fixture.ts';
import { buildMinimalGraph, type NodeEvent } from '../src/graph/minimal-graph.ts';
import { installStandIn } from './standin.ts';

const RUNTIME_OPTIONS = { limit: 1, queueCapacity: 32 };
const OPTS = { timeout: 15_000 };

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

// One graph run = one runtime + one model; always shut down.
async function owner(fn: (ctx: {
  runtime: Runtime;
  model: AkariChatModel;
  graph: ReturnType<typeof buildMinimalGraph>['graph'];
  bridge: BridgeEvent[];
  count: (node: NodeEvent['node'], event?: NodeEvent['event']) => number;
  standin: ReturnType<typeof installStandIn>;
}) => Promise<void>) {
  const standin = installStandIn();
  const runtime = await createRuntime(RUNTIME_OPTIONS);
  const bridge: BridgeEvent[] = [];
  const nodes: NodeEvent[] = [];
  const model = new AkariChatModel({ runtime, onEvent: (e) => bridge.push(e) });
  const { graph } = buildMinimalGraph(model, (e) => nodes.push(e));
  const count = (node: NodeEvent['node'], event: NodeEvent['event'] = 'start') =>
    nodes.filter((e) => e.node === node && e.event === event).length;
  try {
    await fn({ runtime, model, graph, bridge, count, standin });
  } finally {
    standin.resume();
    await runtime.shutdown();
    standin.uninstall();
  }
}

const starts = (bridge: BridgeEvent[]) => bridge.filter((e) => e.event === 'start').length;

// H1: the bridge emits `start` before calling runtime.run(), so wait (≤ 1 s) until both requests
// are inside AkariSP before reading the fan-out snapshot. Measured, never adjusted.
async function fanOutSnapshot(runtime: Runtime, bridge: BridgeEvent[]) {
  await until(() => starts(bridge) === 2, 'two branch requests to start');
  const t0 = Date.now();
  let s = runtime.snapshot();
  while (s.active + s.queued !== 2 && Date.now() - t0 < 1000) {
    await new Promise((r) => setTimeout(r, 5));
    s = runtime.snapshot();
  }
  return { snapshot: s, pollMs: Date.now() - t0 };
}

test('L1 success on the real runtime: 4 logical requests, ready 0/0 before shutdown', OPTS, () =>
  owner(async ({ runtime, model, graph, bridge, count }) => {
    const state = await graph.invoke({ input: FIXTURE });
    for (const key of ['branchAResult', 'branchBResult', 'synthesis', 'decision'] as const) {
      assert.match(state[key], /^stand-in reply to: /, key);
    }
    assert.equal(model.logicalRequests, 4); // measured by the bridge
    assert.equal(bridge.filter((e) => e.event === 'done').length, 4);
    for (const node of ['branchA', 'branchB', 'synthesize', 'decide'] as const) assert.equal(count(node), 1, node);
    // No fallback path in the graph: logical requests == node requests, observed fallbacks 0.
    assert.equal(starts(bridge), 4);
    await settled(runtime);
    assert.deepEqual(runtime.snapshot(), { state: 'ready', active: 0, queued: 0, ...RUNTIME_OPTIONS });
  }));

test('L2 fan-out reaches the AkariSP queue: active 1, queued 1 under limit 1', OPTS, (t) =>
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
test('L3 abort during branches: caller rejects; AkariSP settles by itself before shutdown', OPTS, (t) =>
  owner(async ({ runtime, graph, bridge, count, standin }) => {
    standin.hold();
    const controller = new AbortController();
    const run = graph.invoke({ input: FIXTURE }, { signal: controller.signal });
    const { snapshot } = await fanOutSnapshot(runtime, bridge);
    assert.deepEqual([snapshot.active, snapshot.queued], [1, 1]);
    controller.abort(new Error('caller abort'));
    let result: unknown;
    await assert.rejects(run.then((r) => { result = r; }), (e) => {
      t.diagnostic(`caller rejection: ${e instanceof Error ? e.message : String(e)}`);
      return true;
    });
    assert.equal(result, undefined, 'no graph result after abort');
    // Separately from the caller's rejection: AkariSP must drain on its own (stand-in still held).
    await settled(runtime);
    const ends = bridge.filter((e) => e.event !== 'start');
    assert.deepEqual(ends.map((e) => e.event === 'error' && e.errorKind), ['cancelled', 'cancelled']);
    assert.equal(count('synthesize'), 0);
    assert.equal(count('decide'), 0);
    await runtime.shutdown();
    assert.deepEqual(runtime.snapshot(), { state: 'closed', active: 0, queued: 0, ...RUNTIME_OPTIONS });
  }));

test('L4 Branch B fails: caller gets TaskError(failed), no join/decision, runtime ready and settled', OPTS, (t) =>
  owner(async ({ runtime, graph, bridge, count }) => {
    const input: MinimalGraphInput = { ...FIXTURE, branchBFacts: `${FIXTURE.branchBFacts} STANDIN_FAIL` };
    await assert.rejects(graph.invoke({ input }), (e) => e instanceof TaskError && e.code === 'failed');
    assert.equal(count('synthesize'), 0);
    assert.equal(count('decide'), 0);
    assert.equal(runtime.snapshot().state, 'ready', 'an ordinary provider failure must not break the runtime');
    await settled(runtime);
    // Observation only: under limit 1 Branch A usually finishes before B reaches the model.
    const outcome = (id: number) => bridge.find((e) => e.logicalRequestId === id && e.event !== 'start');
    t.diagnostic(`request outcomes: ${JSON.stringify([1, 2].map((id) => {
      const e = outcome(id);
      return e && (e.event === 'error' ? `${id}:error:${e.errorKind}` : `${id}:done`);
    }))}; branchA ${count('branchA', 'done') ? 'done' : count('branchA', 'error') ? 'error' : 'unsettled'}`);
  }));

test('L5 shutdown after success: resolves twice, closed 0/0', OPTS, () =>
  owner(async ({ runtime, graph }) => {
    await graph.invoke({ input: FIXTURE });
    await settled(runtime);
    await runtime.shutdown();
    await runtime.shutdown();
    assert.deepEqual(runtime.snapshot(), { state: 'closed', active: 0, queued: 0, ...RUNTIME_OPTIONS });
  }));
