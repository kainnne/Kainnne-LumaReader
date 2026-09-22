'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {LocalReaderService}=require('../src/local-server');
const {createImagePicker}=require('../src/image-picker');

async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'luma-code-test-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 return {root,service:new LocalReaderService({rendererRoot:path.resolve('renderer'),libraryRoot:root})};
}
test('code saves retain BOM, CRLF, executable bit and revision protection',async t=>{
 const {root,service}=await fixture(t);
 const before='\ufeff#!/usr/bin/env python3\r\nprint("中文")\r\n';
 const file=path.join(root,'example.py');await fs.writeFile(file,before,{mode:0o755});
 const opened=await service.openSource('example.py');assert.equal(opened.text,before);assert.equal(opened.kind,'code');
 const after=before.replace('中文','臺灣');
 const saved=await service.saveCodeDocument('example.py',after,opened.modifiedNs,opened.revision);
 assert.equal(await fs.readFile(file,'utf8'),after);assert.equal(saved.text,after);
 if(process.platform!=='win32')assert.equal((await fs.stat(file)).mode&0o777,0o755);
 await assert.rejects(()=>service.saveCodeDocument('example.py','old',null,opened.revision),{code:'DOCUMENT_CHANGED'});
 assert.equal(await fs.readFile(file,'utf8'),after);
});
test('code saves cannot overwrite Markdown, text, or a file outside the library',async t=>{
 const {root,service}=await fixture(t);
 for(const name of ['notes.md','notes.txt']){
  await fs.writeFile(path.join(root,name),'original');
  await assert.rejects(()=>service.saveCodeDocument(name,'changed'),{code:'DOCUMENT_READ_ONLY'});
  assert.equal(await fs.readFile(path.join(root,name),'utf8'),'original');
 }
 await fs.writeFile(path.join(root,'example.js'),'const a = 1;');
 await assert.rejects(()=>service.saveMarkdownDocument('example.js','changed'),{code:'DOCUMENT_READ_ONLY'});
 await assert.rejects(()=>service.saveCodeDocument('../outside.py','changed'));
});
test('code limits reject oversized and invalid UTF-8 files',async t=>{
 const {root,service}=await fixture(t);
 await fs.writeFile(path.join(root,'large.cpp'),'x'.repeat(1024*1024+1));
 await assert.rejects(()=>service.openSource('large.cpp'),{code:'DOCUMENT_TOO_LARGE'});
 await fs.writeFile(path.join(root,'binary.py'),Buffer.from([0xff,0xfe,0]));
 await assert.rejects(()=>service.openSource('binary.py'));
 await fs.writeFile(path.join(root,'small.c'),'int main() {}');
 await assert.rejects(()=>service.saveCodeDocument('small.c','x'.repeat(1024*1024+1)),{code:'DOCUMENT_TOO_LARGE'});
 assert.equal(await fs.readFile(path.join(root,'small.c'),'utf8'),'int main() {}');
});
test('simultaneous code saves reject the stale request instead of overwriting',async t=>{
 const {root,service}=await fixture(t);await fs.writeFile(path.join(root,'a.ts'),'let a = 1;');
 const doc=await service.openSource('a.ts');
 const results=await Promise.allSettled(['let a = 2;','let a = 3;'].map(text=>service.saveCodeDocument('a.ts',text,null,doc.revision)));
 assert.equal(results[0].status,'fulfilled');assert.equal(results[1].reason.code,'DOCUMENT_CHANGED');
 assert.equal(await fs.readFile(path.join(root,'a.ts'),'utf8'),'let a = 2;');
});
function context(){return {window:{isDestroyed:()=>false},service:{resolveProjectDocument:p=>p,importMarkdownImage:async(_p,name)=>({markdownPath:'assets/'+name})}};}
test('native image picker is asynchronous, single-flight, and releases its lock on cancellation',async()=>{
 let finish,calls=0;const target=context();const choose=createImagePicker({defaultPath:'/Pictures',showOpenDialog:async(_window,options)=>{calls++;assert.equal(options.defaultPath,'/Pictures');assert.ok(options.properties.includes('noResolveAliases'));return new Promise(resolve=>finish=resolve);}});
 const first=choose(target,'a.md');assert.equal(calls,1);assert.equal((await choose(target,'a.md')).code,'IMAGE_PICKER_BUSY');
 finish({canceled:true,filePaths:[]});assert.equal((await first).canceled,true);
 const second=choose(target,'a.md');finish({canceled:true,filePaths:[]});await second;assert.equal(calls,2);
});
test('native picker bounds imports and skips oversized or invalid files before reading',async()=>{
 const reads=[];const choose=createImagePicker({showOpenDialog:async()=>({filePaths:['/a.png','/large.png','/run.js','/b.webp',...Array.from({length:6},(_,i)=>`/${i}.png`)]}),stat:async p=>({isFile:()=>true,size:p.includes('large')?33*1024*1024:10}),readFile:async p=>{reads.push(p);return Buffer.from('image');}});
 const result=await choose(context(),'a.md');assert.equal(result.ok,true);assert.equal(result.images.length,6);assert.equal(result.truncated,true);assert.deepEqual(result.failed,['large.png','run.js']);assert.equal(reads.length,6);
});
test('closed windows do not import images and a failed native panel can be retried',async()=>{
 const target=context();target.window.isDestroyed=()=>true;let reads=0;
 const choose=createImagePicker({showOpenDialog:async()=>({filePaths:['/a.png']}),readFile:async()=>{reads++;}});
 assert.equal((await choose(target,'a.md')).canceled,true);assert.equal(reads,0);
 let attempts=0;const retry=createImagePicker({showOpenDialog:async()=>{if(!attempts++)throw new Error('native unavailable');return {canceled:true,filePaths:[]};}});
 await assert.rejects(()=>retry(target,'a.md'));assert.equal((await retry(target,'a.md')).canceled,true);
});
