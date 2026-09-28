// Feature 002 browser harness: runs S1–S7 through LangChain.js → AkariChatModel → akarisp and
// prints one evidence record (contracts/evidence.md). `?provider=standin` loads the test stand-in
// (BROWSER_AUTOMATED); otherwise the native Prompt API is used and only `availability()` is
// consulted before running — this page never starts a model download.
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createRuntime, TaskError, type Runtime } from 'akarisp';
import { AkariChatModel } from '../src/integration/akari-chat-model.ts';
import { structuredOrFreeText } from '../src/integration/structured.ts';

declare const __BTA_REVISION__: string;
declare const __AKARISP_VERSION__: string;
declare const __LANGCHAIN_CORE_VERSION__: string;

type Outcome = 'PASS' | 'FAIL' | 'BLOCKED' | 'OBSERVED';
type Scenario = { outcome: Outcome; [key: string]: unknown };

const $ = (id: string) => document.getElementById(id)!;
const params = new URLSearchParams(location.search);
const provider = params.get('provider') === 'standin' ? 'standin' : 'native';
const runtimeOptions = { limit: 1, queueCapacity: 32 };
const WATCHDOG_MS = 120_000; // harness behavior, not AkariSP behavior

// The browser's own Prompt API availability, classified before any stand-in replaces it.
const browserAvailability = classifyAvailability();

// Stand-in controls (no-ops for the native provider, whose tasks are naturally slow).
let control = { hold() {}, resume() {}, prompts: (): number | 'NOT EXPOSED' => 'NOT EXPOSED' };
if (provider === 'standin') {
  await browserAvailability;
  const { installStandIn } = await import('../test/standin.ts');
  const standin = installStandIn(window as unknown as Record<string, unknown>);
  control = { hold: standin.hold, resume: standin.resume, prompts: () => standin.standinCounters.prompts };
}

async function classifyAvailability() {
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

const counts = { workflowOperations: 0, logicalRequests: 0, fallbackRequests: 0 };

// One integration owner per scenario: one runtime, always shut down.
async function withOwner<T>(fn: (runtime: Runtime, model: AkariChatModel) => Promise<T>) {
  const runtime = await createRuntime(runtimeOptions);
  const model = new AkariChatModel({ runtime });
  try {
    return await fn(runtime, model);
  } finally {
    control.resume();
    counts.logicalRequests += model.logicalRequests;
    await runtime.shutdown();
  }
}

async function until(predicate: () => boolean, ms = 10_000) {
  const end = performance.now() + ms;
  while (!predicate()) {
    if (performance.now() > end) return false;
    await new Promise((r) => setTimeout(r, 5));
  }
  return true;
}

const ask = (text: string) => [new HumanMessage(text)];
const op = <T>(p: Promise<T>) => { counts.workflowOperations++; return p; };
const snap = (r: Runtime) => { const { state, active, queued } = r.snapshot(); return { state, active, queued }; };
const LONG = 'Write a short paragraph about why the sky appears blue.';

const scenarios: Record<string, () => Promise<Scenario>> = {
  S1_single: () => withOwner(async (runtime, model) => {
    const result = await op(model.invoke(ask('Reply with one short sentence: what is HTTP?')));
    return { outcome: result.content ? 'PASS' : 'FAIL', output: result.content, state: snap(runtime).state };
  }),

  S2_reuse: async () => {
    let runtimeConstructions = 0;
    return withOwner(async (runtime, model) => {
      runtimeConstructions++;
      const a = await op(model.invoke(ask('Say "A".')));
      const b = await op(model.invoke(ask('Say "B".')));
      const ok = Boolean(a.content && b.content) && runtime.snapshot().state === 'ready';
      return { outcome: ok ? 'PASS' : 'FAIL', runtimeConstructions, requests: 2, snapshotAfter: snap(runtime) };
    });
  },

  S3_concurrent2: () => withOwner(async (runtime, model) => {
    control.hold();
    const a = op(model.invoke(ask(LONG)));
    const b = op(model.invoke(ask('Say "B".')));
    await until(() => runtime.snapshot().queued === 1);
    const snapshotWhileRunning = snap(runtime);
    control.resume();
    const results = await Promise.all([a, b]);
    const ok = snapshotWhileRunning.active === 1 && snapshotWhileRunning.queued === 1 && results.every((r) => r.content);
    return { outcome: ok ? 'PASS' : 'FAIL', snapshotWhileRunning, snapshotAfter: snap(runtime) };
  }),

  S4_cancel: () => withOwner(async (runtime, model) => {
    control.hold();
    const a = op(model.invoke(ask(LONG)));
    const controller = new AbortController();
    const b = op(model.invoke(ask('Say "B".'), { signal: controller.signal }));
    await until(() => runtime.snapshot().queued === 1);
    controller.abort(new Error('harness cancelled queued request'));
    const callerError = await b.then(() => 'RESOLVED (not cancelled)', describe);
    const queuedAfterCancel = runtime.snapshot().queued;
    control.resume();
    await a;
    await until(() => runtime.snapshot().active === 0);
    const snapshotAfter = snap(runtime);
    const after = await op(model.invoke(ask('Say "C".'))).then(() => 'PASS', describe);
    const ok = callerError.startsWith('TaskError:cancelled') && queuedAfterCancel === 0
      && snapshotAfter.active === 0 && snapshotAfter.queued === 0 && after === 'PASS';
    return { outcome: ok ? 'PASS' : 'FAIL', target: 'queued', callerError, taskErrorCode: callerError.split(/[: ]/)[1],
      snapshotAfter, requestAfter: after };
  }),

  S5_structured: () => withOwner(async (_runtime, model) => {
    const parse = (text: string) => {
      const value = JSON.parse(text) as { answer?: unknown };
      if (typeof value.answer !== 'string') throw new TypeError('missing "answer"');
      return value;
    };
    const result = await op(structuredOrFreeText(model,
      'Reply with JSON only, exactly {"answer":"<one word>"}. Question: what color is a clear daytime sky?', parse));
    counts.fallbackRequests += result.fallbacks;
    return { outcome: result.fallbacks <= 1 ? 'PASS' : 'FAIL', kind: result.kind,
      logicalRequests: result.logicalRequests, fallbacks: result.fallbacks, value: result.value };
  }),

  S6_systemRole: () => withOwner(async (_runtime, model) => {
    const messages = [new SystemMessage('Answer in one word.'), new HumanMessage('What color is the sky?')];
    return op(model.invoke(messages)).then(
      (r) => ({ outcome: 'OBSERVED' as const, observation: `supported (${provider})`, output: r.content }),
      (e) => ({ outcome: 'OBSERVED' as const, observation: `rejected (${provider})`, error: describe(e) }),
    ).then((s) => ({ ...s, note: 'observation only (research R8); never decides Feature PASS/FAIL' }));
  }),

  S7_cleanup: async () => {
    const runtime = await createRuntime(runtimeOptions);
    const model = new AkariChatModel({ runtime });
    await op(model.invoke(ask('Say "A".')));
    await runtime.shutdown();
    const secondShutdown = await runtime.shutdown().then(() => 'resolved', describe);
    const snapshotAfterShutdown = snap(runtime);
    const requestAfterShutdown = await op(model.invoke(ask('after'))).then(() => 'RESOLVED', describe);
    counts.logicalRequests += model.logicalRequests;
    const ok = secondShutdown === 'resolved' && snapshotAfterShutdown.state === 'closed'
      && snapshotAfterShutdown.active === 0 && snapshotAfterShutdown.queued === 0
      && requestAfterShutdown.startsWith('TaskError:closed');
    return { outcome: ok ? 'PASS' : 'FAIL', snapshotAfterShutdown, secondShutdown, requestAfterShutdown };
  },
};

async function runAll() {
  $('status').dataset.state = 'running';
  $('status').textContent = 'running…';
  const environment = { userAgent: navigator.userAgent, date: new Date().toISOString().slice(0, 10), ...(await browserAvailability) };
  const runnable = provider === 'standin' || environment.availability === 'MODEL_AVAILABLE';
  // environment.availability always describes this browser's native Prompt API, even for stand-in runs.
  const results: Record<string, Scenario> = {};
  for (const [name, scenario] of Object.entries(scenarios)) {
    if (!runnable) { results[name] = { outcome: 'BLOCKED' }; continue; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watchdog = new Promise<Scenario>((resolve) => {
      timer = setTimeout(() => resolve({ outcome: 'FAIL', error: `harness watchdog: > ${WATCHDOG_MS} ms` }), WATCHDOG_MS);
    });
    results[name] = await Promise.race([scenario().catch((e): Scenario => ({ outcome: 'FAIL', error: describe(e) })), watchdog]);
    clearTimeout(timer);
  }

  const evidenceClass = provider === 'standin' ? 'BROWSER_AUTOMATED'
    : runnable && results.S1_single.outcome === 'PASS' ? 'REAL_BROWSER_PROMPT_API' : 'BLOCKED';
  const record = {
    evidenceClass,
    provider,
    environment,
    feature: '002-langchain-akarisp-integration-validation',
    revision: { browserTradingAgents: __BTA_REVISION__, akarisp: __AKARISP_VERSION__, langchainCore: __LANGCHAIN_CORE_VERSION__ },
    runtimeOptions,
    scenarios: results,
    counts: {
      ...counts,
      providerInvocations: provider === 'standin' ? `${control.prompts()} (stand-in prompt count; not an AkariSP metric)` : 'NOT EXPOSED',
    },
    ...(evidenceClass === 'BLOCKED' && {
      blocked: {
        reason: runnable ? 'S1 did not pass with the native provider' : `Prompt API not runnable here: ${environment.availability}`,
        stillVerified: ['page loads', 'akarisp and @langchain/core bundle and import in this browser', 'availability classification'],
        unverified: ['native Prompt API path S1–S7'],
      },
    }),
  };
  $('evidence').textContent = JSON.stringify(record, null, 2);
  $('status').dataset.state = 'done';
  $('status').textContent = `done: ${evidenceClass}`;
}

browserAvailability.then((a) => { $('availability').textContent = `provider: ${provider}, availability: ${JSON.stringify(a)}`; });
$('run').addEventListener('click', () => { runAll().catch((e) => { $('status').textContent = `harness error: ${describe(e)}`; }); });
$('copy').addEventListener('click', () => navigator.clipboard.writeText($('evidence').textContent ?? ''));
