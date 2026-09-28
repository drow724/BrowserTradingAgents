// NODE_INTEGRATION (stand-in): the real `akarisp@0.1.0-alpha.2` runtime behind the bridge, with a
// stand-in `globalThis.LanguageModel` instead of the Chrome Prompt API. Not browser evidence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HumanMessage } from '@langchain/core/messages';
import { createRuntime, TaskError, type Runtime } from 'akarisp';
import { AkariChatModel, type BridgeEvent } from '../src/integration/akari-chat-model.ts';
import { installStandIn } from './standin.ts';

async function until(predicate: () => boolean, what: string) {
  for (let i = 0; i < 200; i++) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  assert.fail(`timed out waiting for ${what}`);
}

// One integration owner per test: exactly one createRuntime() call, always shut down.
async function owner(fn: (ctx: {
  runtime: Runtime; model: AkariChatModel; events: BridgeEvent[]; standin: ReturnType<typeof installStandIn>;
}) => Promise<void>) {
  const standin = installStandIn();
  let runtimeConstructions = 0;
  const runtime = await createRuntime();
  runtimeConstructions++;
  const events: BridgeEvent[] = [];
  const model = new AkariChatModel({ runtime, onEvent: (e) => events.push(e) });
  try {
    await fn({ runtime, model, events, standin });
    assert.equal(runtimeConstructions, 1);
  } finally {
    standin.resume();
    await runtime.shutdown();
    standin.uninstall();
  }
}

const ask = (text: string) => [new HumanMessage(text)];
const starts = (events: BridgeEvent[]) => events.filter((e) => e.event === 'start').length;

test('S1 single request through the real AkariSP runtime', () =>
  owner(async ({ runtime, model }) => {
    const result = await model.invoke(ask('What is HTTP?'));
    assert.equal(result.content, 'stand-in reply to: What is HTTP?');
    assert.equal(runtime.snapshot().state, 'ready');
    assert.equal(model.logicalRequests, 1);
  }));

test('S2 sequential reuse: two requests, one runtime, one warm base', () =>
  owner(async ({ runtime, model, standin }) => {
    assert.equal((await model.invoke(ask('A'))).content, 'stand-in reply to: A');
    assert.equal(runtime.snapshot().state, 'ready');
    assert.equal((await model.invoke(ask('B'))).content, 'stand-in reply to: B');
    assert.deepEqual(runtime.snapshot(), { state: 'ready', active: 0, queued: 0, limit: 1, queueCapacity: 32 });
    // Stand-in corroboration only: one base created, one clone per task.
    assert.deepEqual(standin.standinCounters, { creates: 1, clones: 2, prompts: 2 });
  }));

test('S3 two concurrent requests: AkariSP queues the second (default limit 1), no bridge queue', () =>
  owner(async ({ runtime, model, events, standin }) => {
    standin.hold();
    const a = model.invoke(ask('A'));
    const b = model.invoke(ask('B'));
    await until(() => starts(events) === 2 && standin.waitingPrompts() === 1, 'both requests to reach runtime.run');
    assert.deepEqual(runtime.snapshot(), { state: 'ready', active: 1, queued: 1, limit: 1, queueCapacity: 32 });
    standin.resume();
    const [ra, rb] = await Promise.all([a, b]);
    assert.equal(ra.content, 'stand-in reply to: A');
    assert.equal(rb.content, 'stand-in reply to: B');
    const done = events.filter((e) => e.event === 'done') as Extract<BridgeEvent, { event: 'done' }>[];
    assert.equal(done.length, 2);
    assert.ok((done.find((e) => e.logicalRequestId === 2)?.timing.queueWait ?? 0) > 0, 'B waited in the AkariSP queue');
    assert.deepEqual([runtime.snapshot().active, runtime.snapshot().queued], [0, 0]);
  }));

test('S4 queued cancellation: caller rejects with TaskError(cancelled), A unaffected, runtime reusable', () =>
  owner(async ({ runtime, model, events, standin }) => {
    standin.hold();
    const a = model.invoke(ask('A'));
    const controller = new AbortController();
    const b = model.invoke(ask('B'), { signal: controller.signal });
    await until(() => runtime.snapshot().queued === 1, 'B to be queued');
    controller.abort(new Error('user cancelled B'));
    await assert.rejects(b, (e) => e instanceof TaskError && e.code === 'cancelled');
    await until(() => runtime.snapshot().queued === 0, 'queue to drain');
    assert.equal(runtime.snapshot().active, 1, 'A still running');
    const bEnd = events.find((e) => e.logicalRequestId === 2 && e.event !== 'start');
    assert.equal(bEnd?.event === 'error' && bEnd.errorKind, 'cancelled');
    standin.resume();
    assert.equal((await a).content, 'stand-in reply to: A');
    await until(() => runtime.snapshot().active === 0, 'A to release its slot');
    assert.equal((await model.invoke(ask('C'))).content, 'stand-in reply to: C');
  }));

test('active cancellation: caller rejects with TaskError(cancelled), slot released, runtime reusable', () =>
  owner(async ({ runtime, model, events, standin }) => {
    standin.hold();
    const controller = new AbortController();
    const a = model.invoke(ask('A'), { signal: controller.signal });
    await until(() => standin.waitingPrompts() === 1, 'A to reach the model');
    assert.equal(runtime.snapshot().active, 1);
    controller.abort(new Error('user cancelled A'));
    await assert.rejects(a, (e) => e instanceof TaskError && e.code === 'cancelled');
    await until(() => runtime.snapshot().active === 0, 'slot release');
    assert.equal((events.at(-1) as { errorKind?: string }).errorKind, 'cancelled');
    standin.resume();
    assert.equal((await model.invoke(ask('B'))).content, 'stand-in reply to: B');
  }));

test('S7 shutdown: idempotent, closed 0/0, request after shutdown rejects TaskError(closed)', async () => {
  const standin = installStandIn();
  try {
    const runtime = await createRuntime();
    const model = new AkariChatModel({ runtime });
    await model.invoke(ask('A'));
    await runtime.shutdown();
    await runtime.shutdown();
    assert.deepEqual(runtime.snapshot(), { state: 'closed', active: 0, queued: 0, limit: 1, queueCapacity: 32 });
    await assert.rejects(model.invoke(ask('after')), (e) => e instanceof TaskError && e.code === 'closed');
  } finally {
    standin.uninstall();
  }
});
