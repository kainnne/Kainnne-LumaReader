'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,_electron:electron}=require('playwright-core'),{LocalReaderService}=require('../src/local-server'),{pdfOptions}=require('../src/pdf-export');
async function main(){
 const root=await fs.mkdtemp('/private/tmp/luma-pdf-layout-'),service=new LocalReaderService({rendererRoot:path.resolve('renderer'),libraryRoot:root});let browser,application;
 const port=await service.listen();
 try {
  let page;
  if(process.env.LUMA_PDF_ELECTRON){
    const wrapper=path.join(root,'main.cjs');await fs.writeFile(wrapper,`const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(path.join(root,'profile'))});let window;app.whenReady().then(()=>{window=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{backgroundThrottling:false}});window.loadURL('about:blank');});`);
    application=await electron.launch({args:[wrapper]});page=await application.firstWindow();
  }else{browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});page=await browser.newPage({viewport:{width:1280,height:900}});}
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=1800;const x=c.getContext('2d');x.fillStyle='#e4e4e4';x.fillRect(0,0,600,1800);x.fillStyle='#ed143d';x.fillRect(0,0,600,90);x.fillStyle='#164bdf';x.fillRect(0,1710,600,90);x.fillStyle='#18af46';x.fillRect(0,0,30,1800);x.fillRect(570,0,30,1800);return c.toDataURL().split(',')[1];});
  await fs.writeFile(path.join(root,'tall.png'),Buffer.from(png,'base64'));
  const paragraph='This paragraph should flow across pages without carrying a whole section with it. 中文段落應自然跨頁，不能只剩一個標題。 '.repeat(8);
  const wide=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1800;c.height=300;const x=c.getContext('2d');x.fillStyle='#e4e4e4';x.fillRect(0,0,1800,300);x.fillStyle='#e800e8';x.fillRect(0,0,90,300);x.fillStyle='#00c8e8';x.fillRect(1710,0,90,300);return c.toDataURL().split(',')[1];});await fs.writeFile(path.join(root,'wide.png'),Buffer.from(wide,'base64'));
  const markdown='# OPENING_TITLE\n\nOpening body text.\n\n## IMAGE_HEADING\n\n![Tall image](tall.png)\n\nIMAGE_END\n\n## TABLE_HEADING\n\n| ID | Description |\n| --- | --- |\n'+Array.from({length:40},(_,i)=>`| ROW_${i} | Table content ${i} |`).join('\n')+'\n\n'+Array.from({length:8},(_,i)=>`## SECTION_${i}\n\nSTART_${i} ${paragraph} END_${i}\n`).join('\n')+'\n## LAST_IMAGE 長標題的圖片也應完整呈現，標題自動換行後仍與圖片在同一頁，不能獨自留在前一頁。\n\n![Final image](tall.png)\n\nIMAGE_CAPTION\n\n## WIDE_IMAGE\n\n![Wide image](wide.png)\n\nDOCUMENT_END\n';
  await fs.writeFile(path.join(root,'layout.md'),markdown);
  let cache;await page.exposeFunction('__preview',async options=>{const settings=pdfOptions(options.footerText,options);const bytes=application?Buffer.from(await application.evaluate(async({BrowserWindow},options)=>[...await BrowserWindow.getAllWindows()[0].webContents.printToPDF(options)],settings)):await page.pdf(settings);cache={bytes,options};return{ok:true,previewId:'test',bytes:[...bytes]};});
  await page.addInitScript(()=>{window.lumaDesktop={isDesktop:true,platform:'darwin',getPreferences:async()=>({language:'zh-Hant',readerDefaultsVersion:8,onboardingVersion:5,languagePromptSeen:true,sidebarCollapsed:true,toolbarVisibility:{exportPdf:true}}),setPreferences:async()=>({}),getLibrary:async()=>({}),documentActivated:async()=>({}),onLibraryChanged:()=>{},onSaveRequested:()=>{},onFontSizeRequested:()=>{},previewPdf:async o=>{const r=await window.__preview(o);return{...r,bytes:new Uint8Array(r.bytes)};},releasePdf:async()=>({ok:true}),exportPdf:async()=>({canceled:true})};});
  await page.goto(`http://127.0.0.1:${port}/?source=layout.md`);await page.locator('#content h1').waitFor();await page.locator('#export-pdf').click();
  const ready=()=>page.waitForFunction(()=>!document.querySelector('#pdf-save').disabled,{},{timeout:30000});await ready();
  const results=[];
  const cases=['16:9','A4','Letter','4:3'].flatMap(preset=>['landscape','portrait'].map(orientation=>({preset,orientation,font:18,inset:6,frame:false})));
  cases.push({preset:'16:9',orientation:'landscape',font:22,inset:14,frame:true},{preset:'16:9',orientation:'landscape',font:8,inset:6,frame:false});
  for(const {preset,orientation,font,inset,frame} of cases.filter(c=>!process.env.LUMA_PDF_QUICK||(c.preset==='16:9'&&c.orientation==='landscape'&&c.font===22))){
   if(frame)await page.evaluate(()=>document.documentElement.dataset.palette='lavender-mist');
   await page.locator('#pdf-font-size').fill(String(font));await page.locator('#pdf-inset').selectOption(String(inset));await page.locator('#pdf-color-frame').setChecked(frame);
   await page.locator('#pdf-paper').selectOption(preset);await page.locator('#pdf-orientation').selectOption(orientation);await ready();
   const label=preset.replace(':','-')+'-'+orientation+'-'+font+(frame?'-frame':'');await fs.writeFile(path.join(root,label+'.pdf'),cache.bytes);
   const pages=await page.evaluate(async bytes=>{
    const lib=await import('/vendor/pdfjs/pdf.min.mjs'),task=lib.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useWasm:false}),pdf=await task.promise,out=[];
    for(let n=1;n<=pdf.numPages;n++) {const p=await pdf.getPage(n),items=(await p.getTextContent()).items,text=items.map(i=>i.str).join(' '),baselines=items.filter(i=>i.str.trim()).map(i=>p.view[3]-i.transform[5]),v=p.getViewport({scale:1}),c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);const ctx=c.getContext('2d');await p.render({canvasContext:ctx,viewport:v}).promise;const pixels=ctx.getImageData(0,0,c.width,c.height).data;let red=0,blue=0,magenta=0,cyan=0;for(let k=0;k<pixels.length;k+=4){const r=pixels[k],g=pixels[k+1],b=pixels[k+2];if(r>180&&g<65&&b<110)red++;if(b>150&&r<65&&g<120)blue++;if(r>180&&g<50&&b>180)magenta++;if(r<50&&g>150&&b>180)cyan++;}out.push({page:n,text,red,blue,magenta,cyan,minBaseline:Math.min(...baselines),maxBaseline:Math.max(...baselines),height:p.view[3]});}
    await task.destroy();return out;
   },[...cache.bytes]);results.push({label,pages});
   console.log(label,JSON.stringify({pages:pages.length,imagePages:pages.filter(p=>p.red||p.blue||p.magenta||p.cyan).map(p=>({page:p.page,red:p.red,blue:p.blue,magenta:p.magenta,cyan:p.cyan,text:p.text.slice(0,80)}))}));
   if(!process.env.LUMA_PDF_BASELINE){
    for(const p of pages){assert.ok(p.minBaseline>=(4+inset)*72/25.4-1,label+' top padding on page '+p.page);assert.ok(p.maxBaseline<=p.height-((frame?7:11)+inset)*72/25.4+2,label+' bottom padding on page '+p.page);}
    const imagePages=pages.filter(p=>p.red>10||p.blue>10);assert.equal(imagePages.length,2,label+' has two complete images');
    for(const p of imagePages)assert.ok(p.red>10&&p.blue>10&&Math.abs(p.red-p.blue)/Math.max(p.red,p.blue)<.20,label+' clips an image on page '+p.page);
    for(let i=0;i<8;i++){const p=pages.find(p=>p.text.includes('SECTION_'+i));assert.ok(p?.text.includes('START_'+i),label+' orphan heading '+i);}
    for(const title of ['IMAGE_HEADING','LAST_IMAGE']) {const p=pages.find(p=>p.text.includes(title));assert.ok(p?.red>10&&p?.blue>10,label+' image heading orphan: '+title);}
    const widePages=pages.filter(p=>p.magenta>10||p.cyan>10);assert.equal(widePages.length,1,label+' wide image split');assert.ok(widePages[0].magenta>10&&widePages[0].cyan>10,label+' wide image cropped');
    assert.ok(pages.find(p=>p.text.includes('TABLE_HEADING')).text.includes('ROW_0'),label+' orphan table heading');
    for(let i=0;i<40;i++)assert.ok(pages.some(p=>p.text.includes('ROW_'+i)),label+' missing row '+i);
    if(font===18)assert.ok(pages[0].text.includes('IMAGE_HEADING')&&pages[0].red>10,label+' avoidable first-page gap');
    assert.ok(pages.some(p=>p.text.includes('DOCUMENT_END')),label+' missing end');
   }
  }
  await page.locator('#pdf-close').click();await page.waitForFunction(()=>!document.querySelector('#export-pdf').disabled);assert.equal(await page.locator('#content [data-pdf-image-caption]').count(),0);assert.equal(await page.locator('#content img').evaluateAll(imgs=>imgs.every(i=>!i.style.getPropertyValue('--pdf-image-height')&&i.loading==='lazy')),true);assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(root,'results.json'),JSON.stringify(results,null,2));console.log('Fixture:',root);
 }finally{await browser?.close();await application?.close();await service.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
