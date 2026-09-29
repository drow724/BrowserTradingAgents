// Feature 007 G gate (opt-in, BTA_REAL_YAHOO=1 only): the evidence block of a real-Yahoo run. The page
// record already carries no market values; this adds provenance. Server → Yahoo requests are not
// observable from the test runner, so they are stated as such, never estimated.
import { readFileSync } from 'node:fs';

export const REAL_YAHOO = process.env.BTA_REAL_YAHOO === '1';

export function realYahooEvidence(level: 'L4' | 'L5', record: Record<string, any>,
  { chrome, browserYahooRequests }: { chrome: string; browserYahooRequests: number }) {
  const revision: string = record.revision?.browserTradingAgents ?? '';
  const failure = record.failure;
  return {
    ...record,
    realYahoo: {
      level, executedAt: new Date().toISOString(), environment: 'local', provider: 'yahoo-compatible',
      path: 'browser → /api/market → Yahoo chart endpoint (server)',
      testedRevision: revision, clean: !revision.endsWith('+dirty'),
      node: process.version, next: JSON.parse(readFileSync('node_modules/next/package.json', 'utf8')).version, chrome,
      browserDirectYahooRequests: browserYahooRequests,
      serverToYahooRequests: 'not directly instrumented',
      classification: record.outcome === 'success' ? 'PASS' : failure?.boundary === 'market-data' ? `BLOCKED (${failure.stage}/${failure.kind})` : 'FAIL',
    },
  };
}
