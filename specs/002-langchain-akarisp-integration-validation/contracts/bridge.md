# Contract: application-local bridge (`src/integration/`)

Consumers: this Feature's tests and harness; later, the Feature 003 graph layer. Not a published
package (Principle X).

## `AkariChatModel` — `src/integration/akari-chat-model.ts`

```ts
import { SimpleChatModel } from '@langchain/core/language_models/chat_models';
import type { Runtime } from 'akarisp';

class AkariChatModel extends SimpleChatModel {
  constructor(fields: { runtime: Runtime });
  readonly logicalRequests: number;
  _llmType(): 'akarisp';
  // invoke(input, { signal? }) inherited from LangChain
}
```

Behavior:

| Given | Then |
|---|---|
| `invoke(messages)` | `runtime.run(converted, { signal })` once; resolves an `AIMessage` whose `content` is `TaskResult.output` |
| caller passes `{ signal }` | the same `AbortSignal` reaches `runtime.run` |
| `runtime.run` rejects (`TaskError` or other) | the same error object is rethrown; never a success message |
| caller aborts | the AkariSP task settles and the caller rejects with its `TaskError` (code `cancelled`), propagated unchanged (verified T018/T019, research N-2 corrected) |
| parallel `invoke()` calls | each goes straight to `runtime.run`; ordering/queueing is AkariSP's |
| unsupported message type / non-string content | `TypeError` before any request |

## `structuredOrFreeText` — `src/integration/structured.ts`

```ts
function structuredOrFreeText<T>(
  model: AkariChatModel,
  input: string,
  parse: (text: string) => T,        // throws on invalid structure
  options?: { signal?: AbortSignal },
): Promise<{ kind: 'structured'; value: T; logicalRequests: 1; fallbacks: 0 }
          | { kind: 'freetext'; value: string; logicalRequests: 2; fallbacks: 1 }>;
```

| Given | Then |
|---|---|
| structured attempt returns parseable text | `kind: 'structured'`, 1 request |
| parse fails or model error (not abort) | exactly 1 free-text request; `kind: 'freetext'` |
| free-text request fails | its error propagates; no 3rd request |
| signal aborted at any point | abort error propagates; no fallback request |

Upstream difference (Feature 001 §5.2): upstream falls back on any exception; here abort is
excluded. Intentional (Principle XI).
