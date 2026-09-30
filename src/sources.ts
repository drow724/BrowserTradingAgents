// Feature 015 (research R6, FR-008): the source per domain, kept only in this browser. Guarded like src/portfolio.ts
// (blocked storage throws); anything unreadable is the default.
export type Sources = { holdings: 'manual' | 'toss'; quotes: 'yahoo' | 'toss' };
export const SOURCES_KEY = 'bta.sources';
const DEFAULT: Sources = { holdings: 'manual', quotes: 'yahoo' };

export function loadSources(): Sources {
  try {
    const s = JSON.parse(globalThis.localStorage.getItem(SOURCES_KEY) ?? 'null') as Partial<Sources> | null;
    return { holdings: s?.holdings === 'toss' ? 'toss' : 'manual', quotes: s?.quotes === 'toss' ? 'toss' : 'yahoo' };
  } catch { return DEFAULT; }
}
export function saveSources(s: Sources): boolean {
  try { globalThis.localStorage.setItem(SOURCES_KEY, JSON.stringify(s)); return true; } catch { return false; }
}
