'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createOpenDiagnostics}=require('../src/open-diagnostics');
async function setup(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'luma-diagnostics-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
test('opening diagnostics preserve order and exclude document paths, contents, URLs and tokens',async t=>{
 const root=await setup(t),record=createOpenDiagnostics(root,{version:'1.5.1',platform:'darwin'});
 await Promise.all([record({kind:'request',code:'EIO',headersSent:true,path:'private.md',message:'private text',token:'secret'}),record({kind:'page',code:-2,url:'http://localhost/?source=private.md'}),record({kind:'open-document',code:'private.md'})]);
 const text=await fs.readFile(path.join(root,'open-errors.jsonl'),'utf8'),rows=text.trim().split('\n').map(JSON.parse);
 assert.deepEqual(rows.map(r=>r.code),['EIO',-2,'UNKNOWN']);assert.equal(rows[0].headersSent,true);assert.ok(!/private|secret|localhost/.test(text));
});
test('diagnostics keep at most 100 records and recover from an oversized existing log',async t=>{
 const root=await setup(t),record=createOpenDiagnostics(root,{version:'1.5.1'});
 await Promise.all(Array.from({length:110},(_,code)=>record({kind:'page',code})));const file=path.join(root,'open-errors.jsonl');
 let rows=(await fs.readFile(file,'utf8')).trim().split('\n').map(JSON.parse);assert.equal(rows.length,100);assert.equal(rows[0].code,10);
 await fs.writeFile(file,'x'.repeat(70000));await record({kind:'request',code:'EIO'});rows=(await fs.readFile(file,'utf8')).trim().split('\n').map(JSON.parse);assert.equal(rows.length,1);
});
test('unavailable diagnostic storage does not reject the document-opening path',async t=>{
 const root=await setup(t),blocked=path.join(root,'file');await fs.writeFile(blocked,'keep');
 const record=createOpenDiagnostics(blocked);await record({kind:'page',code:-2});await record.flush();assert.equal(await fs.readFile(blocked,'utf8'),'keep');
});
