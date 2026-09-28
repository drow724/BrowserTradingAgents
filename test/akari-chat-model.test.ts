// DETERMINISTIC_TEST: the bridge against a fake Runtime (no AkariSP runtime, no provider).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { TaskError, type Runtime, type TaskResult } from 'akarisp';
import { AkariChatModel, type BridgeEvent } from '../src/integration/akari-chat-model.ts';

type RunCall = { input: unknown; options: { signal?: AbortSignal } | undefined };

function fakeRuntime(run: (input: unknown) => Promise<TaskResult>) {
  const calls: RunCall[] = [];
  const runtime = {
    state: 'ready',
    run: (input: unknown, options?: { signal?: AbortSignal }) => {
      calls.push({ input, options });
      return run(input);
    },
    stream: () => { throw new Error('not used'); },
    snapshot: () => ({ state: 'ready', active: 0, queued: 0, limit: 1, queueCapacity: 32 }),
    shutdown: async () => {},
  } as unknown as Runtime;
  return { runtime, calls };
}

const ok = (output: string): Promise<TaskResult> => Promise.resolve({ output, timing: { total: 1 } });

test('user message → one run() with Prompt API message array; output → AIMessage', async () => {
  const { runtime, calls } = fakeRuntime(() => ok('hello back'));
  const model = new AkariChatModel({ runtime });
  const result = await model.invoke([new HumanMessage('hello')]);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].input, [{ role: 'user', content: 'hello' }]);
  assert.ok(AIMessage.isInstance(result));
  assert.equal(result.content, 'hello back');
  assert.equal(model.logicalRequests, 1);
});

test('caller signal is the same object passed to run()', async () => {
  const { runtime, calls } = fakeRuntime(() => ok('x'));
  const controller = new AbortController();
  await new AkariChatModel({ runtime }).invoke([new HumanMessage('q')], { signal: controller.signal });
  assert.equal(calls[0].options?.signal, controller.signal);
});

test('TaskError is rethrown as the same object, never a success', async () => {
  const error = new TaskError('failed', { total: 2 }, new Error('provider'));
  const { runtime } = fakeRuntime(() => Promise.reject(error));
  const events: BridgeEvent[] = [];
  const model = new AkariChatModel({ runtime, onEvent: (e) => events.push(e) });
  await assert.rejects(model.invoke([new HumanMessage('q')]), (e) => e === error);
  assert.deepEqual(events, [
    { logicalRequestId: 1, event: 'start' },
    { logicalRequestId: 1, event: 'error', errorKind: 'failed', timing: { total: 2 } },
  ]);
});

test('non-TaskError is rethrown unchanged with errorKind "other"', async () => {
  const error = new RangeError('boom');
  const { runtime } = fakeRuntime(() => Promise.reject(error));
  const events: BridgeEvent[] = [];
  const model = new AkariChatModel({ runtime, onEvent: (e) => events.push(e) });
  await assert.rejects(model.invoke([new HumanMessage('q')]), (e) => e === error);
  assert.equal(events.at(-1)?.event, 'error');
  assert.equal((events.at(-1) as { errorKind: string }).errorKind, 'other');
});

test('one start + one done event per request, correlated by logicalRequestId', async () => {
  const { runtime } = fakeRuntime(() => ok('x'));
  const events: BridgeEvent[] = [];
  const model = new AkariChatModel({ runtime, onEvent: (e) => events.push(e) });
  await model.invoke([new HumanMessage('a')]);
  await model.invoke([new HumanMessage('b')]);
  assert.deepEqual(events, [
    { logicalRequestId: 1, event: 'start' },
    { logicalRequestId: 1, event: 'done', timing: { total: 1 } },
    { logicalRequestId: 2, event: 'start' },
    { logicalRequestId: 2, event: 'done', timing: { total: 1 } },
  ]);
  assert.equal(model.logicalRequests, 2);
});

test('system message is forwarded as role "system", not flattened (no support claim)', async () => {
  const { runtime, calls } = fakeRuntime(() => ok('x'));
  await new AkariChatModel({ runtime }).invoke([new SystemMessage('be brief'), new HumanMessage('q')]);
  assert.deepEqual(calls[0].input, [
    { role: 'system', content: 'be brief' },
    { role: 'user', content: 'q' },
  ]);
});

test('non-string content throws TypeError before any run()', async () => {
  const { runtime, calls } = fakeRuntime(() => ok('x'));
  const message = new HumanMessage({ content: [{ type: 'text', text: 'q' }] });
  await assert.rejects(new AkariChatModel({ runtime }).invoke([message]), TypeError);
  assert.equal(calls.length, 0);
});
