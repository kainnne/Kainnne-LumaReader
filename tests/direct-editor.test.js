const {test,before}=require('node:test');
const assert=require('node:assert/strict');
let editor,EditorState;
before(async()=>{editor=await import('../renderer/direct-editor.mjs');({EditorState}=await import('prosemirror-state'));});
const fixtures=[
  '# 標題\r\n\r\n原文 **粗體** 接著中文。\r\n',
  '| 欄位 | 數量 |\n| :--- | ---: |\n| A\\|B | `x\\|y` |\n',
  '$$\n\\frac{1}{\\frac{2}{\\frac{3}{4}}}\n$$\n\n行內 $\\frac{a}{b}$。\n',
  '---\ntitle: 文件\n---\n\n<!-- lumareader:pagebreak -->\n\n```mermaid\ngraph TD\nA-->B\n```\n',
  '[ref]: https://example.com "Title"\n\n[參考][ref] 與註解[^1]。\n\n[^1]: 註腳內容\n',
  '- [x] 完成\n- [ ] 尚未完成\n\n> [!NOTE]\n> 注意事項\n',
  '<details><summary>標題</summary>HTML 原文</details>\n\n![圖片](assets/a%20b.png)\n'
];
for(const [i,text] of fixtures.entries())test(`direct editing preserves unopened source exactly ${i}`,()=>{const parsed=editor.parseMarkdown(text);assert.equal(editor.serializeMarkdown(parsed.doc,parsed),text);parsed.doc.check();});
test('editing one paragraph preserves unrelated formula, table, HTML and directives verbatim',()=>{
  const text='Edit here.\n\n'+fixtures.join('\n\n'),parsed=editor.parseMarkdown(text);const state=EditorState.create({doc:parsed.doc});const changed=state.apply(state.tr.insertText('新增',1));const result=editor.serializeMarkdown(changed.doc,parsed);assert.ok(result.startsWith('新增Edit here.'));for(const fixture of fixtures)assert.ok(result.includes(fixture),fixture);assert.equal(editor.serializeMarkdown(parsed.doc,parsed),text);
});
test('table cells remain editable nodes and serialize pipes, alignment and inline format',()=>{
  const parsed=editor.parseMarkdown(fixtures[1]);let pos;parsed.doc.descendants((n,p)=>{if(n.isText&&n.text==='A|B')pos=p;});assert.ok(pos);
  const state=EditorState.create({doc:parsed.doc}),changed=state.apply(state.tr.insertText('中文|',pos));const result=editor.serializeMarkdown(changed.doc,parsed);const reparsed=editor.parseMarkdown(result);assert.equal(reparsed.doc.firstChild.type.name,'table');assert.equal(reparsed.doc.firstChild.childCount,2);assert.equal(reparsed.doc.firstChild.child(1).child(0).textContent,'中文|A|B');assert.equal(reparsed.doc.firstChild.child(0).child(1).attrs.align,'right');
});
test('task status serializes without losing task text',()=>{
  const parsed=editor.parseMarkdown('- [ ] Prepare\n');const state=EditorState.create({doc:parsed.doc});const li=state.doc.firstChild.firstChild;const changed=state.apply(state.tr.setNodeMarkup(1,null,{...li.attrs,checked:true}));assert.match(editor.serializeMarkdown(changed.doc,parsed),/\[x\] Prepare/);
});
test('editing beside an inline fraction or footnote preserves the syntax',()=>{
  const parsed=editor.parseMarkdown('Text $\\frac{a}{b}$ and note[^n].\n\n[^n]: source\n');const state=EditorState.create({doc:parsed.doc});const changed=state.apply(state.tr.insertText('New ',1));const result=editor.serializeMarkdown(changed.doc,parsed);assert.ok(result.includes('$\\frac{a}{b}$'));assert.ok(result.includes('[^n]'));assert.ok(result.includes('[^n]: source'));
});
test('unsafe active image and link schemes are rejected',()=>{for(const value of ['javascript:alert(1)','java\nscript:alert(1)','file:///etc/passwd','data:text/html,x','//example.com/a'])assert.equal(editor.safeURL(value),'');assert.equal(editor.safeURL('assets/photo.png'),'assets/photo.png');assert.equal(editor.safeURL('https://example.com/a'),'https://example.com/a');});
test('CJK adjacent emphasis stays visually bold and code stays literal',()=>{const parsed=editor.parseMarkdown('**中文：**文字與 `**程式：**文字`\n');let marks=0;parsed.doc.descendants(n=>{if(n.isText&&n.marks.some(m=>m.type.name==='strong'))marks++;});assert.equal(marks,1);});
