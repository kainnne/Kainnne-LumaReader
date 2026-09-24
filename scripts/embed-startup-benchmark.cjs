'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),zlib=require('node:zlib');
const {chromium}=require('playwright-core');
async function main(){
 const variant=process.argv[2]||'after',root=path.resolve(variant==='before'?process.env.LUMA_BASELINE_SITE||'/private/tmp/luma-startup-before':'site'),bodies=new Map();let origin;
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');if(url.pathname==='/fixture.html'){res.setHeader('Content-Type','text/html');res.end(`<!doctype html><meta charset="utf-8"><style>body{margin:0}#reader{height:700px}</style><div id="reader"></div><script type="module">import {mountLumaReader} from '/embed/lumareader.js';window.started=performance.now();window.editor=mountLumaReader(document.querySelector('#reader'),{document:{id:'startup',title:'小說稿件',markdown:'# 第一章\\n\\n她推開門，開始寫下今天的故事。\\n\\n| 角色 | 狀態 |\\n| --- | --- |\\n| 小雨 | 等待雨停 |\\n'},onSave:async d=>{window.saved=d;}});editor.ready.then(()=>window.readyAt=performance.now());</script>`);return;}
  if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  let file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error('path');if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
  const ext=path.extname(file),type=({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp'})[ext]||'application/octet-stream';
  if(!bodies.has(file)){const raw=await fs.readFile(file);bodies.set(file,/\.(html|js|css|json)$/.test(file)?zlib.gzipSync(raw):raw);}
  res.setHeader('Content-Type',type);res.setHeader('Cache-Control','public,max-age=3600');if(/\.(html|js|css|json)$/.test(file))res.setHeader('Content-Encoding','gzip');res.end(bodies.get(file));
 }catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;let browser;const results=[];
 try{browser=await chromium.launch({headless:true,executablePath:process.env.LUMA_CHROMIUM_EXECUTABLE});
  for(let run=1;run<=3;run++){
   const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(()=>localStorage.setItem('lumareader-web-preferences-v1',JSON.stringify({readerDefaultsVersion:6,languagePromptSeen:true,onboardingVersion:5})));
   const page=await context.newPage();const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:120,downloadThroughput:192000,uploadThroughput:64000});
   for(const cache of ['cold','warm']){
    await page.goto(origin+'/fixture.html',{waitUntil:'domcontentloaded',timeout:60000});const view=page.frameLocator('iframe');await view.locator('body:not(.booting)').waitFor({timeout:60000});await view.locator('.direct-prose').waitFor();
    const time=await page.evaluate(()=>Math.round(readyAt-started));const assets=await view.locator('body').evaluate(()=>performance.getEntriesByType('resource').map(e=>({name:e.name.split('/').pop(),ms:Math.round(e.duration),bytes:e.encodedBodySize,transfer:e.transferSize})));
    await view.locator('.direct-prose').fill('確認可以編輯並儲存');await view.locator('#edit-document').click();await page.waitForFunction(()=>window.saved?.markdown.includes('確認可以編輯並儲存'));
    results.push({run,cache,readyMs:time,requests:assets.length,encodedKB:Math.round(assets.reduce((n,a)=>n+a.bytes,0)/1024),networkKB:Math.round(assets.reduce((n,a)=>n+a.transfer,0)/1024),assets});
   }
   await context.close();
  }
  await fs.writeFile('/private/tmp/luma-startup-'+variant+'.json',JSON.stringify({variant,network:'1.536 Mbps, 120 ms RTT; gzip; 390px',results},null,2));
  for(const cache of ['cold','warm']){const rows=results.filter(r=>r.cache===cache);console.log(JSON.stringify({variant,cache,medianMs:rows.map(r=>r.readyMs).sort((a,b)=>a-b)[1],requests:rows[0].requests,encodedKB:rows[0].encodedKB,networkKB:rows[0].networkKB}));}
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
