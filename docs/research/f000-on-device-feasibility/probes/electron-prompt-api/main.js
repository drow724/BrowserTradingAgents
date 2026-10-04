const {app,BrowserWindow}=require('electron');
app.whenReady().then(async()=>{
 console.log('electron',process.versions.electron,'chrome',process.versions.chrome);
 const w=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false}});
 await w.loadURL('http://127.0.0.1:8765/probe.html');
 for(let i=0;i<50;i++){const d=await w.webContents.executeJavaScript('window.__done||null');if(d){console.log(d);break}await new Promise(r=>setTimeout(r,200))}
 app.quit();});
