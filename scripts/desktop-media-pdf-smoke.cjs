'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {_electron:electron}=require('playwright-core');
// Two distinct 240ms frames, looping forever; import must preserve these exact bytes.
const gif=Buffer.from('R0lGODlhGAAYAIEAAO52pwAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQAGAAAACwAAAAAGAAYAAAIKQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDPgwIACH5BAEYAAEALAAAAAAYABgAgVN97AAAAAAAAAAAAAgpAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWLGDNq3Mixo8ePIEM+DAgAOw==','base64');
async function main(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'luma-media-pdf-')),repo=path.resolve('.');let app;
 const doc=path.join(root,'GIF 動畫與 PDF.md'),asset=path.join(root,'動畫.GIF');
 await fs.writeFile(asset,gif);await fs.writeFile(doc,'# GIF 動畫與 PDF\n\n![動畫](動畫.GIF)\n\n本機動畫播放測試。\n');
 const appData=path.join(root,'app-data');await fs.mkdir(path.join(appData,'Kainnne LumaReader'),{recursive:true});
 await fs.writeFile(path.join(appData,'Kainnne LumaReader','settings.json'),JSON.stringify({preferences:{language:'zh-Hant',readerDefaultsVersion:8,onboardingVersion:5,languagePromptSeen:true,sidebarCollapsed:true,toolbarVisibility:{exportPdf:true}}}));
 const wrapper=path.join(root,'main.cjs');await fs.writeFile(wrapper,`const {app,BrowserWindow,dialog}=require('electron');app.setPath('appData',${JSON.stringify(appData)});BrowserWindow.prototype.show=function(){};BrowserWindow.prototype.focus=function(){};dialog.showOpenDialog=async(window,options)=>{if(!options.filters.some(f=>f.extensions.includes('gif')))throw Error('GIF missing in picker');return {canceled:false,filePaths:[${JSON.stringify(asset)}]};};require(${JSON.stringify(path.join(repo,'src/main.js'))});`);
 try{
  app=await electron.launch({args:[wrapper,doc],timeout:30000});const page=await app.firstWindow();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('#content h1').waitFor();
  const animated=async selector=>{
    const image=page.locator(selector).first();await image.waitFor();await image.evaluate(i=>i.decode());
    const hashes=new Set();for(let i=0;i<8;i++){hashes.add(crypto.createHash('sha256').update(await image.screenshot({animations:'allow'})).digest('hex'));await page.waitForTimeout(95);}
    assert.ok(hashes.size>1,selector+' must animate, not display only the first frame');
  };
  await animated('#content img');await page.locator('#content img').click();await animated('#image-viewer-image');await page.locator('#image-viewer-close').click();
  await page.locator('#edit-document').click();await animated('.direct-prose img');
  // Native picker inserts GIF without converting it to a still image.
  await page.locator('.direct-prose').press('ControlOrMeta+End');await page.locator('#editor-insert-toggle').click();await page.locator('[data-markdown-command="image"]').click();
  await page.waitForFunction(()=>document.querySelector('#source-editor').value.includes('assets/'));assert.deepEqual(await fs.readFile(path.join(root,'assets','動畫.gif')),gif);
  await page.locator('#show-markdown').click();await page.locator('[data-editor-mode=source]').click();
  await page.evaluate(()=>{const i=document.createElement('input');i.type='file';i.id='qa-gif';i.hidden=true;document.body.append(i);});await page.locator('#qa-gif').setInputFiles(asset);
  await page.evaluate(()=>{const data=new DataTransfer();data.items.add(document.querySelector('#qa-gif').files[0]);document.querySelector('#source-editor').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data}));});
  await page.waitForFunction(()=>document.querySelector('#source-editor').value.includes('-2.gif'));assert.deepEqual(await fs.readFile(path.join(root,'assets','動畫-2.gif')),gif);
  await page.locator('#edit-document').click();await page.waitForFunction(()=>!document.querySelector('#edit-document').disabled);await page.locator('#cancel-edit').click();
  await page.locator('#export-pdf').click();const ready=()=>page.waitForFunction(()=>!document.querySelector('#pdf-save').disabled,{},{timeout:30000});await ready();
  for(const preset of ['A4','Letter','16:9','4:3']) {
    await page.locator('#pdf-paper').selectOption(preset);
    for(const orientation of ['portrait','landscape']) {
      await page.locator('#pdf-orientation').selectOption(orientation);await ready();
      const result=await page.evaluate(async({pageSize,orientation})=>{
        const generated=await window.lumaDesktop.previewPdf({pageSize,orientation,includeFooter:false});if(!generated.ok)throw Error(generated.message);
        const lib=await import('./vendor/pdfjs/pdf.min.mjs'),task=lib.getDocument({data:generated.bytes,isEvalSupported:false,useWasm:false}),pdf=await task.promise,p=await pdf.getPage(1),view=p.getViewport({scale:1});
        const mm=window.LumaPdfTools.pageDimensions({pageSize,orientation});await task.destroy();return{width:view.width,height:view.height,mm};
      },{pageSize:preset,orientation});
      assert.ok(Math.abs(result.width-result.mm.width*72/25.4)<1&&Math.abs(result.height-result.mm.height*72/25.4)<1,JSON.stringify({preset,orientation,result}));
    }
  }
  await page.locator('#pdf-close').click();assert.deepEqual(errors,[]);
  console.log('PASS native Electron: looping GIF in reader/editor/zoom; picker and drop preserve GIF bytes; all 8 PDF size/orientation combinations.');
 }finally{if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy())).catch(()=>{});await app.close();}console.log('Fixture:',root);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
