// DETERMINISTIC_TEST: structured → at most one free-text fallback, never on abort.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaskError, type Runtime, type TaskResult } from 'akarisp';
import { AkariChatModel } from '../src/integration/akari-chat-model.ts';
import { structuredOrFreeText } from '../src/integration/structured.ts';

// Each run() takes the next scripted step; one workflow operation per test.
function scriptedModel(steps: Array<string | Error | ((signal?: AbortSignal) => Promise<TaskResult>)>) {
  let calls = 0;
  const runtime = {
    run: (_input: unknown, options?: { signal?: AbortSignal }) => {
      const step = steps[calls++];
      if (typeof step === 'function') return step(options?.signal);
      return step instanceof Error ? Promise.reject(step) : Promise.resolve({ output: step, timing: { total: 1 } });
    },
  } as unknown as Runtime;
  return { model: new AkariChatModel({ runtime }), calls: () => calls };
}

const parse = (text: string) => {
  const value = JSON.parse(text) as { answer?: unknown };
  if (typeof value.answer !== 'string') throw new TypeError('missing answer');
  return value as { answer: string };
};

test('structured success: 1 logical request, 0 fallbacks', async () => {
  const { model, calls } = scriptedModel(['{"answer":"yes"}']);
  const result = await structuredOrFreeText(model, 'q', parse);
  assert.deepEqual(result, { kind: 'structured', value: { answer: 'yes' }, logicalRequests: 1, fallbacks: 0 });
  assert.equal(calls(), 1);
});

test('parse failure: exactly one free-text fallback', async () => {
  const { model, calls } = scriptedModel(['not json', 'plain answer']);
  const result = await structuredOrFreeText(model, 'q', parse);
  assert.deepEqual(result, { kind: 'freetext', value: 'plain answer', logicalRequests: 2, fallbacks: 1 });
  assert.equal(calls(), 2);
});

test('non-abort model failure: exactly one fallback', async () => {
  const { model, calls } = scriptedModel([new TaskError('failed', { total: 1 }), 'plain answer']);
  const result = await structuredOrFreeText(model, 'q', parse);
  assert.equal(result.kind, 'freetext');
  assert.equal(result.fallbacks, 1);
  assert.equal(calls(), 2);
});

test('fallback failure: its error propagates, no third request', async () => {
  const second = new TaskError('failed', { total: 1 }, 'second');
  const { model, calls } = scriptedModel([new TaskError('failed', { total: 1 }), second, 'never']);
  await assert.rejects(structuredOrFreeText(model, 'q', parse), (e) => e === second);
  assert.equal(calls(), 2);
});

test('TaskError cancelled: propagates, 0 fallbacks', async () => {
  const cancelled = new TaskError('cancelled', { total: 1 });
  const { model, calls } = scriptedModel([cancelled, 'never']);
  await assert.rejects(structuredOrFreeText(model, 'q', parse), (e) => e === cancelled);
  assert.equal(calls(), 1);
});

test('caller abort during the first request: propagates, 0 fallbacks', async () => {
  const controller = new AbortController();
  // Like Runtime.run: reject at once if the signal is already aborted, else when it aborts.
  const pending = (signal?: AbortSignal) =>
    new Promise<TaskResult>((_, reject) => {
      if (signal?.aborted) return reject(signal.reason);
      signal?.addEventListener('abort', () => reject(signal.reason));
    });
  const { model, calls } = scriptedModel([pending, 'never']);
  const operation = structuredOrFreeText(model, 'q', parse, { signal: controller.signal });
  controller.abort(new Error('user cancelled'));
  await assert.rejects(operation, /user cancelled/);
  assert.equal(calls(), 1);
});
