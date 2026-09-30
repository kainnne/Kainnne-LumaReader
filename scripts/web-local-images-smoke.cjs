'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
async function main(){
 const root=path.resolve('site');
 const server=http.createServer(async(req,res)=>{try{let f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))throw Error('path');if((await fs.stat(f)).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'})[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=process.env.LUMA_WEB_ORIGIN||`http://127.0.0.1:${server.address().port}`;
 const fixture=await fs.mkdtemp(path.join(os.tmpdir(),'luma-images-test-'));
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64');
 await fs.mkdir(path.join(fixture,'assets'),{recursive:true});await fs.writeFile(path.join(fixture,'assets','圖 一.png'),png);
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.LUMA_CHROMIUM_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const context=await browser.newContext();await context.addInitScript(()=>localStorage.setItem('lumareader-web-preferences-v1',JSON.stringify({language:'zh-Hant',readerDefaultsVersion:8,onboardingVersion:5,sidebarCollapsed:true,languagePromptSeen:true})));
  const page=await context.newPage(),errors=[],privateRequests=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/private/')||r.url().includes('/Users/'))privateRequests.push(r.url());if(r.method()==='POST')writes.push(r.url());});
  page.setDefaultTimeout(12000);
  await page.goto(origin+'/web/');await page.locator('#boot-loader').waitFor({state:'hidden'});
  const md='# 測試文件\n\n![本機圖片](assets/%E5%9C%96%20%E4%B8%80.png)\n\n原始文字\n';
  await page.locator('#file-picker').setInputFiles({name:'Draft.md',mimeType:'text/markdown',buffer:Buffer.from(md)});
  await page.locator('#local-media-notice').waitFor();
  for(const width of [1280,768,390,320]){await page.setViewportSize({width,height:850});const b=await page.locator('#local-media-notice').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width);assert.ok(await page.locator('#local-media-files-button').isVisible());}
  await page.locator('#local-media-files-button').click({trial:true});
  assert.equal(await page.locator('#local-media-cancel').isVisible(),false);

  await page.screenshot({path:path.join(os.tmpdir(),'luma-local-images-mobile.png')});
  await page.setViewportSize({width:1280,height:850});
  await page.locator('#edit-document').click();await page.locator('#show-markdown').click();
  await page.locator('#source-editor').waitFor();
  const stage=await page.locator('.document-stage').boundingBox();
  const notice=await page.locator('#local-media-notice').boundingBox();
  assert.ok(stage.y>=notice.y+notice.height);assert.ok(stage.y+stage.height<=851);
  await page.locator('#show-markdown').click();
  await page.locator('#cancel-edit').click();
  await page.locator('#local-media-folder-picker').setInputFiles(fixture);
  await page.locator('#local-media-notice').waitFor({state:'hidden'});
  await page.waitForFunction(()=>{const img=document.querySelector('#content img');return img?.complete&&img.naturalWidth>0&&img.src.startsWith('blob:');});
  assert.equal(await page.evaluate(async()=> (await(await fetch('/api/file?path=Draft.md')).json()).text),md);
  await page.setViewportSize({width:1280,height:850});await page.locator('#edit-document').click();await page.locator('.direct-prose').waitFor();
  await page.locator('.direct-prose').press('ControlOrMeta+End');await page.keyboard.type(' Keep this edit');
  const before=await page.locator('#source-editor').inputValue();
  // Re-link while editing. Verify selection and undo are preserved.
  const historyBefore=await page.locator('.direct-prose').textContent();
  await page.evaluate(async()=>{const f=new File([new Uint8Array([1,2])],'unrelated.png',{type:'image/png'});await window.lumaWeb.importAssets([f]);});
  await page.locator('#local-media-picker').setInputFiles({name:'other.png',mimeType:'image/png',buffer:png});
  assert.equal(await page.locator('#source-editor').inputValue(),before);
  await page.locator('.direct-prose').press('ControlOrMeta+z');assert.notEqual(await page.locator('.direct-prose').textContent(),historyBefore);
  assert.ok(await page.locator('.direct-image img').evaluate(img=>img.complete&&img.naturalWidth>0));
  const batch=await page.evaluate(async()=>{const list=Array.from({length:500},(_,i)=>new File([new Uint8Array([1])],`batch-${i}.png`,{type:'image/png'}));let ticks=0;const timer=setInterval(()=>ticks++,0);const progress=[];const result=await window.lumaWeb.importAssets(list,{onProgress:p=>progress.push(p.processed)});clearInterval(timer);return{...result,ticks,progress};});
  assert.equal(batch.assetsAdded,500);assert.ok(batch.ticks>0);assert.equal(batch.progress.at(-1),500);
  // Exercise the primary permission button with a mocked native folder grant.
  await page.locator('#cancel-edit').click();
  await page.locator('#file-picker').setInputFiles({name:'Permission.md',mimeType:'text/markdown',buffer:Buffer.from('# Permission\n\n![Auto](../assets/auto.png)\n')});
  await page.locator('#local-media-notice').waitFor();
  assert.match(await page.locator('#local-media-copy').textContent(),/允許讀取/);
  await page.evaluate(bytes=>{
    window.testImageReads=[];
    const file=(name)=>({kind:'file',getFile:async()=>{window.testImageReads.push(name);return new File([new Uint8Array(bytes)],name,{type:'image/png'});}});
    const dir=(name,children)=>({name,kind:'directory',async *entries(){yield* children;}});
    window.showDirectoryPicker=async options=>{window.testFolderMode=options.mode;return dir('project',[
      ['docs',dir('docs',[['Permission.md',file('Permission.md')],['secret.md',file('secret.md')]])],
      ['assets',dir('assets',[['auto.png',file('auto.png')],['unrelated.png',file('unrelated.png')]])],
    ]);};
  },[...png]);
  await page.locator('#local-media-folder-button').click();
  await page.locator('#local-media-notice').waitFor({state:'hidden'});
  await page.waitForFunction(()=>{const img=document.querySelector('#content img');return img?.complete&&img.naturalWidth>0;});
  assert.equal(await page.evaluate(()=>window.testFolderMode),'read');
  assert.deepEqual(await page.evaluate(()=>window.testImageReads),['auto.png']);
  assert.deepEqual(privateRequests,[]);assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  console.log('PASS: proactive readonly folder permission (only referenced bytes), local image folder, Chinese/encoded paths, reading + direct editing, unchanged Markdown/undo, 500-file responsive progress, no uploads/private-path requests, 1280/768/390/320 widths.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));await fs.rm(fixture,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
