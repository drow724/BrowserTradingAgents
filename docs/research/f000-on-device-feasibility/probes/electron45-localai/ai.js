// Utility process: plugs a dummy model into Electron 45's Prompt API hook (no real LLM; tests the plumbing only).
const { localAIHandler, LanguageModelUtility } = require('electron');
class DummyModel extends LanguageModelUtility {
  static async availability() { return 'available'; }
  static async create() { return new DummyModel({ contextUsage: 0, contextWindow: 4096 }); }
  async clone() { return new DummyModel({ contextUsage: 0, contextWindow: 4096 }); }
  async append() {}
  async measureContextUsage() { return 0; }
  async prompt(input, options) {
    const text = input.flatMap(m => m.content.map(c => c.value)).join(' | ');
    return `HANDLER_OK roles=${input.map(m => m.role).join(',')} constraint=${!!options?.responseConstraint} text=${text.slice(0, 80)}`;
  }
  destroy() {}
}
localAIHandler.setPromptAPIHandler(details => { process.parentPort.postMessage({ handlerCalled: details }); return DummyModel; });
