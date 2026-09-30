'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core'),{LocalReaderService}=require('../src/local-server');
async function main(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'luma-scroll-'));
 const markdown='# 捲動測試\n\n'+Array.from({length:100},(_,i)=>`第 ${i+1} 段：${'保持使用者目前的閱讀位置，不要自行跳回段落開頭。'.repeat(9)}\n\n`).join('')+'![Fixture](pixel.png)\n';
 await fs.writeFile(path.join(root,'test.md'),markdown);
 const service=new LocalReaderService({rendererRoot:path.resolve('renderer'),libraryRoot:root});const port=await service.listen();
 const webRoot=path.resolve('site');const server=http.createServer(async(req,res)=>{try{let f=path.resolve(webRoot,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(webRoot+path.sep))throw Error();if((await fs.stat(f)).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.LUMA_CHROMIUM_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const failures=[];
  for(const web of [false,true])for(const width of [1200,390]){
   const page=await browser.newPage({viewport:{width,height:850},hasTouch:width<600});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({web})=>{const prefs={language:'zh-Hant',readerDefaultsVersion:8,onboardingVersion:5,languagePromptSeen:true,sidebarCollapsed:true};localStorage.setItem('lumareader-web-preferences-v1',JSON.stringify(prefs));if(!web)window.lumaDesktop={isDesktop:true,platform:'darwin',getPreferences:async()=>prefs,setPreferences:async p=>Object.assign(prefs,p),getLibrary:async()=>({}),onLibraryChanged:()=>{},onSaveRequested:()=>{},onFontSizeRequested:f=>window.fontChange=f};},{web});
   await page.goto(web?`http://127.0.0.1:${server.address().port}/web/`:`http://127.0.0.1:${port}/?source=test.md`);
   if(web){await page.locator('#boot-loader').waitFor({state:'hidden'});await page.locator('#file-picker').setInputFiles({name:'test.md',mimeType:'text/markdown',buffer:Buffer.from(markdown)});}
   await page.locator('#content h1').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(450);
   await page.evaluate(()=>scrollTo({top:987,behavior:'instant'}));await page.waitForTimeout(80);
   const before=await page.evaluate(()=>scrollY);
   await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await page.waitForTimeout(400);
   const after=await page.evaluate(()=>scrollY);
   if(Math.abs(after-before)>1)failures.push({web,width,event:'resize',before,after});
   // A late image load must not restore an earlier position after a wheel gesture.
   await page.evaluate(()=>{document.querySelector('#content img').dispatchEvent(new Event('load'));window.dispatchEvent(new WheelEvent('wheel',{deltaY:170,bubbles:true}));scrollTo({top:1437,behavior:'instant'});});await page.waitForTimeout(400);
   const afterImage=await page.evaluate(()=>scrollY);if(Math.abs(afterImage-1437)>1)failures.push({web,width,event:'image + wheel',expected:1437,after:afterImage});
   // Simulate the mobile browser's changing chrome height during a gesture.
   await page.setViewportSize({width,height:790});await page.evaluate(()=>{window.dispatchEvent(new Event('touchmove'));scrollTo({top:1789,behavior:'instant'});});await page.waitForTimeout(400);
   const afterMobile=await page.evaluate(()=>scrollY);if(Math.abs(afterMobile-1789)>1)failures.push({web,width,event:'viewport height + touch',expected:1789,after:afterMobile});
   if(!web){await page.evaluate(()=>{window.fontChange(1);window.dispatchEvent(new WheelEvent('wheel',{deltaY:200}));scrollTo({top:2017,behavior:'instant'});});await page.waitForTimeout(400);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-2017)<=1,'font-layout work must yield to a new user gesture');}
   if(!web&&width===1200){
    const anchor=await page.evaluate(()=>{scrollTo({top:1500,behavior:'instant'});const blocks=[...document.querySelector('#content').children];const boundary=document.querySelector('.reader-bar').getBoundingClientRect().bottom+12;const i=blocks.findIndex(el=>el.getBoundingClientRect().bottom>=boundary);return{index:i,top:blocks[i].getBoundingClientRect().top};});
    await page.evaluate(()=>window.fontChange(1));await page.waitForTimeout(400);
    const topAfter=await page.evaluate(i=>document.querySelector('#content').children[i].getBoundingClientRect().top,anchor.index);assert.ok(Math.abs(topAfter-anchor.top)<=2,'Explicit font resize should preserve the intra-paragraph offset '+JSON.stringify({anchor,topAfter,scroll:await page.evaluate(()=>scrollY)}));
   }
   for(const mode of ['horizontal','paged-horizontal','paged-vertical']){
    await page.locator('#reading-mode').selectOption(mode,{force:true});await page.waitForTimeout(80);
    const axis=mode==='paged-vertical'?'scrollTop':'scrollLeft';
    const offset=await page.evaluate(axis=>{const el=document.querySelector('#content');el[axis]=333;return el[axis];},axis);
    await page.evaluate(()=>dispatchEvent(new Event('resize')));await page.waitForTimeout(350);
    assert.ok(Math.abs(await page.evaluate(axis=>document.querySelector('#content')[axis],axis)-offset)<=1,'Passive resize must preserve '+mode+' position');
   }
   assert.deepEqual(errors,[]);await page.close();
  }
  assert.deepEqual(failures,[],'Passive layout events must not move the reading position');
  console.log('PASS Desktop + Web at 1200/390: stable scroll after resize, late image load, wheel/touch and mobile viewport height changes; explicit font layout yields to new input.');
 }finally{await browser?.close();await service.close();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
