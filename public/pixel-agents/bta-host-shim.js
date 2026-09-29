// BrowserTradingAgents host shim for the Pixel Agents webview (specs/008-…/contracts/pixel-host-protocol.md).
// The webview uses its postMessage transport when acquireVsCodeApi exists; this forwards its requests to
// the parent page, which ignores everything but webviewReady. location.origin is the URL's origin even in
// a sandboxed (opaque-origin) frame, so it names the parent page as the only allowed receiver.
window.acquireVsCodeApi = () => ({
  postMessage: (message) => parent.postMessage({ source: 'pixel-agents', message }, location.origin),
  getState: () => undefined,
  setState: () => {},
});
