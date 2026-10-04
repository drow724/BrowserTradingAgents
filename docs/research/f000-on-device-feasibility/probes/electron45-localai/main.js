// Electron 45 alpha probe: does renderer LanguageModel reach an app-registered local AI handler?
// Usage: HANDLER=0|1 BLINK=0|1 electron main.js
const { app, BrowserWindow, session, utilityProcess } = require('electron');
const useHandler = process.env.HANDLER === '1', useBlink = process.env.BLINK === '1';
app.whenReady().then(async () => {
  console.log('electron', process.versions.electron, 'chrome', process.versions.chrome, { useHandler, useBlink });
  if (useHandler) {
    const proc = utilityProcess.fork(`${__dirname}/ai.js`);
    proc.on('message', m => console.log('utility:', JSON.stringify(m)));
    session.defaultSession.registerLocalAIHandler(proc);
  }
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, ...(useBlink ? { enableBlinkFeatures: 'AIPromptAPI' } : {}) } });
  await w.loadURL('http://127.0.0.1:8767/probe.html');
  const r = await w.webContents.executeJavaScript(`(async () => {
    const out = { typeofLM: typeof LanguageModel };
    if (typeof LanguageModel === 'undefined') return out;
    const T = () => performance.now();
    try {
      out.availability = await LanguageModel.availability();
      let t = T(); const s = await Promise.race([LanguageModel.create({ initialPrompts: [{ role: 'system', content: 'sys' }] }), new Promise((_, j) => setTimeout(() => j(new Error('create timeout')), 15000))]);
      out.createMs = Math.round(T() - t);
      t = T(); out.prompt = await s.prompt('hello 안녕'); out.promptMs = Math.round(T() - t);
      out.constrained = await s.prompt('route this', { responseConstraint: { type: 'string', enum: ['A', 'B'] } });
      out.contextWindow = s.contextWindow ?? s.inputQuota;
    } catch (e) { out.error = e.name + ': ' + e.message; }
    return out;
  })()`, true);
  console.log('RESULT', JSON.stringify(r));
  setTimeout(() => app.quit(), 500);
});
