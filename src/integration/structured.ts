// Structured attempt with at most one free-text fallback (Feature 001: upstream structured nodes).
// Intentional difference from upstream: cancellation never falls back, so an aborted operation
// cannot issue a new model request. Not a retry helper.
import { TaskError } from 'akarisp';
import type { AkariChatModel } from './akari-chat-model.ts';

export type StructuredResult<T> =
  | { kind: 'structured'; value: T; logicalRequests: 1; fallbacks: 0 }
  | { kind: 'freetext'; value: string; logicalRequests: 2; fallbacks: 1 };

const text = async (model: AkariChatModel, input: string, signal?: AbortSignal) =>
  String((await model.invoke(input, { signal })).content);

export async function structuredOrFreeText<T>(
  model: AkariChatModel,
  input: string,
  parse: (text: string) => T,
  { signal }: { signal?: AbortSignal } = {},
): Promise<StructuredResult<T>> {
  try {
    return { kind: 'structured', value: parse(await text(model, input, signal)), logicalRequests: 1, fallbacks: 0 };
  } catch (e) {
    if (signal?.aborted || (e instanceof TaskError && e.code === 'cancelled')) throw e;
  }
  return { kind: 'freetext', value: await text(model, input, signal), logicalRequests: 2, fallbacks: 1 };
}
