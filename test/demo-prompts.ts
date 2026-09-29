// Feature 010 T006 helper: the eight prompts the graph sends for one input, captured with a fake model that
// answers `reply:<n>` in call order. Used to prove demo prompts stay byte-identical (FR-007).
import { buildTradingGraph } from '../src/graph/trading-graph.ts';
import type { TradingFixture } from '../src/graph/trading-fixture.ts';
import type { AkariChatModel } from '../src/integration/akari-chat-model.ts';

export async function capturePrompts(input: TradingFixture): Promise<string[]> {
  const prompts: string[] = [];
  const model = { invoke: async (messages: { content: unknown }[]) => {
    prompts.push(String(messages[0].content));
    return { content: `reply:${prompts.length}` };
  } } as unknown as AkariChatModel;
  const { graph } = buildTradingGraph(model);
  await graph.invoke({ input });
  return prompts;
}
