import Boot from '../components/Boot.tsx';
import ExecutionView from '../components/ExecutionView.tsx';
import Shell from '../components/Shell.tsx';

// index.html's body inside the Feature 009 shell; the table gets the <tbody> the browser inserts anyway.
// Every element id src/main.ts uses is rendered here and stays mounted (the shell only hides wrappers).
export default function Page() {
  return (
    <>
      <Shell
        hud={
          <>
            <h1>BrowserTradingAgents</h1>
            <p id="availability">availability: checking…</p>
            <p id="mode">mode: checking…</p>
            <button id="run" disabled>Run Graph</button>
            <button id="cancel">Cancel</button>
            <p id="status" data-state="idle">idle</p>
            <p>Runtime: <span id="runtime">—</span></p>
          </>
        }
        stage={<ExecutionView />}
        results={
          <>
            <p>TradingAgents-style graph: Market Analyst ‖ News Analyst → Bull → Bear → Research Manager → Trader → Risk Reviewer → Final Decision, through AkariChatModel → AkariSP → browser model (no model download is started).</p>
            <p>Data: fixture mode (default) uses a fictional committed fixture and makes no market-data request. Live mode (<code>?data=live</code>) has this app&apos;s own server fetch end-of-day daily bars for IBM from Yahoo at run time, with no key — &quot;live&quot; means fetched at run time, not real-time; news stays a committed neutral text. No output is investment advice.</p>
            <p>Final decision: <span id="result"></span></p>
            <p>Market snapshot (live mode, shown here only):</p>
            <pre id="market"></pre>
            <p>Evidence record:</p>
            <pre id="evidence"></pre>
            <p>Local replay artifact (live mode; save to <code>.local/replay/</code>, never commit):</p>
            <pre id="replay"></pre>
          </>
        }
        status={
          <table>
            <tbody>
              <tr><td>Market Analyst</td><td id="node-marketAnalyst">waiting</td></tr>
              <tr><td>News Analyst</td><td id="node-newsAnalyst">waiting</td></tr>
              <tr><td>Bull Researcher</td><td id="node-bullResearcher">waiting</td></tr>
              <tr><td>Bear Researcher</td><td id="node-bearResearcher">waiting</td></tr>
              <tr><td>Research Manager</td><td id="node-researchManager">waiting</td></tr>
              <tr><td>Trader</td><td id="node-trader">waiting</td></tr>
              <tr><td>Risk Reviewer</td><td id="node-riskReviewer">waiting</td></tr>
              <tr><td>Final Decision</td><td id="node-finalDecisionMaker">waiting</td></tr>
            </tbody>
          </table>
        }
      />
      <Boot entry="app" />
    </>
  );
}
