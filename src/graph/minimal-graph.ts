// Feature 003 minimal graph: branchA ‖ branchB → synthesize → decide, each node one model request
// through AkariChatModel. Neutral prompts; no agent/trading semantics.
//
// Imported from '@langchain/langgraph/web' on purpose: in the browser a model called inside a node
// does NOT inherit the graph's AbortSignal (no AsyncLocalStorage), so every node forwards
// config.signal itself. The root Node entry would propagate it implicitly and hide a missing
// forward in tests (research R7).
import { Annotation, END, START, StateGraph, type LangGraphRunnableConfig } from '@langchain/langgraph/web';
import { HumanMessage } from '@langchain/core/messages';
import type { AkariChatModel } from '../integration/akari-chat-model.ts';
import type { MinimalGraphInput } from './fixture.ts';

// Node names must differ from state keys (LangGraph rejects a node named like a channel).
const State = Annotation.Root({
  input: Annotation<MinimalGraphInput>,
  branchAResult: Annotation<string>,
  branchBResult: Annotation<string>,
  synthesis: Annotation<string>,
  decision: Annotation<string>,
});
export type MinimalGraphState = typeof State.State;

type NodeName = 'branchA' | 'branchB' | 'synthesize' | 'decide';
export type NodeEvent = { node: NodeName; event: 'start' | 'done' | 'error'; seq: number };

export function buildMinimalGraph(model: AkariChatModel, onNode?: (e: NodeEvent) => void) {
  const modelRequests: Record<NodeName, number> = { branchA: 0, branchB: 0, synthesize: 0, decide: 0 };
  let seq = 0;

  const node = (name: NodeName, key: keyof MinimalGraphState, prompt: (s: MinimalGraphState) => string) =>
    async (state: MinimalGraphState, config: LangGraphRunnableConfig) => {
      onNode?.({ node: name, event: 'start', seq: ++seq });
      try {
        modelRequests[name]++;
        // Explicit forward: the graph's signal reaches AkariChatModel → runtime.run only this way.
        const result = await model.invoke([new HumanMessage(prompt(state))], { signal: config.signal });
        onNode?.({ node: name, event: 'done', seq: ++seq });
        return { [key]: String(result.content) };
      } catch (e) {
        onNode?.({ node: name, event: 'error', seq: ++seq });
        throw e;
      }
    };

  const graph = new StateGraph(State)
    .addNode('branchA', node('branchA', 'branchAResult', (s) =>
      `Summarize these facts about ${s.input.subject} in one sentence: ${s.input.branchAFacts}`))
    .addNode('branchB', node('branchB', 'branchBResult', (s) =>
      `Summarize these facts about ${s.input.subject} in one sentence: ${s.input.branchBFacts}`))
    .addNode('synthesize', node('synthesize', 'synthesis', (s) =>
      `Combine these two summaries into two sentences.\nSummary A: ${s.branchAResult}\nSummary B: ${s.branchBResult}`))
    .addNode('decide', node('decide', 'decision', (s) =>
      `Reply with one word, POSITIVE, NEUTRAL or NEGATIVE, for the overall tone of this text: ${s.synthesis}`))
    .addEdge(START, 'branchA')
    .addEdge(START, 'branchB')
    .addEdge(['branchA', 'branchB'], 'synthesize') // barrier: runs once both branches have written
    .addEdge('synthesize', 'decide')
    .addEdge('decide', END)
    .compile();

  return { graph, modelRequests };
}
