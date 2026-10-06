'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright-core');
const gif=Buffer.from('R0lGODlhGAAYAIEAAO52pwAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQAGAAAACwAAAAAGAAYAAAIKQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDPgwIACH5BAEYAAEALAAAAAAYABgAgVN97AAAAAAAAAAAAAgpAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWLGDNq3Mixo8ePIEM+DAgAOw==','base64');
async function main(){
 const root=path.resolve('site'),server=http.createServer(async(req,res)=>{
  try{let f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))throw Error('path');if((await fs.stat(f)).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.LUMA_CHROMIUM_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const errors=[],posts=[];
  async function context(){
   const ctx=await browser.newContext();await ctx.addInitScript(()=>{if(location.protocol==='http:')localStorage.setItem('lumareader-web-preferences-v1',JSON.stringify({language:'zh-Hant',readerDefaultsVersion:8,onboardingVersion:5,sidebarCollapsed:true,languagePromptSeen:true}));});
   // No real uploads: intercept the existing short-link endpoint and the public GIF fixture.
   await ctx.route('https://lumareader-share.chaos60649.workers.dev/**',route=>{if(route.request().method()==='POST')posts.push(route.request().postDataJSON());return route.fulfill({status:503,body:'Test uses fallback URL'});});
   await ctx.route('https://gif.test/**',route=>route.fulfill({status:200,contentType:'image/gif',body:gif}));
   ctx.on('page',p=>{p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));});return ctx;
  }
  async function animated(page,selector){const img=page.locator(selector).first();await img.waitFor();await img.evaluate(i=>i.decode());const frames=new Set();for(let n=0;n<8;n++){frames.add(crypto.createHash('sha256').update(await img.screenshot({animations:'allow'})).digest('hex'));await page.waitForTimeout(95);}assert.ok(frames.size>1,selector+' should animate');}
  const ctx=await context(),page=await ctx.newPage();await page.goto(origin+'/web/');await page.locator('#boot-loader').waitFor({state:'hidden'});
  const text='# GIF 分享\n\n![網路 GIF](https://gif.test/animation.gif)\n\n![內嵌 GIF](data:image/gif;base64,'+gif.toString('base64')+')\n';
  await page.locator('#file-picker').setInputFiles({name:'GIF.md',mimeType:'text/markdown',buffer:Buffer.from(text)});
  await animated(page,'#content img[alt="網路 GIF"]');await animated(page,'#content img[alt="內嵌 GIF"]');
  const shared=await page.evaluate(text=>window.lumaWeb.createShareUrl({name:'GIF.md',text}),text);assert.equal(shared.ok,true);
  const receiverContext=await context(),receiver=await receiverContext.newPage();await receiver.goto(shared.url);await receiver.locator('#boot-loader').waitFor({state:'hidden'});
  await animated(receiver,'#content img[alt="網路 GIF"]');await animated(receiver,'#content img[alt="內嵌 GIF"]');
  const local='# 本機 GIF\n\n![本機 GIF](assets/動畫.gif)\n';await page.locator('#file-picker').setInputFiles({name:'Local.md',mimeType:'text/markdown',buffer:Buffer.from(local)});
  await page.locator('#local-media-picker').setInputFiles({name:'動畫.gif',mimeType:'image/gif',buffer:gif});await animated(page,'#content img[alt="本機 GIF"]');
  const resolved=await page.evaluate(async()=>{const info=window.lumaWeb.mediaInfo('assets/動畫.gif','Local.md');return {url:info.url,bytes:[...new Uint8Array(await info.asset.file.arrayBuffer())]};});assert.ok(resolved.url.startsWith('blob:'));assert.deepEqual(Buffer.from(resolved.bytes),gif);
  // Editor insertion must keep every GIF frame too (no canvas re-encoding).
  const inserted=await page.evaluate(bytes=>window.lumaDesktop.importImage({path:'Local.md',name:'inserted.GIF',bytes:new Uint8Array(bytes)}),[...gif]);assert.equal(inserted.ok,true);
  const resolvedInsert=await page.evaluate(async markdownPath=>{const info=window.lumaWeb.mediaInfo(markdownPath,'Local.md');return [...new Uint8Array(await info.asset.file.arrayBuffer())];},inserted.image.markdownPath);
  assert.deepEqual(Buffer.from(resolvedInsert),gif);
  assert.deepEqual(errors,[]);assert.ok(posts.every(p=>typeof p.target==='string'&&!p.assets),'Current sharing stores text target only');
  console.log('PASS Web GIF: local assets and inserted GIF preserve bytes; remote and inline GIF animate before sharing and in a fresh receiving browser. Existing local-asset upload remains a separate missing capability. No live uploads.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
