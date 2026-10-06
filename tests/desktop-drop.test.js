'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const [platform,path] of [['darwin','/Users/example/資料/中文.md'],['win32','C:\\Users\\example\\資料\\中文.md'],['linux','/home/example/資料/中文.md']])test(`native drops use Electron-backed File paths on ${platform}`,async()=>{
 let api;const calls=[],nativeFile={name:'中文.md'},electron={contextBridge:{exposeInMainWorld:(_,value)=>api=value},webUtils:{getPathForFile:file=>file===nativeFile?path:''},ipcRenderer:{invoke:(...args)=>{calls.push(args);return Promise.resolve({ok:true});}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/preload'),'utf8'),{require:()=>electron,process:{platform}});
 assert.equal((await api.openDroppedDocuments([nativeFile])).ok,true);assert.equal(calls[0][0],'document:drop');assert.equal(calls[0][1][0],path);
 assert.equal((await api.openDroppedDocuments([{name:'fake.md',path}])).code,'DROP_NO_PATH');assert.equal(calls.length,1);
 assert.equal((await api.openDroppedDocuments(Array(9).fill(nativeFile))).code,'DROP_LIMIT');assert.equal(calls.length,1);
});
