'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core'),{LocalReaderService}=require('../src/local-server');
async function main(){
  const root=await fs.mkdtemp('/private/tmp/luma-markdown-input-');await fs.writeFile(path.join(root,'typing.md'),'');
  const service=new LocalReaderService({rendererRoot:path.resolve('renderer'),libraryRoot:root});const port=await service.listen();let browser,page;const errors=[];
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.LUMA_CHROMIUM_EXECUTABLE});page=await browser.newPage({viewport:{width:1100,height:800}});
    await page.addInitScript(()=>{window.lumaDesktop={isDesktop:true,getPreferences:async()=>({language:'zh-Hant',readerDefaultsVersion:11,onboardingVersion:5,sidebarCollapsed:true}),setPreferences:async()=>({}),getLibrary:async()=>({}),documentActivated:async()=>({}),saveDocument:async()=>({}),onLibraryChanged(){},onSaveRequested(){},onFontSizeRequested(){}};});page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/?source=typing.md`);await page.locator('#edit-document').click();await page.locator('#direct-editor .direct-prose').waitFor();await page.evaluate(()=>{const host=document.createElement('section');host.id='typing-fixture';host.className='direct-editor';host.style.cssText='position:fixed;inset:0;z-index:9999;background:white;display:block';document.body.append(host);const source=document.createElement('textarea');source.id='typing-source';source.hidden=true;document.body.append(source);});const prose=page.locator('#typing-fixture .direct-prose');
    const reset=async()=>{await page.evaluate(()=>{window.typingEditor?.destroy();const host=document.querySelector('#typing-fixture');host.replaceChildren();document.querySelector('#typing-source').value='';window.typingEditor=LumaDirectEditor.create({element:host,text:'',language:'zh-Hant',onChange:text=>document.querySelector('#typing-source').value=text});typingEditor.focus();});await prose.waitFor();};
    await reset();await page.keyboard.type('### Heading');assert.equal(await prose.locator('h3').innerText(),'Heading');assert.match(await page.locator('#typing-source').inputValue(),/^### Heading/);
    await reset();await page.keyboard.type('**中文重點**');assert.equal(await prose.locator('strong').innerText(),'中文重點');assert.match(await page.locator('#typing-source').inputValue(),/^\*\*中文重點\*\*/);await page.keyboard.press('ControlOrMeta+z');assert.equal(await prose.locator('strong').count(),0);await page.keyboard.press('ControlOrMeta+Shift+z');assert.equal(await prose.locator('strong').innerText(),'中文重點');
    for(const [source,selector,text]of [['*italic*','em','italic'],['~~delete~~','s','delete'],['`a*b`','code','a*b'],['__bold__','strong','bold']]){await reset();await page.keyboard.type(source);assert.equal(await prose.locator(selector).innerText(),text);}
    await reset();await page.keyboard.type('1. First');assert.equal(await prose.locator('ol li').innerText(),'First');await page.keyboard.press('Enter');await page.keyboard.type('Second');assert.equal(await prose.locator('ol li').count(),2);assert.match(await page.locator('#typing-source').inputValue(),/2\. Second/);
    await reset();await page.keyboard.type('- [ ] Task');assert.equal(await prose.locator('.direct-task input').count(),1);assert.match(await page.locator('#typing-source').inputValue(),/[-*] \[ \] Task/);
    await reset();await page.keyboard.type('> Quote');assert.equal(await prose.locator('blockquote').innerText(),'Quote');
    await reset();await page.keyboard.insertText('## 貼上的標題');await page.keyboard.press('Enter');assert.equal(await prose.locator('h2').innerText(),'貼上的標題');assert.equal((await prose.locator('p').last().innerText()).trim(),'');
    await reset();await page.keyboard.insertText('一般 **粗體** 文字');await page.keyboard.press('Enter');assert.equal(await prose.locator('strong').innerText(),'粗體');
    await reset();await page.keyboard.type('```js');await page.keyboard.press('Enter');await page.keyboard.type('**literal**');assert.equal(await prose.locator('pre code').innerText(),'**literal**');assert.equal(await prose.locator('strong').count(),0);assert.match(await page.locator('#typing-source').inputValue(),/```js\n\*\*literal\*\*/);
    await reset();await page.keyboard.type('\\**literal**');assert.equal(await prose.locator('strong').count(),0);
    await reset();await page.keyboard.type('---');await page.keyboard.press('Enter');assert.equal(await prose.locator('hr').count(),1);assert.equal(await prose.locator('p').count(),1);
    // A native Chinese composition remains literal until it is committed.
    await reset();const cdp=await page.context().newCDPSession(page);await cdp.send('Input.imeSetComposition',{text:'中文輸入',selectionStart:4,selectionEnd:4});await cdp.send('Input.insertText',{text:'中文輸入'});await cdp.detach();assert.equal(await prose.innerText(),'中文輸入');
    assert.deepEqual(errors,[]);console.log('PASS Markdown typing: heading, CJK bold, italic, strike, inline code, numbered lists, tasks, quote, Enter conversion, fences, escaped literals, undo/redo and IME');
  }catch(e){if(page)await page.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error(root,errors);throw e;}finally{await browser?.close();await service.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
