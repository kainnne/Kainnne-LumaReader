'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core'),{LocalReaderService}=require('../src/local-server');
const {normalizeSettingsMenu,settingsMenuTemplate}=require('../src/settings-menu');
async function main(){
 const root=await fs.mkdtemp('/private/tmp/luma-settings-');await fs.writeFile(path.join(root,'test.md'),'# 設定測試\n\n原文、編輯與預覽仍可正常使用。\n');
 const service=new LocalReaderService({rendererRoot:path.resolve('renderer'),libraryRoot:root});const port=await service.listen();let browser,menu;
 const prefs={language:'zh-Hant',readerDefaultsVersion:6,toolbarVisibility:{language:true,textSize:true,settings:true},onboardingVersion:5,languagePromptSeen:true};
 try{
 browser=await chromium.launch({headless:true,executablePath:process.env.LUMA_CHROMIUM_EXECUTABLE});const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.exposeFunction('__save',async p=>({ok:true,document:await service.saveMarkdownDocument(p.path,p.text,p.expectedModifiedNs,p.expectedRevision)}));
 await page.exposeFunction('__prefs',p=>Object.assign(prefs,p||{}));await page.exposeFunction('__menu',m=>{menu=settingsMenuTemplate(normalizeSettingsMenu(m),c=>page.evaluate(c=>window.__settings(c),c));});
 await page.addInitScript(()=>{window.lumaDesktop={isDesktop:true,platform:'darwin',saveDocument:p=>__save(p),getPreferences:()=>__prefs(),setPreferences:p=>__prefs(p),updateSettingsMenu:m=>__menu(m),onSettingsRequested:f=>window.__settings=f,getLibrary:async()=>({}),documentActivated:async()=>({}),onLibraryChanged:()=>{},onSaveRequested:()=>{},onFontSizeRequested:()=>{}};});
 await page.goto(`http://127.0.0.1:${port}/?source=test.md`);await page.locator('#content h1').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
 const item=(group,label)=>menu.submenu[group].submenu.find(x=>x.label===label);
 const waitMenu=async(fn)=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('Menu did not synchronize');};
 await waitMenu(()=>menu?.submenu[0].label==='開啟設定…');
 assert.equal(prefs.readerDefaultsVersion,8);
 const expectQuiet=async()=>{for(const id of ['language-toggle','font-up','font-down','source-view','media-view','export-pdf'])assert.equal(await page.locator('#'+id).isVisible(),false,id);for(const id of ['edit-document','reading-mode-toggle','palette-toggle'])assert.equal(await page.locator('#'+id).isVisible(),true,id);};
 await expectQuiet();await page.screenshot({path:path.join(root,'reading-default.png')});
 await menu.submenu[0].click();await page.locator('[data-toolbar-visibility=settings]').check();await page.locator('#palette-toggle').waitFor();await page.locator('[data-toolbar-visibility=settings]').uncheck();await page.locator('#palette-toggle').waitFor({state:'hidden'});await waitMenu(()=>item(2,'設定按鈕').checked===false);
 // The hidden gear must never hide its own panel, or block native reopening.
 assert.equal(await page.locator('#palette-menu').isVisible(),true);await page.locator('#appearance-close').click();await menu.submenu[0].click();await page.locator('#palette-menu').waitFor();
 assert.ok(await page.locator('#palette-menu').evaluate(e=>{const r=e.getBoundingClientRect();return r.x>innerWidth/2&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));
 await page.screenshot({path:path.join(root,'settings-with-hidden-button.png')});
 await item(2,'設定按鈕').click({checked:true});await page.locator('#palette-toggle').waitFor();assert.equal(await page.locator('[data-toolbar-visibility=settings]').isChecked(),true);
 await item(2,'原文').click({checked:true});await page.locator('#source-view').waitFor();assert.equal(await page.locator('[data-toolbar-visibility=source]').isChecked(),true);
 await item(3,'深色模式').click();await page.waitForFunction(()=>document.documentElement.classList.contains('dark'));assert.equal(await page.locator('#theme-dark').getAttribute('class'),'active');
 await page.waitForTimeout(200);await menu.submenu[0].click();await page.locator('#theme-light').click();await waitMenu(()=>item(3,'明亮模式').checked===true);
 await item(4,'月光藍').click();await page.waitForFunction(()=>document.documentElement.dataset.palette==='moonlight-blue');assert.equal(await page.locator('button[data-palette=moonlight-blue]').getAttribute('aria-checked'),'true');
 await page.waitForTimeout(200);await menu.submenu[0].click();await page.locator('button[data-palette=dream-rose]').click();await waitMenu(()=>item(4,'夢幻粉櫻').checked===true);
 await item(5,'English').click();await waitMenu(()=>menu.submenu[0].label==='Open Settings…');assert.equal(await page.locator('#settings-language').inputValue(),'en');
 await page.locator('#settings-language').selectOption('zh-Hant');await waitMenu(()=>menu.submenu[0].label==='開啟設定…');
 await item(2,'設定按鈕').click({checked:false});await page.reload();await page.locator('#content h1').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);await page.locator('#palette-toggle').waitFor({state:'hidden'});await waitMenu(()=>item(2,'設定按鈕').checked===false);await menu.submenu[0].click();await page.locator('#palette-menu').waitFor();
 await menu.submenu.at(-1).click();await page.locator('#palette-toggle').waitFor();await waitMenu(()=>item(2,'設定按鈕').checked===true);await expectQuiet();assert.equal(await page.locator('#source-view').isVisible(),false);
 await page.keyboard.press('Escape');await page.locator('#edit-document').click();await page.locator('.direct-prose').waitFor();
 const boxes=async()=>Promise.all(['edit-document','cancel-edit','show-markdown','editor-insert-toggle','reading-mode-toggle'].map(id=>page.locator('#'+id).boundingBox()));
 const stable=(a,b)=>a.forEach((r,i)=>{assert.ok(Math.abs(r.x-b[i].x)<1,'action x moved '+i);assert.ok(Math.abs(r.width-b[i].width)<1,'action width moved '+i);});
 assert.equal(await page.locator('#show-markdown').getAttribute('aria-label'),'顯示原文');const before=await boxes();
 await page.screenshot({path:path.join(root,'editing-direct.png')});
 await page.locator('#show-markdown').click();await page.locator('#source-editor').waitFor();assert.equal(await page.locator('#editor-preview-toggle').isChecked(),true);assert.equal(await page.locator('#show-markdown').getAttribute('aria-label'),'返回直接編輯');
 stable(before,await boxes());const preview=await page.locator('#editor-preview-control').boundingBox(),save=await page.locator('#edit-document').boundingBox();assert.ok(preview.x+preview.width<=save.x);
 await page.locator('#editor-preview-control').click();assert.equal(await page.locator('#editor-preview-toggle').isChecked(),false);stable(before,await boxes());await page.locator('#editor-preview-control').click();assert.equal(await page.locator('#editor-preview-toggle').isChecked(),true);await page.screenshot({path:path.join(root,'editing-source.png')});
 // Save / Saved text and returning to direct editing must not move other actions.
 await page.locator('#edit-document').click();stable(before,await boxes());await page.locator('#show-markdown').click();await page.locator('.direct-prose').waitFor();assert.equal(await page.locator('#editor-preview-control').isVisible(),false);stable(before,await boxes());
 for(const width of [768,390]){await page.setViewportSize({width,height:900});assert.equal(await page.locator('#edit-document-label').isVisible(),true);const a=await boxes();await page.locator('#show-markdown').click();await page.locator('#source-editor').waitFor();stable(a,await boxes());await page.screenshot({path:path.join(root,'editing-'+width+'.png')});await page.locator('#show-markdown').click();}
 // An explicit choice after migration survives reopening; migration is one-time.
 await page.locator('#cancel-edit').click();await menu.submenu[0].click();await item(2,'設定按鈕').click({checked:true});await page.reload();await page.locator('#content h1').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);await page.locator('#palette-toggle').waitFor();

 assert.deepEqual(errors,[]);console.log('PASS native menu / panel bidirectional visibility, palette, theme, language; hidden gear recovery, persistence, reset, source + preview. '+root);
 }finally{await browser?.close();await service.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
