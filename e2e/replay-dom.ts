// Feature 008 SC-014b: replay a committed synthetic trace as the same status-surface writes src/main.ts
// performs (textContent on #status / #node-*, data-* on #runtime, the record in #evidence), on a page
// where no run is started. No graph, no model, no acquisition takes part.
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

type TraceEvent = { type: string; role?: string; outcome?: string; stage?: string; errorKinds?: string[];
  runtime?: { state: string; active: string; queued: string } };
const WRITE: Record<string, string> = { 'role-started': 'running', 'role-completed': 'done', 'role-failed': 'error' };

export const trace = (name: string): TraceEvent[] =>
  JSON.parse(readFileSync(`test/fixtures/execution-traces/${name}.json`, 'utf8')).events;

// Writes the events evenly over `ms`; resolves when the last write is done.
export function replayDom(page: Page, events: TraceEvent[], ms: number) {
  return page.evaluate(async ({ events, ms, write }) => {
    const $ = (id: string) => document.getElementById(id)!;
    const step = ms / events.length;
    for (const e of events) {
      if (e.type === 'run-started') { $('status').dataset.state = 'running'; $('status').textContent = 'running…'; }
      else if (e.type === 'runtime') Object.assign($('runtime').dataset, e.runtime);
      else if (e.type === 'run-ended') {
        // Feature 009: the fields the view reads from the record (stage, error kinds) — as src/main.ts writes them.
        $('evidence').textContent = JSON.stringify({ evidenceClass: e.stage === 'preflight' ? 'BLOCKED' : 'BROWSER_AUTOMATED', outcome: e.outcome,
          ...(e.stage === 'acquisition' ? { failure: { boundary: 'market-data' } } : {}),
          modelRequests: (e.errorKinds ?? []).map((errorKind) => ({ event: 'error', errorKind })) });
        $('status').dataset.state = 'done';
        $('status').textContent = `done: BROWSER_AUTOMATED · ${e.outcome}`;
      } else $(`node-${e.role}`).textContent = write[e.type];
      await new Promise((r) => setTimeout(r, step));
    }
  }, { events, ms, write: WRITE });
}
