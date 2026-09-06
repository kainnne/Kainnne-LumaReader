"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { createRequire } = require('node:module');
const { LocalReaderService } = require('../src/local-server');

test('macOS open-file events queue independent windows; menu and IPC target the owning window', async(t)=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'luma-main-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const dir of ['a','b']){fs.mkdirSync(path.join(root,dir));fs.writeFileSync(path.join(root,dir,'same.md'),dir);}
 const app=new EventEmitter();let becomeReady;app.whenReady=()=>new Promise(r=>becomeReady=r);app.setName=()=>{};app.setPath=()=>{};app.getPath=()=>root;app.requestSingleInstanceLock=()=>true;app.setAppUserModelId=()=>{};app.quit=()=>{};app.exit=()=>{};app.setAsDefaultProtocolClient=()=>{throw new Error('Must not register protocol');};
 const windows=[];let focused,menu,port=12000;const handlers=new Map();
 class Window extends EventEmitter {
  constructor(options){super();this.options=options;this.destroyed=false;this.webContents=new EventEmitter();this.webContents.id=windows.length+1;this.webContents.mainFrame={url:''};this.webContents.session={setPermissionRequestHandler(){},setPermissionCheckHandler(){},webRequest:{onBeforeSendHeaders(){}}};this.webContents.setWindowOpenHandler=()=>{};this.messages=[];this.webContents.send=(...args)=>this.messages.push(args);windows.push(this);}
  async loadURL(url){this.url=url;this.webContents.mainFrame.url=url;}
  isDestroyed(){return this.destroyed;}isMinimized(){return false;}restore(){}show(){}focus(){focused=this;}setTitle(title){this.title=title;}
  destroy(){this.destroyed=true;this.emit('closed');}
  static getFocusedWindow(){return focused;}
 }
 class Service extends LocalReaderService {async listen(){this.port=port++;return this.port;}async close(){}}
 const electron={app,BrowserWindow:Window,dialog:{showErrorBox(_title,message){throw new Error(message);}},ipcMain:{handle:(name,callback)=>handlers.set(name,callback)},Menu:{buildFromTemplate:template=>template,setApplicationMenu:template=>menu=template},shell:{openExternal(){}}};
 const main=path.resolve(__dirname,'../src/main.js');const requireMain=createRequire(main);
 const context=vm.createContext({require:name=>name==='electron'?electron:name==='./local-server'?{LocalReaderService:Service}:requireMain(name),__dirname:path.dirname(main),process:{argv:['electron'],platform:'darwin',env:{}},URL,Map,Set,Promise,Buffer,console});
 vm.runInContext(fs.readFileSync(main,'utf8'),context,{filename:main});
 app.emit('open-file',{preventDefault(){}},path.join(root,'a/same.md'));app.emit('open-file',{preventDefault(){}},path.join(root,'b/same.md'));becomeReady();
 for(let i=0;i<100 && (!windows[1]?.url);i++)await new Promise(r=>setTimeout(r,5));
 assert.equal(windows.length,2);assert.notEqual(new URL(windows[0].url).origin,new URL(windows[1].url).origin);
 const event=w=>({sender:w.webContents,senderFrame:w.webContents.mainFrame});
 const rootA=handlers.get('library:get')(event(windows[0])),rootB=handlers.get('library:get')(event(windows[1]));
 assert.equal(rootA.root,fs.realpathSync.native(path.join(root,'a')));assert.equal(rootB.root,fs.realpathSync.native(path.join(root,'b')));
 focused=windows[1];menu.find(item=>item.label==='File').submenu.find(item=>item.label==='Save Markdown').click();
 assert.equal(windows[0].messages.length,0);assert.deepEqual(windows[1].messages,[['editor:save-requested']]);
 const saved=await handlers.get('document:save')(event(windows[1]),{path:'same.md',text:'updated B'});assert.equal(saved.ok,true);assert.equal(fs.readFileSync(path.join(root,'a/same.md'),'utf8'),'a');assert.equal(fs.readFileSync(path.join(root,'b/same.md'),'utf8'),'updated B');
 assert.throws(()=>handlers.get('document:save')({...event(windows[0]),senderFrame:{url:windows[0].url}},{path:'same.md',text:'bad'}),/not allowed/);
 const original=windows[0].url;app.emit('open-file',{preventDefault(){}},path.join(root,'a/same.md'));await new Promise(r=>setTimeout(r,30));assert.equal(windows.length,2);assert.equal(windows[0].url,original);assert.equal(focused,windows[0]);
 windows.forEach(window=>window.destroy());
});
