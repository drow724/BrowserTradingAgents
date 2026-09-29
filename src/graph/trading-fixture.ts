// Committed input for the Feature 004 TradingAgents fixture graph. Fictional and neutral: it exists
// to show which role read what. Each fact carries a tag (M1…, N1…) that tests search for to prove
// provenance; answer quality is never evaluated. Bump the id suffix when content changes.
export type TradingFixture = { id: string; subject: string; marketFacts: string; newsFacts: string;
  // Feature 010 portfolio runs only (src/analysis/facts.ts); demo inputs never set them.
  holdingFacts?: string; question?: string };

export const FIXTURE: TradingFixture = {
  id: 'tradingagents-fixture@1',
  subject: 'Northwind Lamps Ltd. (fictional)',
  marketFacts: [
    'The share price rose 6% over the last quarter on average volume (market fact M1).',
    'The price is trading slightly above its 50-day moving average (market fact M2).',
  ].join(' '),
  newsFacts: [
    'The company announced a new line of energy-efficient desk lamps (news fact N1).',
    'A regional supplier reported delays in glass components (news fact N2).',
  ].join(' '),
};

// Feature 005 live mode: the News Analyst still runs, on committed news that names no company, so a
// real instrument is never paired with invented company news (specs/005…/spec.md FR-005, FR-005a).
export const NEUTRAL_NEWS = {
  id: 'neutral-news@1',
  text: 'No company-specific news is supplied for this run (committed neutral fixture; no news source is connected).',
};
