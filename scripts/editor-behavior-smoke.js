"use strict";
const assert = require("node:assert/strict");

// Runs in an isolated browser or packaged CI fixture, never a user's document.
async function checkEditorBehavior(page) {
  const editor = page.locator("#source-editor");
  await page.locator("#edit-document").click();
  assert.equal(await page.locator("#editor-preview-toggle").isChecked(), true);
  async function fixture(text, start=0, end=start) {
    await editor.evaluate((el, value) => {
      el.value=value.text; el.focus(); el.setSelectionRange(value.start,value.end);
      el.dispatchEvent(new Event("input", {bubbles:true}));
    }, {text,start,end});
    await page.waitForTimeout(350);
  }
  const text = "# Editing fixture\n\n選取這一段文字，確認粗體與復原。\n";
  const start=text.indexOf("選取"), end=start+7;
  await fixture(text,start,end);
  await page.locator("#editor-insert-toggle").click();
  assert.equal(await editor.evaluate(el=>document.activeElement===el),true,"Insert menu must retain visible native selection");
  assert.deepEqual(await editor.evaluate(el=>[el.selectionStart,el.selectionEnd]),[start,end]);
  await page.locator('[data-markdown-command="bold"]').click();
  const bold=text.slice(0,start)+"**"+text.slice(start,end)+"**"+text.slice(end);
  assert.equal(await editor.inputValue(),bold);
  assert.deepEqual(await editor.evaluate(el=>[el.selectionStart,el.selectionEnd]),[start+2,end+2]);
  await page.keyboard.press("ControlOrMeta+z");
  assert.equal(await editor.inputValue(),text,"One Undo must remove only the formatting");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  assert.equal(await editor.inputValue(),bold,"Redo must restore the format");
  await page.keyboard.press("ControlOrMeta+z");
  await editor.evaluate(el=>el.setSelectionRange(el.value.length,el.value.length));
  await page.keyboard.insertText("新增文字");
  assert.equal(await editor.inputValue(),text+"新增文字");
  await page.keyboard.press("ControlOrMeta+z");
  assert.equal(await editor.inputValue(),text,"Typing must still participate in Undo");
  await editor.evaluate(el=>el.setSelectionRange(el.value.length,el.value.length));
  await page.keyboard.press("Tab");
  assert.equal(await editor.inputValue(),text+"  ");
  await page.keyboard.press("ControlOrMeta+z");
  assert.equal(await editor.inputValue(),text,"Indentation must participate in Undo");

  for(const command of ["italic","link","heading-1","quote","code","task","table"]){
    await fixture(text,start,end);
    await page.locator("#editor-insert-toggle").click();
    await page.locator(`[data-markdown-command="${command}"]`).click();
    const formatted=await editor.inputValue();assert.notEqual(formatted,text,command);
    await page.keyboard.press("ControlOrMeta+z");assert.equal(await editor.inputValue(),text,`${command} undo`);
    await page.keyboard.press("ControlOrMeta+Shift+z");assert.equal(await editor.inputValue(),formatted,`${command} redo`);
  }
  await fixture(text,start,end);
  await page.locator("#editor-image-picker").setInputFiles({name:"undo-image.png",mimeType:"image/png",buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=","base64")});
  await page.waitForFunction(()=>document.querySelector("#source-editor").value.includes("undo-image"));
  const imageText=await editor.inputValue();
  await page.keyboard.press("ControlOrMeta+z");assert.equal(await editor.inputValue(),text,"image insertion undo");
  await page.keyboard.press("ControlOrMeta+Shift+z");assert.equal(await editor.inputValue(),imageText,"image insertion redo");

  const long=Array.from({length:50},(_,i)=>`## 段落 ${i}\n\n`+"這段中文用來確認狹窄預覽換行時不會拉動原文。".repeat(8)).join("\n\n");
  await fixture(long);
  for(const ratio of [.75,.25]) {
    await page.locator("#editor-preview-resizer").focus();
    await page.keyboard.press("Home");
    for(let i=0;i<13;i++) await page.keyboard.press(ratio>.5?"ArrowRight":"ArrowLeft");
    await editor.evaluate(el=>{el.focus();const at=el.value.indexOf("## 段落 15");el.setSelectionRange(at,at);el.scrollTop=1600;});
    await page.waitForTimeout(350);
    // Let the browser reveal the caret once; subsequent short input must not drift.
    await page.keyboard.insertText("開始");
    await page.waitForTimeout(350);
    await editor.evaluate(el=>el.scrollTop+=el.clientHeight/2);
    await page.waitForTimeout(100);
    const before=await editor.evaluate(el=>el.scrollTop);
    const samples=[];
    for(let i=0;i<12;i++){await page.keyboard.insertText("輸入");await page.waitForTimeout(220);samples.push(await editor.evaluate(el=>el.scrollTop));}
    assert.ok(samples.every(top=>Math.abs(top-before)<=2),`Typing drift at split ${ratio}: ${before} -> ${samples}`);
    const sourceBefore=await editor.evaluate(el=>el.scrollTop);
    await page.locator("#content").evaluate(el=>el.scrollTop+=180);
    await page.waitForTimeout(100);
    assert.ok(Math.abs(await editor.evaluate(el=>el.scrollTop)-sourceBefore)<=2,"Layout-driven preview scroll must not move source");
    await editor.hover(); await page.mouse.wheel(0,220); await page.waitForTimeout(200);
    assert.ok(Math.abs(await editor.evaluate(el=>el.scrollTop)-sourceBefore)>20,"User wheel must still move source");
  }
  await page.locator("#cancel-edit").click();
  if(await page.locator("#discard-edit-dialog").isVisible())await page.locator("#discard-edit-confirm").click();
  console.log("PASS editor undo/redo, insert selection, unequal-pane typing stability and wheel scrolling");
}
module.exports={checkEditorBehavior};
