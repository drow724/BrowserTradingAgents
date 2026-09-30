// Feature 004 TradingAgents fixture graph: Market ‖ News → Bull → Bear → Research Manager → Trader →
// Risk Reviewer → Final Decision. Role boundaries follow Feature 001 (specs/004…/contracts/graph.md);
// Market ‖ News is the intentional browser adaptation A1, not the upstream (sequential) topology.
//
// Imported from '@langchain/langgraph/web': in the browser a model called inside a node does not
// inherit the graph's AbortSignal, so every node forwards config.signal itself (Feature 003 O-1).
import { Annotation, END, START, StateGraph, type LangGraphRunnableConfig } from '@langchain/langgraph/web';
import { HumanMessage } from '@langchain/core/messages';
import type { AkariChatModel } from '../integration/akari-chat-model.ts';
import type { TradingFixture } from './trading-fixture.ts';

const State = Annotation.Root({
  input: Annotation<TradingFixture>,
  marketReport: Annotation<string>,
  newsReport: Annotation<string>,
  bullArgument: Annotation<string>,
  bearArgument: Annotation<string>,
  researchDecision: Annotation<string>,
  traderPlan: Annotation<string>,
  riskReview: Annotation<string>,
  finalDecision: Annotation<string>,
});
export type TradingGraphState = typeof State.State;

type OutputKey = Exclude<keyof TradingGraphState, 'input'>;
type FixtureKey = 'subject' | 'marketFacts' | 'newsFacts' | 'holdingFacts' | 'question' | 'answerFacts';
type ReadKey = FixtureKey | OutputKey;

const LABELS: Record<ReadKey, string> = {
  subject: 'Company', marketFacts: 'Market facts', newsFacts: 'News facts',
  holdingFacts: 'Holding facts', question: 'User question', answerFacts: 'Facts',
  marketReport: 'Market report', newsReport: 'News report', bullArgument: 'Bull argument',
  bearArgument: 'Bear argument', researchDecision: 'Research decision', traderPlan: 'Trader plan',
  riskReview: 'Risk review', finalDecision: 'Final decision',
};

// The one source for prompts and for the evidence `reads` summary. A role's prompt contains its
// `ask` and one line per `reads` key — nothing else from the state.
export const ROLES = [
  { node: 'marketAnalyst', label: 'Market Analyst', writes: 'marketReport', reads: ['subject', 'marketFacts'],
    ask: 'Write a short market report from these market facts.' },
  { node: 'newsAnalyst', label: 'News Analyst', writes: 'newsReport', reads: ['subject', 'newsFacts'],
    ask: 'Write a short news report from these news facts.' },
  { node: 'bullResearcher', label: 'Bull Researcher', writes: 'bullArgument', reads: ['subject', 'marketReport', 'newsReport'],
    ask: 'Argue the case for investing, based on the two reports. The bear analyst has not spoken yet — open the debate.' },
  { node: 'bearResearcher', label: 'Bear Researcher', writes: 'bearArgument',
    reads: ['subject', 'marketReport', 'newsReport', 'bullArgument'],
    ask: 'Argue the case against investing and rebut the bull argument.' },
  { node: 'researchManager', label: 'Research Manager', writes: 'researchDecision', reads: ['subject', 'bullArgument', 'bearArgument'],
    ask: 'Judge the bull/bear debate and state an investment recommendation with a short rationale.' },
  { node: 'trader', label: 'Trader', writes: 'traderPlan', reads: ['subject', 'researchDecision', 'marketReport'],
    ask: 'Turn the research decision into a concrete Buy, Hold or Sell proposal grounded in the market report.' },
  { node: 'riskReviewer', label: 'Risk Reviewer', writes: 'riskReview',
    reads: ['subject', 'traderPlan', 'researchDecision', 'marketReport', 'newsReport'],
    ask: 'Review the trader plan for risks and say whether it should be adjusted.' },
  { node: 'finalDecisionMaker', label: 'Final Decision', writes: 'finalDecision',
    reads: ['subject', 'riskReview', 'researchDecision', 'traderPlan'],
    ask: 'Give the final decision, taking the risk review into account.' },
] as const satisfies readonly { node: string; label: string; writes: OutputKey; reads: readonly ReadKey[]; ask: string }[];

type Role = (typeof ROLES)[number];
export type NodeName = Role['node'];
export type NodeEvent = { node: NodeName; event: 'start' | 'done' | 'error'; seq: number };

const INPUT_KEYS: readonly ReadKey[] = ['subject', 'marketFacts', 'newsFacts', 'holdingFacts', 'question', 'answerFacts'];
const valueOf = (state: TradingGraphState, key: ReadKey) =>
  INPUT_KEYS.includes(key) ? state.input[key as FixtureKey] : state[key as OutputKey];

// Feature 010 adaptation A-010-1: portfolio runs add the holding facts to the roles that weigh the position,
// and the user's question to the final role only. Demo inputs set neither, so their prompts are unchanged.
const PORTFOLIO_READS: Partial<Record<NodeName, readonly ReadKey[]>> = {
  marketAnalyst: ['holdingFacts'], researchManager: ['holdingFacts'], trader: ['holdingFacts'],
  riskReviewer: ['holdingFacts'], finalDecisionMaker: ['holdingFacts', 'question'],
};
// Feature 013 adaptation A-013-1: in the formatted/refs number modes the final role reads every fact of the run
// (answerFacts) instead of the holding facts; the seven other roles are unchanged in every mode.
export const readsFor = (role: Role, input: TradingFixture): readonly ReadKey[] =>
  [...role.reads, ...(PORTFOLIO_READS[role.node] ?? []).filter((k) => input[k as 'holdingFacts' | 'question'] !== undefined)]
    .map((k) => (k === 'holdingFacts' && role.node === 'finalDecisionMaker' && input.answerFacts !== undefined ? 'answerFacts' : k));
const KOREAN_ANSWER = "Answer the user's question in Korean, in at most three sentences, using only the facts given. " +
  'If the facts do not contain the answer, say so.';
const REFS_ANSWER = 'Never write a number yourself. When you mention a value from the facts, write only its reference ' +
  'in braces, e.g. {D2}. If a value you need is not in the facts, say that it is not given.';

const promptFor = (role: Role, state: TradingGraphState) =>
  `You are the ${role.label}. ${role.ask} Reply in plain text in at most three sentences.\n\n` +
  readsFor(role, state.input).map((key) => `${LABELS[key]}: ${valueOf(state, key)}`).join('\n') +
  (role.node === 'finalDecisionMaker' && state.input.question !== undefined ? `\n\n${KOREAN_ANSWER}` : '') +
  (role.node === 'finalDecisionMaker' && state.input.numberMode === 'refs' ? ` ${REFS_ANSWER}` : '');

export function buildTradingGraph(model: AkariChatModel, onNode?: (e: NodeEvent) => void) {
  const modelRequests = Object.fromEntries(ROLES.map((r) => [r.node, 0])) as Record<NodeName, number>;
  let seq = 0;

  const node = (name: NodeName) => {
    const role = ROLES.find((r) => r.node === name)!;
    return async (state: TradingGraphState, config: LangGraphRunnableConfig) => {
      onNode?.({ node: name, event: 'start', seq: ++seq });
      try {
        modelRequests[name]++;
        // Explicit forward: the graph's signal reaches AkariChatModel → runtime.run only this way.
        const result = await model.invoke([new HumanMessage(promptFor(role, state))], { signal: config.signal });
        onNode?.({ node: name, event: 'done', seq: ++seq });
        return { [role.writes]: String(result.content) };
      } catch (e) {
        onNode?.({ node: name, event: 'error', seq: ++seq });
        throw e;
      }
    };
  };

  const graph = new StateGraph(State)
    .addNode('marketAnalyst', node('marketAnalyst'))
    .addNode('newsAnalyst', node('newsAnalyst'))
    .addNode('bullResearcher', node('bullResearcher'))
    .addNode('bearResearcher', node('bearResearcher'))
    .addNode('researchManager', node('researchManager'))
    .addNode('trader', node('trader'))
    .addNode('riskReviewer', node('riskReviewer'))
    .addNode('finalDecisionMaker', node('finalDecisionMaker'))
    .addEdge(START, 'marketAnalyst')
    .addEdge(START, 'newsAnalyst')
    .addEdge(['marketAnalyst', 'newsAnalyst'], 'bullResearcher') // barrier: Bull waits for both reports
    .addEdge('bullResearcher', 'bearResearcher')
    .addEdge('bearResearcher', 'researchManager')
    .addEdge('researchManager', 'trader')
    .addEdge('trader', 'riskReviewer')
    .addEdge('riskReviewer', 'finalDecisionMaker')
    .addEdge('finalDecisionMaker', END)
    .compile();

  return { graph, modelRequests };
}
