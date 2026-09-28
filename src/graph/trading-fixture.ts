// Committed input for the Feature 004 TradingAgents fixture graph. Fictional and neutral: it exists
// to show which role read what. Each fact carries a tag (M1…, N1…) that tests search for to prove
// provenance; answer quality is never evaluated. Bump the id suffix when content changes.
export type TradingFixture = { id: string; subject: string; marketFacts: string; newsFacts: string };

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
