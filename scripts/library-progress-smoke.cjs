'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core'),{LocalReaderService}=require('../src/local-server');
async function main(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'luma-library-progress-'));
 const paths=['資料夾/matched-1.md','資料夾/matched-2.md','資料夾/子資料夾/matched-3.md','另一個資料夾/matched-4.md'];
 for(const file of paths){await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),'# 測試文件\n\n資料夾掃描時仍然可以閱讀。\n');}
 const service=new LocalReaderService({rendererRoot:path.resolve('renderer'),libraryRoot:root});const port=await service.listen();let browser,phase=1,batches=0;
 const original=await service.scanLibrary();const files=paths.map(p=>original.files.find(f=>f.path===p));assert.ok(files.every(Boolean));
 service.scanLibrary=async({cursor=0}={})=>{batches++;const limit=phase===1?2:4;return {...original,files:files.slice(Number(cursor),limit),reset:Number(cursor)===0,nextCursor:limit,scan:{...original.scan,id:'progress-fixture',status:phase===3?'complete':'scanning',hasMore:phase!==3,complete:phase===3,filesFound:limit,directoriesScanned:phase===1?12:18,pendingDirectories:phase===3?0:7,elapsedMs:12400,retryAfterMs:75}};};
 try{
 browser=await chromium.launch({headless:true,executablePath:process.env.LUMA_CHROMIUM_EXECUTABLE});const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.addInitScript(()=>{window.lumaDesktop={isDesktop:true,platform:'darwin',getPreferences:async()=>({language:'zh-Hant',readerDefaultsVersion:8,onboardingVersion:5,languagePromptSeen:true}),setPreferences:async()=>({}),getLibrary:async()=>({}),documentActivated:async()=>({}),onLibraryChanged:()=>{},onSaveRequested:()=>{},onFontSizeRequested:()=>{}};});
 await page.goto(`http://127.0.0.1:${port}/?source=${encodeURIComponent(paths[0])}`);await page.locator('#content h1').waitFor();
 const status=page.locator('.library-index-status'),bar=status.getByRole('progressbar');await bar.waitFor();assert.match(await status.innerText(),/已檢查 12 個資料夾.*待處理 7 個.*已用 12s/s);assert.equal(await bar.getAttribute('aria-valuenow'),null);
 await bar.evaluate(el=>el.dataset.continuity='same');await page.waitForTimeout(400);assert.equal(await bar.getAttribute('data-continuity'),'same','progress node survives polling');await page.screenshot({path:path.join(root,'progress-pink.png')});
 await page.locator('#palette-toggle').click();await page.locator('button[data-palette=moonlight-blue]').click();await page.locator('#appearance-close').click();
 const barColor=await bar.evaluate(el=>getComputedStyle(el,'::after').backgroundColor);const accent=await bar.evaluate(el=>{const e=document.createElement('i');e.style.color='var(--accent)';el.appendChild(e);const c=getComputedStyle(e).color;e.remove();return c;});assert.equal(barColor,accent);
 await page.screenshot({path:path.join(root,'progress-blue.png')});
 await page.locator('#search').fill('matched');await page.waitForTimeout(190);
 const folder=page.locator('#files-panel > details').filter({has:page.locator(':scope > summary',{hasText:'資料夾'})}).first();
 await page.waitForFunction(()=>document.querySelector('#files-panel > details')?.open);
 await folder.locator(':scope > summary').click();assert.equal(await folder.getAttribute('open'),null);
 phase=2;await page.waitForFunction(()=>document.querySelector('.library-index-status')?.textContent.includes('4 份'));
 assert.equal(await bar.getAttribute('data-continuity'),'same','progress node survives new batches');
 assert.equal(await page.locator('#files-panel > details').filter({has:page.locator(':scope > summary',{hasText:/^資料夾$/})}).getAttribute('open'),null,'new scan results must respect manual collapse');
 await page.locator('#search').fill('matched-3');await page.locator('.file-button').filter({hasText:'matched-3'}).waitFor({state:'visible'});assert.equal(await page.locator('.file-button').filter({hasText:'matched-3'}).isVisible(),true,'a new query reveals its ancestors');
 await page.locator('#files-panel > details > summary').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#files-panel > details').getAttribute('open'),null,'keyboard collapse');await page.waitForTimeout(200);assert.equal(await page.locator('#files-panel > details').getAttribute('open'),null);
 await page.locator('#search').fill('');await page.waitForTimeout(190);assert.equal(await page.locator('#files-panel > details').filter({has:page.locator(':scope > summary',{hasText:/^資料夾$/})}).getAttribute('open'),'','clearing search restores normal folder state');
 await page.setViewportSize({width:390,height:844});await page.locator('#sidebar-toggle').click();await page.screenshot({path:path.join(root,'progress-narrow.png')});assert.ok(await status.evaluate(e=>e.getBoundingClientRect().right<=innerWidth));
 phase=3;await status.waitFor({state:'hidden'});assert.deepEqual(errors,[]);assert.ok(batches>=3);console.log('PASS progressive count/elapsed, indeterminate palette-matched progress, user collapse across scan batches, keyboard collapse, new-query reset, completion. Screenshots: '+root);
 }finally{await browser?.close();await service.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
