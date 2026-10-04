const {app,BrowserWindow}=require('electron');
app.whenReady().then(async()=>{
 const w=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,sandbox:true}});
 await w.loadURL('http://127.0.0.1:8765/probe.html');
 const code=`(async()=>{const t0=performance.now();const log=[];
  try{const s=await Promise.race([LanguageModel.create({monitor(m){m.addEventListener('downloadprogress',e=>log.push('dl '+e.loaded))}}),
     new Promise((_,j)=>setTimeout(()=>j(new Error('create timeout 90s')),90000))]);
   log.push('created '+Math.round(performance.now()-t0)+'ms');
   const out=await s.prompt('Reply with one word: OK');log.push('prompt: '+out);
  }catch(e){log.push('ERR '+e.name+': '+e.message)}
  log.push('avail after: '+await LanguageModel.availability());return log.join('\\n')})()`;
 console.log(await w.webContents.executeJavaScript(code,true)); app.quit();});
