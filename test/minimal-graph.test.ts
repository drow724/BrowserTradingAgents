// DETERMINISTIC_TEST: the Feature 003 graph (real LangGraph, '/web' entry) → real AkariChatModel →
// fake Runtime. No AkariSP runtime, no provider, no browser. G1–G10 of contracts/graph.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskError, type Runtime, type TaskResult } from 'akarisp';
import { AkariChatModel } from '../src/integration/akari-chat-model.ts';
import { FIXTURE } from '../src/graph/fixture.ts';
import { buildMinimalGraph, type NodeEvent } from '../src/graph/minimal-graph.ts';

type Call = {
  input: { role: string; content: string }[];
  content: string;
  signal?: AbortSignal;
  resolve: (output: string) => void;
  reject: (error: unknown) => void;
  outcome?: 'resolved' | unknown;
};

// Each run() is a deferred the test settles, or `auto` answers it at once. Like AkariSP, it
// rejects with TaskError('cancelled') when its signal aborts — immediately if already aborted.
function fakeRuntime(auto?: (content: string) => string) {
  const calls: Call[] = [];
  const runtime = {
    run: (input: { role: string; content: string }[], options?: { signal?: AbortSignal }) =>
      new Promise<TaskResult>((res, rej) => {
        const signal = options?.signal;
        const call: Call = {
          input,
          content: input.map((m) => m.content).join('\n'),
          signal,
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
        if (auto) call.resolve(auto(call.content));
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
  return { runtime, calls, settled };
}

async function until(predicate: () => boolean, what: string, ms = 2000) {
  const end = Date.now() + ms;
  while (!predicate()) {
    if (Date.now() > end) assert.fail(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}
const ticks = () => new Promise((r) => setTimeout(r, 30));

const OUT = { branchA: 'out-A', branchB: 'out-B', synthesize: 'out-S', decide: 'out-D' };
const answer = (content: string) =>
  content.includes(FIXTURE.branchAFacts) ? OUT.branchA
  : content.includes(FIXTURE.branchBFacts) ? OUT.branchB
  : content.startsWith('Combine') ? OUT.synthesize
  : OUT.decide;

function setup(auto?: (content: string) => string) {
  const fake = fakeRuntime(auto);
  const model = new AkariChatModel({ runtime: fake.runtime });
  const events: NodeEvent[] = [];
  const { graph, modelRequests } = buildMinimalGraph(model, (e) => events.push(e));
  const count = (node: NodeEvent['node'], event: NodeEvent['event'] = 'start') =>
    events.filter((e) => e.node === node && e.event === event).length;
  const find = (text: string) => fake.calls.find((c) => c.content.includes(text));
  return { ...fake, model, events, graph, modelRequests, count, find };
}

const OPTS = { timeout: 10_000 };

// US1 ---------------------------------------------------------------------------------------------

test('G6 success: final state holds both branch results, synthesis and decision', OPTS, async () => {
  const s = setup(answer);
  const state = await s.graph.invoke({ input: FIXTURE });
  assert.deepEqual(state, {
    input: FIXTURE, branchAResult: OUT.branchA, branchBResult: OUT.branchB,
    synthesis: OUT.synthesize, decision: OUT.decide,
  });
});

test('G7 accounting: 4 logical requests (measured), 1 per node, 1 execution per node, 0 fallbacks', OPTS, async () => {
  const s = setup(answer);
  await s.graph.invoke({ input: FIXTURE });
  assert.equal(s.model.logicalRequests, 4); // bridge counter, measured
  assert.deepEqual(s.modelRequests, { branchA: 1, branchB: 1, synthesize: 1, decide: 1 });
  const sum = Object.values(s.modelRequests).reduce((a, b) => a + b, 0);
  assert.equal(sum, s.model.logicalRequests);
  for (const node of ['branchA', 'branchB', 'synthesize', 'decide'] as const) assert.equal(s.count(node), 1, node);
  // No fallback path exists in the graph: every run() call is one node request, observed fallbacks 0.
  assert.equal(s.calls.length - sum, 0);
});

test('every run() came through AkariChatModel as one user-role message (no system role)', OPTS, async () => {
  const s = setup(answer);
  await s.graph.invoke({ input: FIXTURE });
  assert.deepEqual(s.calls.map((c) => c.input.map((m) => m.role)), [['user'], ['user'], ['user'], ['user']]);
});

// US2 ---------------------------------------------------------------------------------------------

test('G1 fan-out: both branch requests are submitted before either completes', OPTS, async () => {
  const s = setup();
  const run = s.graph.invoke({ input: FIXTURE });
  await until(() => s.calls.length === 2, 'two branch requests');
  // Graph-level concurrent submission only; says nothing about provider/native parallelism.
  assert.ok(s.find(FIXTURE.branchAFacts) && s.find(FIXTURE.branchBFacts));
  assert.ok(s.calls.every((c) => !c.outcome), 'neither branch request has completed');
  for (const c of [...s.calls]) c.resolve(answer(c.content));
  await until(() => s.calls.length === 3, 'synthesis');
  s.calls[2].resolve(OUT.synthesize);
  await until(() => s.calls.length === 4, 'decision');
  s.calls[3].resolve(OUT.decide);
  await run;
});

test('G2 independence: each branch prompt holds only its own facts and no branch output', OPTS, async () => {
  const s = setup(answer);
  await s.graph.invoke({ input: FIXTURE });
  const a = s.find(FIXTURE.branchAFacts)!.content;
  const b = s.find(FIXTURE.branchBFacts)!.content;
  assert.ok(!a.includes(FIXTURE.branchBFacts) && !b.includes(FIXTURE.branchAFacts));
  for (const out of Object.values(OUT)) assert.ok(!a.includes(out) && !b.includes(out), out);
});

// US3 ---------------------------------------------------------------------------------------------

for (const first of ['branchA', 'branchB'] as const) {
  const second = first === 'branchA' ? 'branchB' : 'branchA';
  const facts = { branchA: FIXTURE.branchAFacts, branchB: FIXTURE.branchBFacts };

  test(`G3 fan-in barrier (${first} first): synthesize waits for ${second}, then runs once`, OPTS, async () => {
    const s = setup();
    const run = s.graph.invoke({ input: FIXTURE });
    await until(() => s.calls.length === 2, 'two branch requests');
    s.find(facts[first])!.resolve(OUT[first]);
    await until(() => s.count(first, 'done') === 1, `${first} done`);
    await ticks();
    assert.equal(s.count('synthesize'), 0, `synthesize must not start while ${second} is held`);
    assert.equal(s.calls.length, 2);
    s.find(facts[second])!.resolve(OUT[second]);
    await until(() => s.count('synthesize') === 1, 'synthesize start');
    s.calls[2].resolve(OUT.synthesize);
    await until(() => s.calls.length === 4, 'decision');
    s.calls[3].resolve(OUT.decide);
    await run;
    assert.equal(s.count('synthesize'), 1);
  });
}

test('G4 join: the synthesis request contains both branch outputs; synthesize executes once', OPTS, async () => {
  const s = setup(answer);
  await s.graph.invoke({ input: FIXTURE });
  const synthesis = s.calls.find((c) => c.content.startsWith('Combine'))!.content;
  assert.ok(synthesis.includes(OUT.branchA) && synthesis.includes(OUT.branchB));
  assert.equal(s.count('synthesize'), 1);
});

// US4 ---------------------------------------------------------------------------------------------

test('G5 sequence: decide starts after synthesize is done and reads only the synthesis', OPTS, async () => {
  const s = setup();
  const run = s.graph.invoke({ input: FIXTURE });
  await until(() => s.calls.length === 2, 'two branch requests');
  for (const c of [...s.calls]) c.resolve(answer(c.content));
  await until(() => s.calls.length === 3, 'synthesis request');
  await ticks();
  assert.equal(s.calls.length, 3, 'no decision request while synthesis is unresolved');
  assert.equal(s.count('decide'), 0);
  s.calls[2].resolve(OUT.synthesize);
  await until(() => s.calls.length === 4, 'decision request');
  s.calls[3].resolve(OUT.decide);
  await run;
  const seqOf = (node: NodeEvent['node'], event: NodeEvent['event']) =>
    s.events.find((e) => e.node === node && e.event === event)!.seq;
  assert.ok(seqOf('decide', 'start') > seqOf('synthesize', 'done'));
  const decision = s.calls[3].content;
  assert.ok(decision.includes(OUT.synthesize));
  assert.ok(!decision.includes(FIXTURE.branchAFacts) && !decision.includes(FIXTURE.branchBFacts));
});

// US5 ---------------------------------------------------------------------------------------------

// Regression A: fails if a node stops forwarding config.signal (the '/web' entry has no implicit
// propagation, exactly like the browser).
test('G8 signal forwarding: every run() receives a signal, and it aborts with the caller', OPTS, async () => {
  const s = setup();
  const controller = new AbortController();
  const run = s.graph.invoke({ input: FIXTURE }, { signal: controller.signal });
  await until(() => s.calls.length === 2, 'two branch requests');
  for (const c of s.calls) assert.ok(c.signal, 'run() received no AbortSignal — node did not forward config.signal');
  controller.abort(new Error('caller abort'));
  await assert.rejects(run);
  for (const c of s.calls) assert.equal(c.signal!.aborted, true);
  await s.settled();
});

test('G9 cancellation: caller rejects, then (separately) both runs settle as cancelled', OPTS, async (t) => {
  const s = setup();
  const controller = new AbortController();
  const reason = new Error('caller abort');
  const run = s.graph.invoke({ input: FIXTURE }, { signal: controller.signal });
  await until(() => s.calls.length === 2, 'two branch requests');
  controller.abort(reason);
  await assert.rejects(run, (e) => {
    t.diagnostic(`caller rejection: ${e === reason ? 'the caller abort reason' : String(e)}`);
    return true;
  });
  // Caller rejection is not settlement: wait (bounded) for the underlying runs.
  await s.settled(2000);
  for (const c of s.calls) assert.ok(c.outcome instanceof TaskError && c.outcome.code === 'cancelled');
  assert.equal(s.count('synthesize'), 0);
  assert.equal(s.count('decide'), 0);
});

test('G10 failure: original TaskError reaches the caller, no join/decision, sibling aborted and settled', OPTS, async () => {
  const s = setup();
  const err = new TaskError('failed', { total: 1 } as TaskResult['timing'], new Error('controlled'));
  const run = s.graph.invoke({ input: FIXTURE });
  await until(() => s.calls.length === 2, 'two branch requests');
  s.find(FIXTURE.branchBFacts)!.reject(err);
  await assert.rejects(run, (e) => e === err);
  assert.equal(s.count('synthesize'), 0);
  assert.equal(s.count('decide'), 0);
  await s.settled(2000);
  const a = s.find(FIXTURE.branchAFacts)!;
  assert.equal(a.signal!.aborted, true); // LangGraph aborted the in-flight sibling
  assert.ok(a.outcome instanceof TaskError && a.outcome.code === 'cancelled');
});
