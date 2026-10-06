'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {Marked}=require('../renderer/vendor/marked/marked.umd.js'),M=require('../renderer/report-model'),{ReportStore}=require('../src/report-store');
const marked=new Marked(),parse=text=>M.sections(text,marked.lexer(text));
test('Report sections retain exact Markdown including fenced headings, references and CRLF',()=>{for(const text of ['# A\n\nText\n\n## B\n\n```md\n# not a section\n```\n\n[ref]: image.png\n','intro\r\n\r\n# 一\r\n\r\n內文\r\n','plain text']){assert.equal(parse(text).map(s=>s.source).join(''),text);}assert.equal(parse('# A\n\n```md\n# B\n```').length,1);});
test('Reconciliation keeps placements after content edits and includes all new sections once',()=>{const first=parse('# A\n\na\n\n# B\n\nb\n'),layout=M.reconcile(null,first);layout.sheets[0].columns=2;const moved=M.move(layout,first[1].id,0,1);const changed=parse('# A\n\nchanged\n\n# B\n\nb\n\n# C\n\nc');const next=M.reconcile(moved,changed);assert.deepEqual(next.sheets[0].slots[1],[changed[1].id]);assert.deepEqual(next.sheets.flatMap(s=>s.slots.flat()).sort(),changed.map(s=>s.id).sort());const duplicate=structuredClone(next);duplicate.sheets[0].slots[0].push(changed[1].id);assert.equal(M.reconcile(duplicate,changed).sheets[0].slots.flat().length,3);});
test('Reducing grid columns/rows retains content and rejects invalid destinations',()=>{const items=parse('# A\n\na\n\n# B\n\nb'),l=M.reconcile(null,items);l.sheets[0].columns=3;l.sheets[0].rows=2;const moved=M.move(l,items[1].id,0,5);moved.sheets[0].columns=1;moved.sheets[0].rows=1;assert.equal(M.reconcile(moved,items).sheets[0].slots[0].length,2);assert.throws(()=>M.move(l,items[0].id,0,6));});
test('Layout validation bounds pages, sizes and footer, without persisting arbitrary properties',()=>{assert.throws(()=>M.clean({version:2,sheets:[]}));assert.throws(()=>M.clean({version:1,sheets:Array(101).fill({})}));const value=M.clean({version:1,sheets:[{columns:9,rows:9,slots:[]}],options:{fontSize:900,numberStart:-2,footerText:'a\u0000b',secret:'x'}});assert.equal(value.options.fontSize,16);assert.equal(value.options.numberStart,1);assert.equal(value.options.footerText,'a b');assert.equal(value.options.secret,undefined);assert.equal(value.sheets[0].columns,1);});
test('PDF layouts persist atomically in app data, separate for each document and never modify Markdown',async()=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'luma-report-store-'));try{const doc=path.join(root,'文稿.md');await fs.writeFile(doc,'# Keep me\n');const store=new ReportStore(path.join(root,'app-data')),layout=M.reconcile(null,parse('# Keep me\n'));assert.equal(await store.read(doc),null);await Promise.all([store.write(doc,layout),store.write(doc,{...layout,options:{...layout.options,numberStart:3}})]);assert.equal((await new ReportStore(store.root).read(doc)).options.numberStart,3);assert.equal(await store.read(path.join(root,'another.md')),null);assert.equal(await fs.readFile(doc,'utf8'),'# Keep me\n');assert.equal((await fs.readdir(store.root)).length,1);assert.equal((await fs.stat(store.file(doc))).mode&0o777,0o600);}finally{await fs.rm(root,{recursive:true,force:true});}});
test('Malformed optional PDF metadata cannot prevent opening a Markdown file',async()=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'luma-report-corrupt-'));try{const store=new ReportStore(root),doc='/document.md';await fs.writeFile(store.file(doc),'{incomplete');assert.equal(await store.read(doc),null);await fs.writeFile(store.file(doc),JSON.stringify({version:900,sheets:[]}));assert.equal(await store.read(doc),null);await fs.writeFile(store.file(doc),' '.repeat(2*1024*1024+1));assert.equal(await store.read(doc),null);}finally{await fs.rm(root,{recursive:true,force:true});}});
test('Text blocks preserve every source byte, including leading whitespace and link definitions',()=>{for(const source of ['\n\n# Intro\n\nA paragraph.\n\n![x][ref]\n\n[ref]: a.png\n','\r\n\r\n中文\r\n\r\n```js\r\nx()\r\n```\r\n',''])assert.equal(M.blocks(source,marked.lexer(source)).map(i=>i.source).join(''),source);});
test('Dragging creates adjacent columns and reorders without duplicates or rewriting text',()=>{const source='# Heading\n\nFirst.\n\nSecond.\n\nThird.\n',items=M.blocks(source,marked.lexer(source));let l=M.canvas(null,items);assert.equal(l.rows.length,items.length);l=M.place(l,items[2].id,items[1].id,'right');const row=l.rows[M.locate(l,items[1].id).row];assert.equal(row.cells.length,2);assert.equal(row.rule,true);l=M.place(l,items[3].id,items[1].id,'below');assert.deepEqual(l.rows[M.locate(l,items[1].id).row].cells[0].blocks,[items[1].id,items[3].id]);assert.deepEqual(l.rows.flatMap(r=>r.cells.flatMap(c=>c.blocks)).sort(),items.map(i=>i.id).sort());assert.equal(items.map(i=>i.source).join(''),source);assert.throws(()=>M.place(l,items[0].id,'missing','right'));});
test('Legacy PDF layouts migrate into flowing blocks, retaining options and all content exactly once',()=>{const source='# A\n\na\n\n# B\n\nb\n',oldItems=parse(source),old=M.reconcile(null,oldItems);old.sheets[0].columns=2;const assigned=M.move(old,oldItems[1].id,0,1),items=M.blocks(source,marked.lexer(source)),l=M.canvas(assigned,items,oldItems);assert.equal(l.version,2);assert.equal(l.rows[0].cells.length,2);assert.deepEqual(l.rows.flatMap(r=>r.cells.flatMap(c=>c.blocks)).sort(),items.map(i=>i.id).sort());assert.equal(l.options.pageSize,assigned.options.pageSize);});
test('PDF styling stays separate from Markdown and bounds ranges and column widths',()=>{const source='alpha beta\n\nsecond\n',items=M.blocks(source,marked.lexer(source)),l=M.canvas(null,items);l.styles[items[0].id]={fontSize:24,align:'center',ranges:[{from:0,to:5,fontSize:8},{from:10,to:5,fontSize:30},{from:0,to:5,fontSize:400}]};l.rows[0].weights=[999];const clean=M.clean(l);assert.equal(clean.styles[items[0].id].ranges.length,1);assert.equal(clean.styles[items[0].id].fontSize,24);assert.equal(clean.rows[0].weights[0],1);assert.equal(M.canvas(clean,items).styles[items[0].id].align,'center');assert.equal(items.map(i=>i.source).join(''),source);});

test('CRLF documents still expose individual draggable paragraphs and keep their original line endings',()=>{const text='# A\r\n\r\nfirst\r\n\r\nsecond\r\n';const items=M.blocks(text,marked.lexer(text));assert.equal(items.length,3);assert.equal(items.map(i=>i.source).join(''),text);});

// Layout text is a separate document, not a rewrite of the Markdown source.
test('PDF text drafts survive normalization, reconciliation and atomic storage without modifying Markdown',async()=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'luma-pdf-draft-'));try{const doc=path.join(root,'original.md'),original='# Original\r\n\r\nKeep this.\r\n',draft='# PDF report\n\nPDF-only paragraph.\n';await fs.writeFile(doc,original);const items=M.blocks(draft,marked.lexer(draft)),layout=M.canvas(null,items);layout.documentText=draft;layout.sourceHash=M.hash(original);const store=new ReportStore(path.join(root,'metadata'));await store.write(doc,layout);const saved=await store.read(doc);assert.equal(saved.documentText,draft);assert.equal(saved.sourceHash,M.hash(original));assert.equal(M.canvas(saved,items).documentText,draft);assert.equal(await fs.readFile(doc,'utf8'),original);assert.throws(()=>M.clean({...layout,documentText:'x'.repeat(500001)}));assert.throws(()=>M.clean({...layout,documentText:42}));}finally{await fs.rm(root,{recursive:true,force:true});}});

test('PDF drop targets favor a broad right column while retaining all left and central behavior',()=>{
 for(const x of [.02,.1,.5,.69]){assert.equal(M.dropEdge(x,.2),'above');assert.equal(M.dropEdge(x,.8),'below');}
 for(const x of [.70,.78,.9,.98])for(const y of [.02,.2,.5,.8,.98])assert.equal(M.dropEdge(x,y),'right');
 const original=(x,y)=>y<.34?'above':y>.66?'below':x<.14?'left':x>.86?'right':y<.5?'above':'below';
 for(const x of [0,.02,.13,.14,.3,.5,.69])for(const y of [0,.2,.34,.5,.66,.8,1])assert.equal(M.dropEdge(x,y),original(x,y));
});

test('Shift-style grouped placement retains canvas order and is atomic when a destination is invalid',()=>{
 const text='one\n\ntwo\n\nthree\n\nfour\n',items=M.blocks(text,marked.lexer(text)),ids=items.map(i=>i.id),initial=M.canvas(null,items);
 const right=M.placeMany(initial,[ids[2],ids[1]],ids[0],'right'),row=right.rows[M.locate(right,ids[0]).row];
 assert.deepEqual(row.cells.map(c=>c.blocks),[[ids[0]],[ids[1],ids[2]]]);assert.deepEqual(row.dividers,[true]);
 assert.deepEqual(M.placeMany(right,[ids[1],ids[2]],ids[1],'left'),right);
 const below=M.placeMany(right,[ids[1],ids[2]],ids[3],'below');assert.deepEqual(below.rows[M.locate(below,ids[3]).row].cells[0].blocks,[ids[3],ids[1],ids[2]]);
 const full=M.place(right,ids[3],ids[0],'left'),saved=JSON.stringify(full);assert.throws(()=>M.placeMany(full,['missing'],ids[0],'right'));assert.equal(JSON.stringify(full),saved);
 assert.equal(items.map(i=>i.source).join(''),text);assert.deepEqual(below.rows.flatMap(r=>r.cells.flatMap(c=>c.blocks)).sort(),ids.slice().sort());
});
test('Each PDF divider and compact spacing survive normalization and reconciliation without changing text',()=>{
 const text='left\n\nright\n\nthird\n\n---\n',items=M.blocks(text,marked.lexer(text)),ids=items.map(i=>i.id);let l=M.canvas(null,items);
 l=M.place(l,ids[1],ids[0],'right');l=M.place(l,ids[2],ids[0],'right');const at=M.locate(l,ids[0]);l=M.removeDivider(l,at.row,0);
 assert.deepEqual(l.rows[at.row].dividers,[false,true]);l.styles[ids[3]]={hidden:true};l.options.blockGap=0;l.options.ruleGap=2;
 const restored=M.canvas(JSON.parse(JSON.stringify(l)),items);assert.deepEqual(restored.rows[at.row].dividers,[false,true]);assert.equal(restored.styles[ids[3]].hidden,true);assert.equal(restored.options.blockGap,0);assert.equal(restored.options.ruleGap,2);
 assert.throws(()=>M.removeDivider(l,at.row,99));assert.equal(M.clean({...l,options:{...l.options,ruleGap:999}}).options.ruleGap,4);assert.equal(items.map(i=>i.source).join(''),text);
});

test('Persistent groups select complete members, merge safely and follow edited block IDs',()=>{
 const text='first\n\nsecond\n\nthird\n\nfourth\n',items=M.blocks(text,marked.lexer(text)),ids=items.map(i=>i.id);let l=M.canvas(null,items);
 l=M.createGroup(l,[ids[0],ids[1]]);assert.deepEqual(M.groupMembers(l,ids[1]),[ids[0],ids[1]]);assert.deepEqual(new Set(M.expandGroups(l,[ids[1],ids[2]])),new Set(ids.slice(0,3)));
 l=M.createGroup(l,[ids[1],ids[2]]);assert.deepEqual(l.groups,[ids.slice(0,3)]);assert.equal(M.ungroup(l,ids[0]).groups.length,0);assert.throws(()=>M.createGroup(M.canvas(null,items),[ids[3]]));
 assert.deepEqual(M.canvas(JSON.parse(JSON.stringify(l)),items).groups,l.groups);
 const edited='FIRST EDITED\n\nsecond\n\nthird\n\nfourth\n',changed=M.blocks(edited,marked.lexer(edited));l=M.replaceId(l,ids[0],changed[0].id);l=M.canvas(l,changed);assert.ok(M.groupMembers(l,changed[0].id).includes(ids[1]));assert.ok(!l.groups.flat().includes(ids[0]));assert.equal(items.map(i=>i.source).join(''),text);
});
test('PDF column deletion stays removed after reconciliation and preserves original Markdown',()=>{
 const text='keep\n\none\n\ntwo\n',items=M.blocks(text,marked.lexer(text)),ids=items.map(i=>i.id),base=M.createGroup(M.placeMany(M.canvas(null,items),ids.slice(1),ids[0],'right'),ids.slice(1));
 const deleted=M.removeBlocks(base,ids.slice(1));assert.equal(deleted.rows[0].cells.length,1);assert.equal(deleted.groups.length,0);assert.equal(deleted.styles[ids[1]].hidden,true);
 const reopened=M.canvas(JSON.parse(JSON.stringify(deleted)),items);assert.deepEqual(reopened.rows.flatMap(r=>r.cells.flatMap(c=>c.blocks)),[ids[0]]);assert.equal(reopened.styles[ids[2]].hidden,true);assert.equal(items.map(i=>i.source).join(''),text);
 const empty=M.canvas(M.removeBlocks(reopened,[ids[0]]),items);assert.equal(empty.rows.flatMap(r=>r.cells.flatMap(c=>c.blocks)).length,0);assert.throws(()=>M.removeBlocks(base,['missing']));assert.equal(base.rows[0].cells.length,2);
});

test('Individual text width and offset persist within their column without affecting neighbors or Markdown',()=>{
 const text='one\n\ntwo\n',items=M.blocks(text,marked.lexer(text)),base=M.canvas(null,items);base.styles[items[0].id]={widthPct:55,offsetPct:10};const restored=M.canvas(JSON.parse(JSON.stringify(base)),items);assert.equal(restored.styles[items[0].id].widthPct,55);assert.equal(restored.styles[items[0].id].offsetPct,10);assert.equal(restored.styles[items[1].id],undefined);assert.equal(items.map(i=>i.source).join(''),text);const invalid=M.clean({...base,styles:{[items[0].id]:{widthPct:2,offsetPct:99}}});assert.equal(invalid.styles[items[0].id].widthPct,20);assert.equal(invalid.styles[items[0].id].offsetPct,80);
});

test('Fractional column weights use the full row and stay stable through repeated saves',()=>{
 const text='one\n\ntwo\n',items=M.blocks(text,marked.lexer(text));let l=M.canvas(null,items);assert.deepEqual(l.rows[0].weights,[1]);l.rows[0].weights=[.7];assert.deepEqual(M.clean(l).rows[0].weights,[1]);l=M.place(l,items[1].id,items[0].id,'right');l.rows[0].weights=[.6,.3];let clean=M.clean(l);assert.ok(Math.abs(clean.rows[0].weights.reduce((a,b)=>a+b,0)-1)<1e-12);const ratio=clean.rows[0].weights[0]/clean.rows[0].weights[1];for(let i=0;i<8;i++)clean=M.clean(clean);assert.ok(Math.abs(clean.rows[0].weights[0]/clean.rows[0].weights[1]-ratio)<1e-12);assert.equal(M.removeBlocks(clean,[items[1].id]).rows[0].weights[0],1);
});


test('PDF vertical spacing belongs only to its block and persists independently of Markdown',()=>{
 const text='left\n\n## right\n',items=M.blocks(text,marked.lexer(text)),l=M.place(M.canvas(null,items),items[1].id,items[0].id,'right');l.styles[items[1].id]={spaceBefore:96};l.options.includeAnnotations=true;
 const restored=M.canvas(JSON.parse(JSON.stringify(l)),items);assert.equal(restored.styles[items[1].id].spaceBefore,96);assert.equal(restored.styles[items[0].id],undefined);assert.equal(restored.options.includeAnnotations,true);assert.equal(items.map(i=>i.source).join(''),text);
 for(const [value,expected]of [[-10,0],[999,600],['invalid',0]])assert.equal(M.clean({...l,styles:{[items[1].id]:{spaceBefore:value}}}).styles[items[1].id].spaceBefore,expected);
 assert.equal(M.clean({...l,options:{...l.options,includeAnnotations:false}}).options.includeAnnotations,false);
});
