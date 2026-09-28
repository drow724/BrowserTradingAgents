// Application-local LangChain chat model over an AkariSP runtime (Feature 002).
// Thin by design: AkariSP owns queueing, cancellation and cleanup; this file only converts
// messages, forwards the caller's signal, and reports one start + one terminal event per request.
import { SimpleChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { TaskError, type Runtime, type TaskTiming } from 'akarisp';

export type BridgeEvent =
  | { logicalRequestId: number; event: 'start' }
  | { logicalRequestId: number; event: 'done'; timing: TaskTiming }
  | { logicalRequestId: number; event: 'error'; errorKind: TaskError['code'] | 'other'; timing?: TaskTiming };

const ROLES: Record<string, 'user' | 'assistant' | 'system'> = { human: 'user', ai: 'assistant', system: 'system' };

function toPromptMessages(messages: BaseMessage[]) {
  return messages.map((m) => {
    const role = ROLES[m.type];
    if (!role || typeof m.content !== 'string') throw new TypeError(`Unsupported message for AkariSP: ${m.type}`);
    return { role, content: m.content };
  });
}

export class AkariChatModel extends SimpleChatModel {
  logicalRequests = 0;
  #runtime: Runtime;
  #onEvent?: (event: BridgeEvent) => void;

  constructor({ runtime, onEvent }: { runtime: Runtime; onEvent?: (event: BridgeEvent) => void }) {
    super({});
    this.#runtime = runtime;
    this.#onEvent = onEvent;
  }

  _llmType() {
    return 'akarisp';
  }

  async _call(messages: BaseMessage[], options: this['ParsedCallOptions']): Promise<string> {
    const input = toPromptMessages(messages);
    const logicalRequestId = ++this.logicalRequests;
    this.#onEvent?.({ logicalRequestId, event: 'start' });
    try {
      const { output, timing } = await this.#runtime.run(input, { signal: options.signal });
      this.#onEvent?.({ logicalRequestId, event: 'done', timing });
      return output;
    } catch (e) {
      const task = e instanceof TaskError ? e : undefined;
      this.#onEvent?.({ logicalRequestId, event: 'error', errorKind: task?.code ?? 'other', timing: task?.timing });
      throw e;
    }
  }
}
