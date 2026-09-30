'use strict';
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {LibraryIndex}=require('../src/library-index');
(async()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'luma-scan-bench-'));let index;try{
 for(let d=0;d<160;d++){const folder=path.join(root,`folder-${d}`);fs.mkdirSync(folder);for(let i=0;i<40;i++)fs.writeFileSync(path.join(folder,`筆記-${i}.md`),'# Fixture\n');}
 index=new LibraryIndex(root,{isDocument:f=>f.endsWith('.md'),publicFileRecord:(base,file,stat)=>({path:path.relative(base,file),size:stat.size})});
 let batches=0,scheduledIdleMs=0,last=0;const start=performance.now();
 while(true){const result=await index.advance({includeFiles:false});batches++;assert.ok(result.scan.filesFound>=last);last=result.scan.filesFound;if(!result.scan.hasMore){assert.equal(result.scan.status,'complete');break;}scheduledIdleMs+=result.scan.retryAfterMs;await new Promise(r=>setTimeout(r,result.scan.retryAfterMs));}
 assert.equal(last,6400);console.log(JSON.stringify({files:last,folders:161,batches,elapsedMs:Math.round(performance.now()-start),scheduledIdleMs}));
 }finally{index?.dispose();await fsp.rm(root,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
