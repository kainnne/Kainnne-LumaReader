'use strict';
const {app,BrowserWindow,ipcMain}=require('electron'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const plan=require('./agent-plan'),{LocalReaderService}=require('./local-server'),{pdfOptions}=require('./pdf-export');
function start(argv=process.argv){
 let request;try{request=plan.parseArgs(argv);}catch(error){process.stdout.write(JSON.stringify({ok:false,protocol:plan.PROTOCOL,code:error.code||'INVALID_ARGUMENT',message:error.message})+'\n');app.exit(2);return;}
 let window,service,temp,timeout,finished=false;
 const finish=async(result,code)=>{if(finished)return;finished=true;clearTimeout(timeout);if(window&&!window.isDestroyed())window.destroy();await service?.close().catch(()=>{});if(temp)await fs.rm(temp,{recursive:true,force:true}).catch(()=>{});process.stdout.write(JSON.stringify(result)+'\n',()=>app.exit(code));};
 const errorResult=error=>({ok:false,protocol:plan.PROTOCOL,code:error.code||'EXPORT_FAILED',message:error.message});
 const fail=error=>finish(errorResult(error),error.code==='OUTPUT_EXISTS'?4:request.command==='export'&&['RENDER_FAILED','MISSING_IMAGES','EXPORT_FAILED','TIMED_OUT'].includes(error.code)?3:2);
 // Separate from the interactive app: no single-instance forwarding, preferences or library scan.
 app.setName('LumaReader Agent');
 temp=require('node:fs').mkdtempSync(path.join(os.tmpdir(),'lumareader-agent-'));app.setPath('userData',temp);app.setPath('sessionData',temp);
 app.on('window-all-closed',()=>{});
 timeout=setTimeout(()=>{const error=new Error('Agent job exceeded 120 seconds.');error.code='TIMED_OUT';void fail(error);},120000);
 app.whenReady().then(async()=>{
  if(request.command==='help'){await finish(plan.help(require('../package.json').version),0);return;}
  const job=await plan.readJob(request);if(finished)return;
  if(request.command==='inspect'){await finish(plan.inspect(job),0);return;}
  app.dock?.hide();
  const token=crypto.randomBytes(32).toString('hex');service=new LocalReaderService({rendererRoot:path.join(__dirname,'../renderer'),libraryRoot:job.root,accessToken:token});await service.listen(0);if(finished)return;
  const origin=`http://127.0.0.1:${service.port}`;
  window=new BrowserWindow({width:1360,height:880,show:false,webPreferences:{preload:path.join(__dirname,'agent-preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,partition:'lumareader-agent-'+crypto.randomUUID(),backgroundThrottling:false}});
  const session=window.webContents.session;session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));session.setPermissionCheckHandler(()=>false);
  session.webRequest.onBeforeRequest((details,callback)=>{const url=details.url;callback({cancel:!url.startsWith(origin+'/')&&!/^(data:|blob:)/.test(url)&&!(job.allowRemote&&/^https?:/.test(url))});});
  session.webRequest.onBeforeSendHeaders({urls:[origin+'/*']},(details,callback)=>callback({requestHeaders:{...details.requestHeaders,'X-LumaReader-Token':token}}));
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==origin)event.preventDefault();});
  const valid=event=>!finished&&event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame&&new URL(event.senderFrame.url).origin===origin;
  ipcMain.handle('luma-agent:job',event=>{if(!valid(event))throw Error('Invalid agent sender.');return {text:job.text,path:job.path,layout:job.layout,accent:job.accent,allowMissing:job.allowMissing};});
  let printing=false;
  ipcMain.handle('luma-agent:complete',async(event,payload)=>{
   if(!valid(event)||printing)throw Error('Invalid agent completion.');printing=true;
   try{
    if(payload?.error){const error=new Error(String(payload.error).slice(0,2000));error.code=payload.code==='MISSING_IMAGES'?'MISSING_IMAGES':'RENDER_FAILED';throw error;}
    if(!Number.isInteger(payload?.pages)||payload.pages<1||payload.pages>1000)throw Error('Invalid page count.');
    const warnings=Array.isArray(payload.warnings)?payload.warnings.slice(0,300).map(s=>String(s).slice(0,1000)):[];
    const bytes=await window.webContents.printToPDF(pdfOptions('',{...job.layout.options,includeFooter:false}));await plan.savePdf(job,bytes);
    void finish({ok:true,protocol:plan.PROTOCOL,output:job.output,pages:payload.pages,bytes:bytes.length,sourceHash:job.sourceHash,documentUnchanged:true,warnings},0);return {ok:true};
   }catch(error){if(!error.code)error.code='EXPORT_FAILED';void fail(error);return {ok:false};}
  });
  window.webContents.on('render-process-gone',(_event,details)=>{const error=new Error('Renderer stopped: '+details.reason);error.code='RENDER_FAILED';void fail(error);});
  window.webContents.on('did-fail-load',(_event,code,message)=>{const error=new Error('Renderer failed to load: '+message);error.code='RENDER_FAILED';void fail(error);});
  await window.loadURL(origin+'/');
 }).catch(fail);
}
module.exports={start};
