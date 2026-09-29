import Boot from '../../components/Boot.tsx';

export const metadata = { title: 'BrowserTradingAgents — Feature 002 harness' };

// harness/index.html's body (that file stays as a historical record).
export default function HarnessPage() {
  return (
    <>
      <h1>Feature 002 — LangChain.js ↔ AkariSP harness</h1>
      <p>Runs S1–S7 once and prints one evidence record. Nothing is sent anywhere; no model download is started.</p>
      <p id="availability">availability: checking…</p>
      <button id="run">Run</button>
      <button id="copy">Copy JSON</button>
      <p id="status" data-state="idle">idle</p>
      <pre id="evidence"></pre>
      <Boot entry="harness" />
    </>
  );
}
