const {test,before}=require('node:test'),assert=require('node:assert/strict');
let editor,annotations,contract,EditorState,TextSelection,history,undo,redo;
before(async()=>{editor=await import('../renderer/direct-editor.mjs');annotations=await import('../renderer/annotations.mjs');contract=await import('../site/embed/annotation-contract.js');({EditorState,TextSelection}=await import('prosemirror-state'));({history,undo,redo}=await import('prosemirror-history'));});
test('source offsets address the selected occurrence, UTF-16 and formatting without text search',()=>{
 const text='相同句子😀 **粗體** [連結](https://example.com)\n\n相同句子😀 結束\n',parsed=editor.parseMarkdown(text);let at;parsed.doc.descendants((n,p)=>{if(n.isText&&n.text.includes('結束'))at=p;});
 const ranges=editor.selectionSourceRanges(parsed.doc,parsed,at,at+6);assert.deepEqual(ranges,[{from:text.lastIndexOf('相同'),to:text.lastIndexOf('相同')+6}]);
 let strong;parsed.doc.descendants((n,p)=>{if(n.isText&&n.text==='粗體')strong=p;});const formatted=editor.selectionSourceRanges(parsed.doc,parsed,strong,strong+5);assert.ok(formatted);assert.equal(formatted.map(r=>text.slice(r.from,r.to)).join(''),'粗體 連結');
});
test('cross-block ranges include only text segments; unusual source remains unmapped instead of guessed',()=>{
 const text='第一段\n\n第二段\n',parsed=editor.parseMarkdown(text);const ranges=editor.selectionSourceRanges(parsed.doc,parsed,1,9);assert.deepEqual(ranges,[{from:0,to:3},{from:5,to:8}]);
 const special=editor.parseMarkdown('__粗體__\n');assert.equal(editor.selectionSourceRanges(special.doc,special,1,3),null);
});
test('anchors map with native text history and restore deletion, edits, undo and redo',()=>{
 const parsed=editor.parseMarkdown('前文 標記文字 結尾\n');let doc=parsed.doc.type.create({lumaAnnotations:[{id:'a',kind:'highlight',label:'',body:'',status:'active',anchor:{from:4,to:8,quote:'標記文字'}}]},parsed.doc.content);
 let state=EditorState.create({doc,plugins:[history()]});const dispatch=tr=>{state=state.apply(annotations.mapAnnotations(tr));};
 dispatch(state.tr.insertText('新',1));assert.equal(state.doc.attrs.lumaAnnotations[0].anchor.from,5);assert.equal(state.doc.attrs.lumaAnnotations[0].status,'active');
 undo(state,dispatch);assert.equal(state.doc.attrs.lumaAnnotations[0].anchor.from,4);redo(state,dispatch);assert.equal(state.doc.attrs.lumaAnnotations[0].anchor.from,5);
 const a=state.doc.attrs.lumaAnnotations[0];dispatch(state.tr.insertText('改',a.anchor.from+1));assert.equal(state.doc.attrs.lumaAnnotations[0].status,'needsReview');
 undo(state,dispatch);assert.equal(state.doc.attrs.lumaAnnotations[0].status,'active');redo(state,dispatch);
 const changed=state.doc.attrs.lumaAnnotations[0],markdown=editor.serializeMarkdown(state.doc,parsed),snapshot={schemaVersion:1,fingerprint:contract.fingerprint(markdown),treeFingerprint:contract.treeFingerprint(state.doc),items:[changed]};
 assert.equal(annotations.restoreAnnotations(snapshot,editor.parseMarkdown(markdown).doc,markdown)[0].status,'needsReview');
 dispatch(state.tr.delete(changed.anchor.from,changed.anchor.to));assert.equal(state.doc.attrs.lumaAnnotations[0].status,'orphaned');undo(state,dispatch);assert.equal(state.doc.attrs.lumaAnnotations[0].status,'needsReview');
 assert.equal(annotations.restoreAnnotations(snapshot,state.doc,'Changed outside Reader')[0].status,'orphaned');
});
test('annotation metadata cannot inject scripts, grow without bounds or become Markdown',()=>{
 assert.throws(()=>contract.cleanItem({id:'x',kind:'attachment',asset:{id:'a',url:'javascript:alert(1)'}}));assert.throws(()=>contract.cleanItem({id:'x',kind:'attachment',asset:{id:'a',url:'data:image/png;base64,a'}}));assert.throws(()=>contract.cleanActions(Array(6).fill({id:'a',label:'a'})));
 const parsed=editor.parseMarkdown('原稿\n'),doc=parsed.doc.type.create({lumaAnnotations:[{label:'<script>bad</script>'}]},parsed.doc.content);assert.equal(editor.serializeMarkdown(doc,parsed),'原稿\n');
});
test('list/table/paragraph boundaries map canonical text and reject partial unsupported source mappings',()=>{
 for(const raw of ['* first **bold**\n* second\n','| Name | Note |\n| --- | --- |\n| same | same😀 |\n']){const parsed=editor.parseMarkdown(raw);const segments=[];parsed.doc.descendants((n,p)=>{if(n.isText)segments.push({n,p});});for(const {n,p} of segments){const ranges=editor.selectionSourceRanges(parsed.doc,parsed,p,p+n.nodeSize);assert.ok(ranges,raw);assert.equal(ranges.map(r=>raw.slice(r.from,r.to)).join(''),n.text);}}
});
