'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {_electron:electron}=require('playwright-core');
async function main(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'luma-drop-')),repo=path.resolve('.');let app;
 const initial=path.join(root,'原稿.md'),next=path.join(root,'folder','拖入 中文.MD');
 await fs.mkdir(path.dirname(next));await fs.writeFile(initial,'# 原稿\n\n請保留未儲存的內容。\n');await fs.writeFile(next,'# 拖入成功\n\n![local](pixel.png)\n');await fs.writeFile(path.join(root,'folder','pixel.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64'));
 const appData=path.join(root,'app-data');await fs.mkdir(path.join(appData,'Kainnne LumaReader'),{recursive:true});await fs.writeFile(path.join(appData,'Kainnne LumaReader','settings.json'),JSON.stringify({preferences:{language:'zh-Hant',readerDefaultsVersion:8,onboardingVersion:5,languagePromptSeen:true,sidebarCollapsed:true}}));
 const wrapper=path.join(root,'main.cjs');await fs.writeFile(wrapper,`const {app,BrowserWindow}=require('electron');app.setPath('appData',${JSON.stringify(appData)});BrowserWindow.prototype.show=function(){};BrowserWindow.prototype.focus=function(){};require(${JSON.stringify(path.join(repo,'src/main.js'))});`);
 try{
  app=await electron.launch({args:[wrapper,initial],timeout:30000});const page=await app.firstWindow();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('#content h1').waitFor();
  const drop=async(target,paths)=>{await page.evaluate(()=>{document.querySelector('#qa-drop-input')?.remove();const i=document.createElement('input');i.type='file';i.multiple=true;i.id='qa-drop-input';i.hidden=true;document.body.append(i);});await page.locator('#qa-drop-input').setInputFiles(paths);await page.evaluate(target=>{const d=new DataTransfer();for(const f of document.querySelector('#qa-drop-input').files)d.items.add(f);const el=document.querySelector(target);for(const type of ['dragenter','dragover','drop'])el.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:d}));},target);};
  await page.locator('#edit-document').click();await page.locator('.direct-prose').waitFor();await page.locator('.direct-prose').press('ControlOrMeta+End');await page.keyboard.type(' UNSAVED');const draft=await page.locator('#source-editor').inputValue();
  const newWindow=app.waitForEvent('window');await drop('.direct-prose',[next]);const opened=await newWindow;await opened.locator('#content h1').waitFor();assert.equal(await opened.locator('#content h1').innerText(),'拖入成功');assert.ok(!(await opened.locator('#edit-document').isDisabled()));
  await opened.waitForFunction(()=>{const i=document.querySelector('#content img');return i?.complete&&i.naturalWidth>0;});assert.equal(await page.locator('#source-editor').inputValue(),draft);assert.ok(draft.includes('UNSAVED'));
  await drop('#source-editor',[next]);await page.waitForTimeout(500);assert.equal(app.windows().length,2,'Same document must reuse its window');assert.equal(await page.locator('#source-editor').inputValue(),draft);
  await page.locator('#show-markdown').click();await page.locator('[data-editor-mode=source]').click();await drop('#source-editor',[initial]);await page.waitForTimeout(300);assert.equal(app.windows().length,2);assert.equal(await page.locator('#source-editor').inputValue(),draft);
  // Keep the original source-editor image drop working alongside document drops.
  await drop('#source-editor',[path.join(root,'folder','pixel.png')]);await page.waitForFunction(()=>document.querySelector('#source-editor').value.includes('!['));
  assert.ok((await page.locator('#source-editor').inputValue()).includes('UNSAVED'));assert.equal(app.windows().length,2);
  const synthetic=await page.evaluate(()=>window.lumaDesktop.openDroppedDocuments([new File(['fake'],'fake.md')]));assert.equal(synthetic.code,'DROP_NO_PATH');
  const tooMany=await page.evaluate(()=>window.lumaDesktop.openDroppedDocuments(Array.from({length:9},()=>new File(['x'],'x.md'))));assert.equal(tooMany.code,'DROP_LIMIT');
  assert.equal(await page.locator('.document-drop-hint').isVisible(),false);assert.deepEqual(errors,[]);assert.equal(await fs.readFile(initial,'utf8'),'# 原稿\n\n請保留未儲存的內容。\n');
  console.log('PASS real Electron File → preload webUtils → validated IPC → native document window; Unicode paths, relative images, editable source, visual/source editors, unsaved draft preservation, deduplication and limits.');
 }finally{if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy())).catch(()=>{});await app.close();}console.log('Fixture:',root);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
