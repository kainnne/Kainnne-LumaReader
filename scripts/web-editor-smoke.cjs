'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
async function main(){
 const root=path.resolve('site');const server=http.createServer(async(req,res)=>{try{let file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)&&file!==root)throw Error('path');if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,page;
 try{
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1360,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('lumareader-web-preferences-v1',JSON.stringify({readerDefaultsVersion:6,onboardingVersion:5,language:'zh-Hant',languagePromptSeen:true})));
  const origin=`http://127.0.0.1:${server.address().port}`;
  await page.goto(origin+'/web/');await page.locator('#edit-document').waitFor();
  if(await page.locator('#onboarding').isVisible())await page.locator('#onboarding-skip').click();
  await page.locator('#edit-document').click();await page.locator('.direct-prose').waitFor();assert.equal(await page.locator('#show-markdown').getAttribute('aria-pressed'),'false');
  await page.locator('#show-markdown').click();await page.locator('#source-editor').waitFor();assert.equal(await page.locator('#editor-preview-toggle').isChecked(),true);
  const source=await page.locator('#source-editor').inputValue();await page.locator('#source-editor').fill(source+'\nWeb 1.4 test\n');await page.locator('#show-markdown').click();assert.ok((await page.locator('.direct-prose').innerText()).includes('Web 1.4 test'));
  await page.locator('#edit-document').click();await page.waitForFunction(()=>document.querySelector('#edit-document-label').textContent==='已儲存'||document.querySelector('#edit-document-label').textContent==='Saved');await page.locator('#cancel-edit').click();
  await page.locator('#edit-document').click();assert.equal(await page.locator('#show-markdown').getAttribute('aria-pressed'),'false');await page.locator('#cancel-edit').click();
  assert.equal(await page.locator('#export-pdf').isVisible(),false);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);await page.screenshot({path:'/private/tmp/luma14-web-mobile.png'});
  await page.goto(origin+'/');await page.setViewportSize({width:1360,height:950});await page.locator('.language-toggle').click();await page.waitForFunction(()=>document.querySelector('[data-copy=release-1-title]').textContent.includes('直接'));assert.ok((await page.locator('[data-copy=release-1-title]').innerText()).includes('直接'));assert.ok((await page.locator('[data-copy=download-note]').innerText()).includes('1.4.0'));await page.screenshot({path:'/private/tmp/luma14-site.png'});
  assert.deepEqual(errors,[]);console.log('PASS Web direct/source toggle, preview, edit/save, new-session default, mobile rendering, and bilingual release copy.');
 }catch(error){if(page){await page.screenshot({path:"/private/tmp/luma14-web-failure.png"});console.error((await page.locator("body").innerText()).slice(-1600));}throw error;}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
