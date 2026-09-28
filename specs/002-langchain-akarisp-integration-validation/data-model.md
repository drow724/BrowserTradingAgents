# Data Model: Feature 002

No persistent data. These are the in-memory records the bridge, tests and harness exchange.

## Runtime (AkariSP, consumed — not defined here)

Public type `Runtime` from `akarisp`: `state` (`ready | broken | closed`), `run`, `stream`,
`snapshot`, `shutdown`. Owned by whoever called `createRuntime()`; exactly one per owner
(reuse rule: runtime constructions per owner = 1).

## AkariChatModel (bridge)

| Field | Type | Rule |
|---|---|---|
| `runtime` | `Runtime` | set once in constructor; never replaced |
| `logicalRequests` | number | +1 per `_call`; never decremented |

Invariants: holds no queue, pool, limiter, timer or retry state (FR-009).

## Prompt message (bridge output to `Runtime.run`)

`{ role: 'system' | 'user' | 'assistant', content: string }[]` mapped from LangChain
`system | human | ai`. Other message types or non-string content → `TypeError`.

## Request log event

| Field | Type | Notes |
|---|---|---|
| `logicalRequestId` | number | unique per bridge instance |
| `event` | `'start' \| 'done' \| 'error'` | one start + one terminal event per request |
| `errorKind` | `TaskError['code'] \| 'other'` | only on `error` |
| `timing` | `TaskTiming` | from `TaskResult` or `TaskError` |

State: `start → done` or `start → error`. A cancelled request ends in `error` with
`errorKind: 'cancelled'` (or `'rejected'`/`'closed'` per AkariSP contract), never `done`.

## Structured operation result

| Field | Type | Rule |
|---|---|---|
| `kind` | `'structured' \| 'freetext'` | `freetext` only after one failed structured attempt |
| `value` | parsed object or string | — |
| `logicalRequests` | 1 or 2 | = 1 + `fallbacks` |
| `fallbacks` | 0 or 1 | never > 1 (SC-007) |

One structured operation = one workflow operation. Abort → rethrow, `fallbacks` stays 0.

## Evidence record

See [contracts/evidence.md](contracts/evidence.md).
