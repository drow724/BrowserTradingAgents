'use client';
import { useEffect, useRef, useState } from 'react';
import type { DomFact, RuntimeSnapshot } from '../src/view/execution-events.ts';
import type { RoleState, ViewState } from '../src/view/view-state.ts';
import styles from './ExecutionView.module.css';
import Office from './Office.tsx';

// Feature 008 execution view (specs/008-…/contracts/). It only reads the status surface src/main.ts
// already writes — it never writes, clicks or dispatches outside its own section, and never starts a run.
// The text panel is canonical; the office (Feature 009) draws the same state.
// `?viz=off` disables both. The view modules are imported inside the effect (the Boot pattern): a static
// import pulls LangGraph (via the ROLES constant) into the page's first-load JS (verification T013, M1).
const ICON: Record<RoleState, string> = {
  idle: '·', waiting: '…', working: '▶', queued: '⏸', inferring: '◆', completed: '✓', failed: '✗', cancelled: '■', stopped: '!', 'not-run': '–',
};
type Loaded = {
  roles: readonly { node: string; label: string }[];
  roleText: typeof import('../src/view/view-state.ts').roleText;
  runText: typeof import('../src/view/view-state.ts').runText;
};
const count = (el: HTMLElement, key: 'mounts' | 'observers', d: number) => {
  el.dataset[key] = String(Number(el.dataset[key] ?? 0) + d);
};

export default function ExecutionView() {
  const box = useRef<HTMLElement>(null);
  const [lib, setLib] = useState<Loaded>();
  const [view, setView] = useState<ViewState>();
  const [health, setHealth] = useState<'ok' | 'off' | 'unavailable' | 'error'>('ok');
  const [mode, setMode] = useState('');

  useEffect(() => {
    if (new URLSearchParams(location.search).get('viz') === 'off') { setHealth('off'); return; }
    const cleanups: (() => void)[] = [];
    let disposed = false;
    const el = box.current!;
    count(el, 'mounts', 1); // test-visible: Strict Mode runs this effect, its cleanup, then again
    void Promise.all([import('../src/graph/trading-graph.ts'), import('../src/view/execution-events.ts'),
      import('../src/view/view-state.ts')]).then(([{ ROLES }, { mapFacts, newCursor, snapshotFacts }, vs]) => {
      if (disposed) return;
      setLib({ roles: ROLES, roleText: vs.roleText, runText: vs.runText });
      const $ = (id: string) => document.getElementById(id);
      const status = $('status'), evidence = $('evidence'), runtime = $('runtime'), modeEl = $('mode');
      const nodes = ROLES.map((r) => $(`node-${r.node}`));
      if (!status || !evidence || !runtime || !modeEl || nodes.some((n) => !n)) { setHealth('unavailable'); return; }

      const cursor = newCursor();
      let state = vs.initialViewState();
      let broken = false;
      const readRuntime = (): RuntimeSnapshot | undefined => {
        const d = runtime.dataset;
        return d.state === undefined ? undefined : { state: d.state, active: d.active ?? '', queued: d.queued ?? '' };
      };
      const apply = (facts: DomFact[]) => {
        if (broken) return;
        try {
          for (const e of mapFacts(facts, cursor, () => evidence.textContent ?? '')) state = vs.reduce(state, e);
          setView(state);
          setMode(modeEl.textContent ?? '');
          el.dataset.anomalies = String(state.anomalies + cursor.anomalies);
        } catch (e) {
          broken = true; // keep the last good text; never rethrow into the page (FR-019)
          console.error('execution view stopped', e);
          setHealth('error');
        }
      };

      // Mount: start from the current DOM, not from idle (M8).
      apply(snapshotFacts({ status: status.textContent ?? '', runtime: readRuntime(),
        nodes: Object.fromEntries(ROLES.map((r, i) => [r.node, nodes[i]!.textContent ?? ''])) }));

      // Transitions come from each record's added text, never from the element's current value (H1);
      // only #runtime is read as its latest value.
      const observer = new MutationObserver((records) => {
        const facts: DomFact[] = [];
        for (const r of records) {
          if (r.target === runtime) { const rt = readRuntime(); if (rt) facts.push({ el: 'runtime', runtime: rt }); continue; }
          const added = r.addedNodes[0];
          if (r.target === modeEl || added?.nodeType !== Node.TEXT_NODE) continue;
          const text = (added as Text).data;
          if (r.target === status) facts.push({ el: 'status', text });
          else facts.push({ el: 'node', node: (r.target as Element).id.slice('node-'.length), text });
        }
        apply(facts);
      });
      for (const n of [status, modeEl, ...nodes]) observer.observe(n!, { childList: true });
      observer.observe(runtime, { attributes: true, attributeFilter: ['data-state', 'data-active', 'data-queued'] });
      count(el, 'observers', 1);
      cleanups.push(() => { observer.disconnect(); count(el, 'observers', -1); });
    }, (e) => { console.error('execution view unavailable', e); if (!disposed) setHealth('unavailable'); });
    return () => { disposed = true; for (const c of cleanups) c(); };
  }, []);

  if (health === 'off') return null;
  const rt = view?.runtime;
  return (
    <section ref={box} id="execution-view" aria-label="Execution view" data-health={health} className={styles.view}
      data-mounts="0" data-observers="0" data-anomalies="0">
      {lib && view && <Office view={view} roles={lib.roles} icon={ICON} />}
      <div className={styles.panel}>
      <h2>Execution view</h2>
      {health !== 'ok' && <p id="view-health">status unavailable{health === 'error' ? ' (view error; last known state shown)' : ''}</p>}
      {lib && view && (
        <>
          <p aria-live="polite">Run: <span id="view-run" data-state={view.run.state}>{lib.runText(view.run)}</span></p>
          <ul id="view-roles">
            {lib.roles.map((r) => {
              const role = view.roles[r.node as keyof ViewState['roles']];
              return (
                <li key={r.node} data-role={r.node} data-state={role.state}>
                  <span aria-hidden="true">{ICON[role.state]} </span>{r.label}: {lib.roleText(role)}
                </li>
              );
            })}
          </ul>
          <p>Runtime (AkariSP, whole runtime): <span id="view-runtime">{rt ? `state ${rt.state} · active ${rt.active} · queued ${rt.queued}` : '—'}</span></p>
          <p>Roles show graph state only: which role&apos;s request is active or queued is not attributed.</p>
          <p>Mode: <span id="view-mode">{mode || '—'}</span></p>
        </>
      )}
      </div>
    </section>
  );
}
