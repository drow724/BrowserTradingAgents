#!/usr/bin/env node
// Feature 006: compare a Vite baseline evidence record with a Next record
// (specs/006-nextjs-application-shell/contracts/evidence-equivalence.md).
// Usage: node scripts/compare-evidence.mjs --mode app|harness <baseline.json> <next.json>
import { readFileSync } from 'node:fs';

const [flag, mode, basePath, nextPath] = process.argv.slice(2);
if (flag !== '--mode' || !['app', 'harness'].includes(mode) || !nextPath) {
  console.error('usage: compare-evidence.mjs --mode app|harness <baseline.json> <next.json>');
  process.exit(2);
}
const base = JSON.parse(readFileSync(basePath, 'utf8'));
const next = JSON.parse(readFileSync(nextPath, 'utf8'));
const diffs = [];
const isObj = (v) => v !== null && typeof v === 'object';

if (mode === 'app') {
  // Only these paths may differ in value; array indices are written as [].
  const ALLOWED = [/^revision\.browserTradingAgents$/, /^environment\.date$/, /^timing(\.|$)/,
    /^concurrency\.akarisp\.fanOutSnapshot\.pollMs$/, /^modelRequests\[\]\.timing(\.|$)/];
  const allowed = (p) => ALLOWED.some((re) => re.test(p.replace(/\[\d+\]/g, '[]')));
  const walk = (a, b, p) => {
    if (isObj(a) && isObj(b) && Array.isArray(a) === Array.isArray(b)) {
      const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
      if (ka.join() !== kb.join()) diffs.push(`${p || '<root>'}: keys ${ka} vs ${kb}`);
      for (const k of ka.filter((k) => kb.includes(k))) {
        walk(a[k], b[k], Array.isArray(a) ? `${p}[${k}]` : p ? `${p}.${k}` : k);
      }
    } else if (!allowed(p) && JSON.stringify(a) !== JSON.stringify(b)) {
      diffs.push(`${p}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
    }
  };
  walk(base, next, '');
  if (!/^[0-9a-f]{40}(\+dirty)?$/.test(next.revision?.browserTradingAgents)) {
    diffs.push(`revision.browserTradingAgents format: ${JSON.stringify(next.revision?.browserTradingAgents)}`);
  }
  const installed = (pkg) => JSON.parse(readFileSync(`node_modules/${pkg}/package.json`, 'utf8')).version;
  for (const [field, pkg] of [['akarisp', 'akarisp'], ['langchainCore', '@langchain/core'], ['langgraph', '@langchain/langgraph']]) {
    if (next.revision?.[field] !== installed(pkg)) diffs.push(`revision.${field} ≠ installed ${pkg}`);
  }
} else {
  // Harness: scenario outcomes plus the fields e2e/harness.spec.ts asserts; timings are not compared.
  const get = (r, path) => path.split('.').reduce((v, k) => v?.[k], r);
  const same = (path, f = (v) => v) => {
    const a = f(get(base, path)), b = f(get(next, path));
    if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push(`${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  };
  for (const s of new Set([...Object.keys(base.scenarios ?? {}), ...Object.keys(next.scenarios ?? {})])) {
    same(`scenarios.${s}.outcome`);
  }
  same('scenarios.S3_concurrent2.snapshotWhileRunning', (v) => v && { active: v.active, queued: v.queued });
  same('scenarios.S4_cancel.snapshotAfter', (v) => v && { active: v.active, queued: v.queued });
  same('scenarios.S4_cancel.taskErrorCode');
  same('scenarios.S4_cancel.active.callerError', (v) => /^TaskError:cancelled/.test(v));
  same('scenarios.S4_cancel.active.snapshotAfter', (v) => v && { active: v.active, queued: v.queued });
  same('scenarios.S4_cancel.active.requestAfter');
  same('scenarios.S5_structured.fallbacks', (v) => v <= 1);
  same('scenarios.S6_systemRole.observation', (v) => /\(standin\)$/.test(v));
  same('scenarios.S7_cleanup.snapshotAfterShutdown');
  same('evidenceClass');
  same('provider');
  same('environment.availability');
  if (next.provider === 'standin' && next.environment?.availability === 'MODEL_AVAILABLE') {
    diffs.push('environment.availability: MODEL_AVAILABLE under the stand-in');
  }
}

console.log(`mode ${mode}: ${diffs.length ? `${diffs.length} difference(s)` : 'EQUIVALENT'}`);
for (const d of diffs) console.log(`  ${d}`);
process.exit(diffs.length ? 1 : 0);
