// STAND-IN — not the Chrome Prompt API. It mimics only the surface AkariSP's browser runtime
// calls (LanguageModel.create → base.clone → session.prompt/destroy, base.destroy) so the real
// `akarisp` package can run without a model. Evidence produced with it is NODE_INTEGRATION or
// BROWSER_AUTOMATED, never REAL_BROWSER_PROMPT_API. Its counters are stand-in instrumentation,
// not AkariSP provider-invocation metrics (those are NOT EXPOSED by AkariSP's public API).
// No Node APIs: the browser harness imports this file too.

type Message = { role: string; content: string };

function reply(input: string | readonly Message[]) {
  const last = typeof input === 'string' ? input : (input.at(-1)?.content ?? '');
  // The harness's structured scenario asks for JSON; answer it deterministically.
  return /\bJSON\b/.test(last) ? '{"answer":"stand-in"}' : `stand-in reply to: ${last}`;
}

export function installStandIn(target: Record<string, unknown> = globalThis as Record<string, unknown>) {
  const standinCounters = { creates: 0, clones: 0, prompts: 0 };
  const waiting = new Set<() => void>();
  let held = false;

  const session = {
    prompt(input: string | readonly Message[], { signal }: { signal: AbortSignal }) {
      standinCounters.prompts++;
      return new Promise<string>((resolve, reject) => {
        if (signal.aborted) return reject(signal.reason);
        const done = () => {
          waiting.delete(done);
          signal.removeEventListener('abort', onAbort);
          resolve(reply(input));
        };
        const onAbort = () => {
          waiting.delete(done);
          reject(signal.reason);
        };
        signal.addEventListener('abort', onAbort, { once: true });
        if (held) waiting.add(done);
        else setTimeout(done, 0);
      });
    },
    destroy() {},
  };

  const LanguageModel = {
    availability: async () => 'available',
    create: async () => {
      standinCounters.creates++;
      return {
        clone: async ({ signal }: { signal: AbortSignal }) => {
          signal.throwIfAborted();
          standinCounters.clones++;
          return session;
        },
        destroy() {},
      };
    },
  };

  const previous = target.LanguageModel;
  target.LanguageModel = LanguageModel;
  return {
    standinCounters,
    /** Prompts started from now on wait until resume(). */
    hold: () => { held = true; },
    /** Stop holding and answer every waiting prompt. */
    resume: () => { held = false; for (const done of [...waiting]) done(); },
    /** Prompts currently waiting (i.e. running tasks that reached the model). */
    waitingPrompts: () => waiting.size,
    uninstall: () => { target.LanguageModel = previous; },
  };
}
