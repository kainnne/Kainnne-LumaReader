'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright-core');
async function main(){
 const root=path.resolve('site'),server=http.createServer(async(req,res)=>{try{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('path');if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.LUMA_CHROMIUM_EXECUTABLE});
  for(const width of [1280,820,390]){const page=await browser.newPage({viewport:{width,height:844},hasTouch:width===390,isMobile:width===390});page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/web/`);await page.locator('#share-document').waitFor();
   const share=await page.locator('#share-document').boundingBox(),settings=await page.locator('#palette-toggle').boundingBox();assert.ok(share.x>=settings.x+settings.width-1);assert.ok(Math.abs(share.y-settings.y)<2);assert.equal(await page.locator('#share-document svg.share-symbol').count(),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.evaluate(()=>{const dt=new DataTransfer();dt.items.add(new File(['x'],'picture.png',{type:'image/png'}));const target=document.querySelector('#content');for(const type of ['dragenter','dragover','drop'])target.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:dt}));});assert.equal(await page.locator('#drop-overlay').isVisible(),false,'Reading images must not trigger an import overlay');
   await page.locator('#edit-document').click();await page.locator('.direct-prose').waitFor();await page.screenshot({path:`/private/tmp/luma-web-toolbar-${width}.png`});await page.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS Web share at far right on desktop, tablet and touch phone; editor still opens.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
