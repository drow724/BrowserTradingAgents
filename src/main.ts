// BrowserTradingAgents canonical page (Feature 004): runs the TradingAgents fixture graph once per click and prints
// one evidence record (specs/004-…/contracts/evidence.md). One graph run owns one AkariSP runtime.
// `?provider=standin` loads the test stand-in (BROWSER_AUTOMATED); otherwise the native Prompt API
// is used and only `availability()` is consulted before running — this page never starts a download.
import { createRuntime, TaskError, type Runtime } from 'akarisp';
import { AkariChatModel, type BridgeEvent } from './integration/akari-chat-model.ts';
import { FIXTURE } from './graph/trading-fixture.ts';
import { buildTradingGraph, ROLES, type NodeEvent } from './graph/trading-graph.ts';

declare const __BTA_REVISION__: string;
declare const __AKARISP_VERSION__: string;
declare const __LANGCHAIN_CORE_VERSION__: string;
declare const __LANGGRAPH_VERSION__: string;

const NODES = ROLES.map((r) => r.node);
const RUNTIME_OPTIONS = { limit: 1, queueCapacity: 32 };
const WATCHDOG_MS = 180_000; // page protection only; not an AkariSP, LangGraph or Prompt API timeout

const $ = (id: string) => document.getElementById(id)!;
const params = new URLSearchParams(location.search);
const provider = params.get('provider') === 'standin' ? 'standin' : 'native';
const runner = params.get('runner') === 'playwright' ? 'playwright' : 'manual'; // declared by the opener

// The browser's own Prompt API availability, classified before any stand-in replaces it.
const availability = await classifyAvailability();
if (provider === 'standin') {
  const { installStandIn } = await import('../test/standin.ts');
  const standin = installStandIn(window as unknown as Record<string, unknown>);
  (window as unknown as { __standin: unknown }).__standin = { hold: standin.hold, resume: standin.resume };
}
$('availability').textContent = `availability: ${availability.availability} · provider: ${provider}`;

async function classifyAvailability(): Promise<{ availability: string; raw?: string; error?: string }> {
  const LM = (globalThis as { LanguageModel?: { availability?: () => Promise<string> } }).LanguageModel;
  if (!LM) return { availability: 'API_ABSENT' };
  if (typeof LM.availability !== 'function') return { availability: 'API_PRESENT_UNAVAILABLE' };
  try {
    const raw = await LM.availability();
    const map: Record<string, string> = {
      unavailable: 'API_PRESENT_UNAVAILABLE', downloadable: 'MODEL_DOWNLOADABLE',
      downloading: 'MODEL_DOWNLOADING', available: 'MODEL_AVAILABLE',
    };
    return { availability: map[raw] ?? 'UNKNOWN_AVAILABILITY', raw };
  } catch (e) {
    return { availability: 'API_PRESENT_UNAVAILABLE', error: describe(e) };
  }
}

function describe(e: unknown) {
  if (e instanceof TaskError) {
    const cause = e.cause instanceof Error ? `${e.cause.name}: ${e.cause.message}` : String(e.cause ?? '');
    return `TaskError:${e.code}${cause ? ` (${cause})` : ''}`;
  }
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}

// First 10 checks as microtasks (catches state set synchronously by the caller), then every 5 ms.
async function poll(predicate: () => boolean, ms: number) {
  const end = performance.now() + ms;
  for (let i = 0; !predicate(); i++) {
    if (performance.now() > end) return false;
    await (i < 10 ? Promise.resolve() : new Promise((r) => setTimeout(r, 5)));
  }
  return true;
}

const snap = (r: Runtime) => { const { state, active, queued } = r.snapshot(); return { state, active, queued }; };

let controller: AbortController | undefined;
$('cancel').addEventListener('click', () => controller?.abort(new Error('cancelled by user')));
$('run').addEventListener('click', run);
($('run') as HTMLButtonElement).disabled = false; // enabled only once availability (and stand-in) are ready

async function run() {
  ($('run') as HTMLButtonElement).disabled = true; // one run per owner at a time
  $('status').dataset.state = 'running';
  $('status').textContent = 'running…';
  $('result').textContent = '';
  for (const n of NODES) $(`node-${n}`).textContent = 'waiting';

  const base = {
    feature: '004-browser-tradingagents-fixture-graph',
    provider,
    runner,
    environment: { userAgent: navigator.userAgent, date: new Date().toISOString().slice(0, 10), ...availability },
    revision: { browserTradingAgents: __BTA_REVISION__, akarisp: __AKARISP_VERSION__,
      langchainCore: __LANGCHAIN_CORE_VERSION__, langgraph: __LANGGRAPH_VERSION__ },
    fixture: FIXTURE.id,
    prompts: 'src/graph/trading-graph.ts',
    graph: { version: 'tradingagents-fixture-graph@1',
      topology: 'START→{marketAnalyst,newsAnalyst}; [marketAnalyst,newsAnalyst]→bullResearcher; bullResearcher→bearResearcher→researchManager→trader→riskReviewer→finalDecisionMaker→END',
      entry: '@langchain/langgraph/web' },
    runtimeOptions: RUNTIME_OPTIONS,
  };

  let record: Record<string, unknown>;
  if (provider === 'native' && availability.availability !== 'MODEL_AVAILABLE') {
    record = { ...base, evidenceClass: 'BLOCKED', outcome: 'not-run', error: null,
      nodes: Object.fromEntries(ROLES.map((r) => [r.node, { status: 'waiting', executions: 0, modelRequests: 0, reads: r.reads }])),
      blocked: {
        reason: `native Prompt API availability: ${availability.availability}`,
        stillVerified: ['DETERMINISTIC_TEST', 'NODE_INTEGRATION (stand-in)', 'BROWSER_AUTOMATED (stand-in)'],
        unverified: ['full eight-role fixture graph on the native Prompt API'],
      } };
  } else {
    record = await runGraph(base);
  }
  $('evidence').textContent = JSON.stringify(record, null, 2);
  $('result').textContent = (record.result as { finalDecision?: string } | undefined)?.finalDecision ?? String(record.error ?? '');
  $('status').dataset.state = 'done';
  $('status').textContent = `done: ${record.evidenceClass} · ${record.outcome}`;
  ($('run') as HTMLButtonElement).disabled = false;
}

async function runGraph(base: Record<string, unknown>) {
  const runController = (controller = new AbortController());
  const evidenceClass = provider === 'standin' ? 'BROWSER_AUTOMATED' : 'REAL_BROWSER_PROMPT_API';
  // createRuntime() creates the warm base session, so a LanguageModel.create failure surfaces here.
  const runtime = await createRuntime(RUNTIME_OPTIONS).catch((e: unknown) => ({ error: describe(e) }));
  if ('error' in runtime) return { ...base, evidenceClass, outcome: 'failed', error: runtime.error };
  const watchdog = setTimeout(() => runController.abort(new Error('watchdog: 180 s page limit reached')), WATCHDOG_MS);
  const showRuntime = () => {
    const s = snap(runtime);
    Object.assign($('runtime').dataset, { state: s.state, active: String(s.active), queued: String(s.queued) });
    $('runtime').textContent = `state ${s.state} · active ${s.active} · queued ${s.queued}`;
  };
  const ticker = setInterval(showRuntime, 50);

  const bridge: BridgeEvent[] = [];
  const nodeEvents: NodeEvent[] = [];
  let runEnded = false;
  let fanOut: Promise<unknown> | undefined;
  const model = new AkariChatModel({
    runtime,
    onEvent: (e) => {
      bridge.push(e);
      // The bridge emits `start` before runtime.run(): wait (≤ 1 s, or until the run ends) until both
      // branch requests are inside AkariSP, then record the last real snapshot — whatever it is.
      if (e.event === 'start' && bridge.filter((b) => b.event === 'start').length === 2) {
        const t0 = performance.now();
        let snapshot = runtime.snapshot();
        fanOut = poll(() => (snapshot = runtime.snapshot()).active + snapshot.queued === 2 || runEnded, 1000)
          .then(() => ({ snapshot, pollMs: Math.round(performance.now() - t0) }));
      }
    },
  });
  const { graph, modelRequests } = buildTradingGraph(model, (e) => {
    nodeEvents.push(e);
    $(`node-${e.node}`).textContent = e.event === 'start' ? 'running' : e.event;
  });

  let outcome: 'success' | 'cancelled' | 'failed' = 'failed';
  let error: string | null = null;
  let state: Awaited<ReturnType<typeof graph.invoke>> | undefined;
  let settledBeforeShutdown = false;
  let snapshotBeforeShutdown: ReturnType<typeof snap> | undefined;
  let graphMs = 0;
  const t0 = performance.now();
  try {
    state = await graph.invoke({ input: FIXTURE }, { signal: runController.signal });
    outcome = 'success';
  } catch (e) {
    outcome = runController.signal.aborted ? 'cancelled' : 'failed';
    error = describe(e);
  } finally {
    graphMs = Math.round(performance.now() - t0); // caller settlement; operational evidence only
    runEnded = true;
    clearTimeout(watchdog);
    // Caller settlement is not task settlement: AkariSP must drain by itself, on a `ready` runtime,
    // BEFORE shutdown() (which would cancel whatever is left and always read closed 0/0).
    settledBeforeShutdown = await poll(() => {
      const s = runtime.snapshot();
      return s.state === 'ready' && s.active === 0 && s.queued === 0;
    }, 10_000);
    snapshotBeforeShutdown = snap(runtime);
    await runtime.shutdown();
    clearInterval(ticker);
    showRuntime();
  }

  const firstEnd = bridge.findIndex((e) => e.event !== 'start');
  const nodeRequests = Object.values(modelRequests).reduce((a, b) => a + b, 0);

  return {
    ...base,
    evidenceClass,
    outcome,
    error,
    nodes: Object.fromEntries(ROLES.map((r) => {
      const own = nodeEvents.filter((e) => e.node === r.node);
      const last = own.at(-1)?.event;
      return [r.node, { status: last === 'start' ? 'running' : (last ?? 'waiting'),
        executions: own.filter((e) => e.event === 'start').length, modelRequests: modelRequests[r.node], reads: r.reads }];
    })),
    nodeEvents,
    modelRequests: bridge.map((e) => ({ logicalRequestId: e.logicalRequestId, event: e.event,
      errorKind: e.event === 'error' ? e.errorKind : null, timing: e.event === 'start' ? null : (e.timing ?? null) })),
    counts: {
      graphRuns: 1,
      nodeExecutions: nodeEvents.filter((e) => e.event === 'start').length,
      logicalRequests: model.logicalRequests,
      fallbackRequests: model.logicalRequests - nodeRequests, // no fallback path: observed value
      providerInvocations: 'NOT EXPOSED',
    },
    concurrency: {
      graph: `branch requests submitted before either completed: ${(firstEnd < 0 ? bridge : bridge.slice(0, firstEnd)).length}`,
      akarisp: { fanOutSnapshot: fanOut ? await fanOut : null },
      nativeProvider: 'not observed (out of scope)',
    },
    lifecycle: { settledBeforeShutdown, snapshotBeforeShutdown, snapshotAfterShutdown: snap(runtime) },
    timing: { graphMs },
    ...(state ? { result: Object.fromEntries(ROLES.map((r) => [r.writes, state![r.writes]])) } : {}),
  };
}
