// Committed input for the Feature 003 minimal graph. Neutral on purpose: it exists only to show
// which node read what; answer quality is never evaluated. Bump the id suffix when content changes.
export type MinimalGraphInput = { id: string; subject: string; branchAFacts: string; branchBFacts: string };

export const FIXTURE: MinimalGraphInput = {
  id: 'minimal-graph-fixture@1',
  subject: 'the Riverside community library',
  branchAFacts: 'It opened a second reading room in March and extended weekday hours to 8pm.',
  branchBFacts: 'A local newspaper praised its children\'s programme; the roof needs repairs this autumn.',
};
