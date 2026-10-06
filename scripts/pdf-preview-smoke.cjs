'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright-core');const {LocalReaderService}=require('../src/local-server');const {pdfOptions}=require('../src/pdf-export');
async function main(){
 const root=await fs.mkdtemp('/private/tmp/luma141-pdf-qa-');
 const original='# PDF 乾淨輸出測試\n\n一般文字：這份文件會檢查中文字重。**粗體文字：繁體中文重點應清楚可見。**這段文字會自動換行，文件只依紙張和文字大小排版。右側捲軸、工具列和操作視窗都不應出現在 PDF，原本的 Markdown 文字和格式必須完整保留。\n\n表格應接在這段後面，不要整張跳頁。\n\n| 項目 | 狀態 | 說明 |\n| --- | --- | --- |\n'+Array.from({length:45},(_,i)=>`| Row ${i+1} | 檢查中 | 第 ${i+1} 列的內容，用來確認表格能夠逐列跨頁。 |`).join('\n')+'\n\n<!-- lumareader:pagebreak -->\n\n# 指定新頁 MANUAL\n\n'+Array.from({length:12},()=>'> 長引用可以分頁，不要整塊推到下一頁。這段文字用來檢查長段落的分頁。\n>\n').join('')+'\n```js\n'+Array.from({length:55},(_,i)=>`const value${i} = ${i};`).join('\n')+'\n```\n';
 await fs.writeFile(path.join(root,'test.md'),original);
 const service=new LocalReaderService({rendererRoot:path.resolve('renderer'),libraryRoot:root});const port=await service.listen();let browser;
 const prefs={language:'zh-Hant',readerDefaultsVersion:6,onboardingVersion:5,languagePromptSeen:true,sidebarCollapsed:true,toolbarVisibility:{exportPdf:true}};
 let cache=null,prints=0,activePrints=0,maxActive=0,savedBytes,cancelSave=true;const errors=[];
 try{
  browser=await chromium.launch({headless:true, ...(process.env.LUMA_CHROMIUM_EXECUTABLE ? {executablePath:process.env.LUMA_CHROMIUM_EXECUTABLE} : {})});const page=await browser.newPage({viewport:{width:1280,height:1000}});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.exposeFunction('__prefs',patch=>Object.assign(prefs,patch||{}));
  await page.exposeFunction('__preview',async options=>{activePrints++;maxActive=Math.max(maxActive,activePrints);try{const bytes=await page.pdf(pdfOptions(options.footerText,options));cache={options,bytes,previewId:String(++prints)};return {ok:true,previewId:cache.previewId,bytes:[...bytes]};}finally{activePrints--;}});
  await page.exposeFunction('__release',()=>{cache=null;return {ok:true};});
  await page.exposeFunction('__export',async payload=>{assert.equal(payload.previewId,cache.previewId);if(cancelSave){cancelSave=false;return{canceled:true};}savedBytes=cache.bytes;await fs.writeFile(path.join(root,'exported.pdf'),savedBytes);return{ok:true};});
  await page.addInitScript(()=>{window.lumaDesktop={isDesktop:true,platform:'darwin',getPreferences:()=>window.__prefs(),setPreferences:p=>window.__prefs(p),getLibrary:async()=>({}),documentActivated:async()=>({}),onLibraryChanged:()=>{},onSaveRequested:()=>{},onFontSizeRequested:()=>{},previewPdf:async p=>{const r=await window.__preview(p);return {...r,bytes:new Uint8Array(r.bytes)};},releasePdf:()=>window.__release(),exportPdf:p=>window.__export(p)};});
  await page.goto(`http://127.0.0.1:${port}/?source=test.md`);await page.locator('#export-pdf').click();
  const ready=()=>page.waitForFunction(()=>document.querySelector('#pdf-options-dialog').open&&!document.querySelector('#pdf-save').disabled,{},{timeout:30000});await ready();console.log('Initial PDF ready');const originalMarkup=await page.locator('#content').innerHTML();
  assert.equal(await page.locator('.pdf-pagination,#pdf-position-layer,#pdf-break-page').count(),0,'Manual pagination UI is removed');
  assert.equal(await page.locator('#pdf-include-footer').isChecked(),false);assert.equal(await page.locator('#pdf-color-frame').isChecked(),false);
  const inspect=async bytes=>page.evaluate(async bytes=>{const lib=await import('/vendor/pdfjs/pdf.min.mjs');const task=lib.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useWasm:false});const pdf=await task.promise, pages=[];for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);const c=await p.getTextContent();pages.push({width:p.view[2],height:p.view[3],text:c.items.map(item=>item.str).join(' ')});}await task.destroy();return pages;},[...bytes]);
  let pages=await inspect(cache.bytes);await fs.writeFile(path.join(root,'initial.pdf'),cache.bytes);assert.ok(pages[0].text.includes('Row 1'),'First table row must stay on first page');assert.ok(pages[0].text.includes('Row 10'),'Table should use available space');
  assert.ok(pages.filter(p=>p.text.includes('Row ')).every(p=>p.text.replace(/\s/g,'').normalize('NFKC').includes('項目')),'Repeated table headings');
  const manual=pages.find(p=>p.text.includes('MANUAL'));assert.ok(manual&&!manual.text.includes('Row '),'Explicit page break preserved');
  await page.locator('#pdf-font-size').fill('8');await ready();assert.equal(cache.options.fontSize,8);assert.equal(await page.locator('#pdf-font-value').innerText(),'8 px');await page.locator('#pdf-font-size').fill('18');await ready();
  assert.equal(await page.locator('#pdf-annotations').evaluate(el=>el.closest('label').className),'pdf-option-check');
  assert.equal(await page.locator('.pdf-preview-header #pdf-save').count(),1);
  // Inspect the actual rendered PDF edge, not only the dialog or print CSS.
  const cleanEdges=await page.evaluate(async bytes=>{
    const lib=await import('/vendor/pdfjs/pdf.min.mjs'),task=lib.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useWasm:false}),pdf=await task.promise,results=[];
    for(let i=1;i<=pdf.numPages;i++){
      const p=await pdf.getPage(i),v=p.getViewport({scale:1.5}),canvas=document.createElement('canvas');canvas.width=Math.ceil(v.width);canvas.height=Math.ceil(v.height);const ctx=canvas.getContext('2d');await p.render({canvasContext:ctx,viewport:v}).promise;
      const edge=ctx.getImageData(canvas.width-24,0,24,canvas.height).data;let dirty=0;for(let k=0;k<edge.length;k+=4)if(Math.min(edge[k],edge[k+1],edge[k+2])<245)dirty++;
      results.push(dirty);
    }
    await task.destroy();return results;
  },[...cache.bytes]);assert.ok(cleanEdges.every(n=>n===0),'Plain PDF right edges must contain no scrollbar pixels: '+cleanEdges);
  await page.emulateMedia({media:'print'});
  const printState=await page.evaluate(()=>({hidden:[...document.querySelectorAll('.reader-bar,.sidebar,.pdf-options-dialog,.document-drop-hint')].every(el=>getComputedStyle(el).display==='none'),bars:[document.documentElement,document.body,document.querySelector('#content')].map(el=>({width:getComputedStyle(el).scrollbarWidth,overflow:getComputedStyle(el).overflow,webkit:getComputedStyle(el,'::-webkit-scrollbar').display}))}));
  assert.equal(printState.hidden,true);assert.ok(printState.bars.every(x=>x.width==='none'&&x.overflow==='visible'&&x.webkit==='none'));
  await page.emulateMedia({media:null});assert.notEqual(await page.locator('html').evaluate(el=>getComputedStyle(el).scrollbarWidth),'none','Screen scrollbar must remain usable');
  await fs.writeFile(path.join(root,'plain.pdf'),cache.bytes);await page.locator('.pdf-controls').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(root,'preview-plain.png')});
  // Every supported preset/direction must change the actual PDF MediaBox.
  for(const [preset,wide,tall] of [['A4',210,297],['Letter',215.9,279.4],['16:9',180,320],['4:3',210,280]]) {
    await page.locator('#pdf-paper').selectOption(preset);
    for(const direction of ['portrait','landscape']) {
      await page.locator('#pdf-orientation').selectOption(direction);await ready();
      const actual=await inspect(cache.bytes),w=(direction==='portrait'?wide:tall)*72/25.4,h=(direction==='portrait'?tall:wide)*72/25.4;
      assert.ok(actual.every(p=>Math.abs(p.width-w)<1&&Math.abs(p.height-h)<1),preset+' '+direction+' PDF dimensions');
      const text=actual.map(p=>p.text).join(' ');assert.ok(text.includes('Row 45')&&text.includes('value54'),'Complete content in '+preset+' '+direction);
      if(preset==='16:9') {await fs.writeFile(path.join(root,`ratio-${direction}.pdf`),cache.bytes);await page.screenshot({path:path.join(root,`ratio-${direction}.png`)});}
    }
  }
  await page.locator('#pdf-paper').selectOption('A4');await ready();
  await page.locator('#pdf-next').click();await page.waitForFunction(()=>document.querySelector('#pdf-page-count').textContent.startsWith('2 /'));assert.match(await page.locator('#pdf-page-count').innerText(),/^2/);
  await page.locator('#pdf-font-size').fill('14');assert.equal(await page.locator('#pdf-save').isDisabled(),true);await page.locator('#pdf-inset').selectOption('10');await page.locator('#pdf-paper').selectOption('Letter');await page.locator('#pdf-include-footer').check();await page.locator('#pdf-footer-text').fill('範例公司');await page.locator('#pdf-color-frame').check();await ready();
  console.log('Updated PDF ready');const selected=cache.bytes;pages=await inspect(selected);assert.equal(Math.round(pages[0].width),612);assert.equal(Math.round(pages[0].height),792);assert.ok(pages.every(p=>p.text.replace(/\s/g,'').normalize('NFKC').includes('範例公司')));
  await page.screenshot({path:path.join(root,'preview-color.png')});await page.locator('#pdf-save').click();await ready();assert.equal(await page.locator('#pdf-options-dialog').isVisible(),true);await page.locator('#pdf-save').click();await page.locator('#pdf-options-dialog').waitFor({state:'hidden'});assert.deepEqual(savedBytes,selected);console.log('Saved matching PDF');
  await page.waitForFunction(()=>!document.querySelector('#export-pdf').disabled);assert.equal(maxActive,1);assert.equal(cache,null);assert.equal(await page.locator('#content [data-pdf-break],#content [data-pdf-release-after]').count(),0);assert.equal(await fs.readFile(path.join(root,'test.md'),'utf8'),original);assert.equal(await page.locator('html').getAttribute('data-pdf-frame'),null);assert.equal(await page.locator('#content').innerHTML(),originalMarkup);
  await page.waitForFunction(()=>!document.querySelector('#export-pdf').disabled);console.log('Reopening for cancel');await page.locator('#export-pdf').click();await page.locator('#pdf-close').click();await page.waitForTimeout(600);assert.equal(cache,null);assert.deepEqual(errors,[]);
  for(const mode of ['horizontal','paged-horizontal','paged-vertical']){
    await page.locator('#reading-mode').selectOption(mode,{force:true});await page.locator('#export-pdf').click();await ready();
    const exportedPages=await inspect(cache.bytes),text=exportedPages.map(p=>p.text).join(' ');
    assert.ok(text.includes('Row 45')&&text.includes('value54'),'Export must retain end content in '+mode);
    assert.ok(!text.includes('儲存 PDF')&&!text.includes('放開以開啟文件'),'No application controls in '+mode);
    await page.emulateMedia({media:'print'});assert.equal(await page.locator('#content').evaluate(el=>getComputedStyle(el).overflow),'visible');assert.equal(await page.locator('#content').evaluate(el=>getComputedStyle(el,'::-webkit-scrollbar').display),'none');await page.emulateMedia({media:null});
    await page.locator('#pdf-close').click();await page.waitForFunction(()=>!document.querySelector('#export-pdf').disabled);
  }
  console.log(JSON.stringify({root,prints,maxActive,pages:pages.length,exportSHA256:crypto.createHash('sha256').update(savedBytes).digest('hex'),checks:'no pagination controls, clean PDF edge pixels, hidden print scrollbars, vertical/horizontal/paged export, table flow, 8px, exact saved bytes, cleanup'}));
 }catch(error){console.error(error);throw error;}finally{await browser?.close();await service.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
