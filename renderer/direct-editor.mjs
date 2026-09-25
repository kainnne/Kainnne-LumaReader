import {Schema, Slice, Fragment} from 'prosemirror-model';
import {EditorState, TextSelection, NodeSelection} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {baseKeymap, toggleMark, setBlockType, wrapIn, chainCommands, exitCode} from 'prosemirror-commands';
import {gapCursor} from 'prosemirror-gapcursor';
import {history, undo, redo, closeHistory} from 'prosemirror-history';
import {keymap} from 'prosemirror-keymap';
import {inputRules, textblockTypeInputRule, wrappingInputRule, undoInputRule} from 'prosemirror-inputrules';
import {splitListItem, sinkListItem, liftListItem, wrapInList} from 'prosemirror-schema-list';
import {schema as commonSchema, defaultMarkdownParser, defaultMarkdownSerializer, MarkdownParser, MarkdownSerializer} from 'prosemirror-markdown';
import {tableNodes, tableEditing, addRowAfter, addColumnAfter, deleteRow, deleteColumn, deleteTable, goToNextCell} from 'prosemirror-tables';
import MarkdownIt from 'markdown-it';
import {createAnnotations,restoreAnnotations,mapAnnotations,bindAnnotationHover} from './annotations.mjs';
import {fingerprint,treeFingerprint} from '../site/embed/annotation-contract.js';

const atom = (inline, name) => ({inline, group:inline?'inline':'block', atom:true, attrs:{source:{default:''},display:{default:!inline}},
  toDOM:node=>[inline?'span':'div',{'data-luma-atom':name,class:`direct-${name}`},node.attrs.source]});
let nodes=commonSchema.spec.nodes.append(tableNodes({tableGroup:'block',cellContent:'paragraph',cellAttributes:{align:{default:null,getFromDOM:dom=>dom.style.textAlign||null,setDOMAttr:(value,attrs)=>{if(value)attrs.style=`text-align:${value}`;}}}}));
nodes=nodes.update('list_item',{...nodes.get('list_item'),attrs:{checked:{default:null}}});
nodes=nodes.append({math_inline:atom(true,'math'),math_block:atom(false,'math'),raw_inline:atom(true,'raw'),raw_block:atom(false,'raw')});
nodes.forEach((name,spec)=>{if(name!=='text'&&name!=='doc')nodes=nodes.update(name,{...spec,attrs:{...spec.attrs,lumaId:{default:null}}});});
nodes=nodes.update('doc',{...nodes.get('doc'),attrs:{lumaAnnotations:{default:null}}});
export const schema=new Schema({nodes,marks:commonSchema.spec.marks.append({strike:{parseDOM:[{tag:'s'},{tag:'del'}],toDOM:()=>['s',0]}})});

export function safeURL(value) {
  const clean=String(value||'').replace(/[\u0000-\u0020\u007f]/g,'');
  if (/^(?:https?:|data:image\/(?:png|jpeg|gif|webp);base64,)/i.test(clean))return value;
  return /^[a-z][a-z\d+.-]*:/i.test(clean)||clean.startsWith('//')?'':value;
}
const md=new MarkdownIt('commonmark',{html:true}).enable(['table','strikethrough']);
// Keep non-CommonMark document directives verbatim, even after adjacent edits.
md.block.ruler.before('fence','luma_special',(state,start,end,silent)=>{
  const startAt=state.bMarks[start]+state.tShift[start],line=state.src.slice(startAt,state.eMarks[start]);
  let last=start,kind='raw_block';
  if(start===0&&line==='---') {last=start+1;while(last<end&&!/^(---|\.\.\.)\s*$/.test(state.src.slice(state.bMarks[last],state.eMarks[last])))last++;if(last===end)return false;}
  else if(/^(?:\$\$|\\\[)/.test(line)) {
    kind='math_block';const close=line.startsWith('$$')?'$$':'\\]';const rest=line.slice(2);
    if(!rest.includes(close)){last++;while(last<end&&!state.src.slice(state.bMarks[last],state.eMarks[last]).includes(close))last++;if(last===end)return false;}
  } else if(/^(?:\[\^[^\]]+\]:|\*\[[^\]]+\]:|!include\b|<!--\s*lumareader:pagebreak\s*-->)/.test(line)) {
    while(last+1<end&&/^\s{2,}\S/.test(state.src.slice(state.bMarks[last+1],state.eMarks[last+1])))last++;
  } else return false;
  if(silent)return true;
  const token=state.push(kind,'',0);token.content=state.src.slice(startAt,state.eMarks[last]);token.map=[start,last+1];state.line=last+1;return true;
},{alt:['paragraph','reference','blockquote']});
md.inline.ruler.before('emphasis','luma_cjk_strong',(state,silent)=>{const match=/^\*\*(?![\s*])([^*\n]*?[^\s*])(?<!\\)\*\*(?=[\p{L}\p{N}])/u.exec(state.src.slice(state.pos));if(!match)return false;if(!silent){state.push('strong_open','strong',1);state.md.inline.parse(match[1],state.md,state.env,state.tokens);state.push('strong_close','strong',-1);}state.pos+=match[0].length;return true;});
md.inline.ruler.before('link','luma_reference',(state,silent)=>{const match=/^\[\^[^\]\n]+\]/.exec(state.src.slice(state.pos));if(!match)return false;if(!silent){const token=state.push('html_inline','',0);token.content=match[0];}state.pos+=match[0].length;return true;});
md.inline.ruler.before('escape','luma_math',(state,silent)=>{
  const rest=state.src.slice(state.pos),open=rest.startsWith('\\(')?'\\(':rest.startsWith('$$')?'$$':rest.startsWith('$')&&!/^\$\s/.test(rest)?'$':null;
  if(!open)return false;const close=open==='\\('?'\\)':open;let at=open.length;
  while((at=rest.indexOf(close,at))>=0&&rest[at-1]==='\\')at+=close.length;
  if(at<open.length||rest.slice(open.length,at).includes('\n'))return false;
  if(!silent){const token=state.push('math_inline','',0);token.content=rest.slice(0,at+close.length);}
  state.pos+=at+close.length;return true;
});
const tokenSpec={...defaultMarkdownParser.tokens,
  list_item:{block:'list_item',getAttrs:t=>({checked:t.lumaChecked??null})},
  table:{block:'table'},thead:{ignore:true},tbody:{ignore:true},tr:{block:'table_row'},
  th:{block:'table_header',getAttrs:t=>({align:t.attrGet('style')?.replace('text-align:','')||null})},
  td:{block:'table_cell',getAttrs:t=>({align:t.attrGet('style')?.replace('text-align:','')||null})},
  s:{mark:'strike'},math_inline:{node:'math_inline',getAttrs:t=>({source:t.content})},math_block:{node:'math_block',getAttrs:t=>({source:t.content,display:true})},
  raw_block:{node:'raw_block',getAttrs:t=>({source:t.content})},html_block:{node:'raw_block',getAttrs:t=>({source:t.content})},html_inline:{node:'raw_inline',getAttrs:t=>({source:t.content})}
};
// markdown-it emits inline content directly inside cells; the editor uses paragraphs.
function cellParagraphs(tokens){
  tokens.forEach((token,i)=>{if(token.type==='list_item_open'){const inline=tokens[i+2];const first=inline?.type==='inline'?inline.children?.[0]:null;const match=first?.type==='text'&&/^\[([ xX])\]\s+/.exec(first.content);if(match){token.lumaChecked=match[1]!==' ';first.content=first.content.slice(match[0].length);}}});
  return tokens.flatMap(token=>{
  const open=token.type==='th_open'||token.type==='td_open',close=token.type==='th_close'||token.type==='td_close';
  const paragraph={type:open?'paragraph_open':'paragraph_close',attrs:null};return open?[token,paragraph]:close?[paragraph,token]:[token];
});}
let nextId=0;
export function parseMarkdown(text){
  const records=new Map(),lines=text.split('\n'),starts=[0];for(let i=0;i<lines.length;i++)starts.push(starts.at(-1)+lines[i].length+1);
  const tokens=md.parse(text,{}),groups=[];let depth=0,group=[];
  for(const token of tokens){group.push(token);depth+=token.nesting;if(depth===0){groups.push(group);group=[];}}
  const children=[];let cursor=0;
  const addRaw=raw=>{const id=String(++nextId),node=schema.nodes.raw_block.create({source:raw,lumaId:id});records.set(id,{node,raw,leading:""});children.push(node);};
  for(const part of groups){
    const mapped=part.filter(t=>t.map);if(!mapped.length)continue;
    const begin=starts[Math.min(...mapped.map(t=>t.map[0]))],end=Math.min(text.length,starts[Math.max(...mapped.map(t=>t.map[1]))]);
    const gap=text.slice(cursor,begin);if(gap.trim())addRaw(gap);
    const raw=text.slice(begin,end);let node;
    try {const parsed=new MarkdownParser(schema,{parse:()=>cellParagraphs(part)},tokenSpec).parse(raw);if(parsed.childCount!==1)throw new Error('Complex block');node=parsed.firstChild;}
    catch {node=schema.nodes.raw_block.create({source:raw});}
    const id=String(++nextId);node=node.type.create({...node.attrs,lumaId:id},node.content,node.marks);
    records.set(id,{node,raw:(gap.trim()?'':gap)+raw,leading:gap.trim()?'':gap});children.push(node);cursor=end;
  }
  const tail=text.slice(cursor);if(tail.trim())addRaw(tail);
  const doc=schema.nodes.doc.create(null,children.length?children:[schema.nodes.paragraph.create()]);
  return {doc,records,original:text,tail:tail.trim()?'':tail};
}
let serializer;
const serializeCell=node=>serializer.serialize(schema.nodes.doc.create(null,node.content)).replace(/(?<!\\)\|/g,'\\|').replace(/\n/g,'<br>');
serializer=new MarkdownSerializer({...defaultMarkdownSerializer.nodes,
  math_inline:(s,n)=>s.text(n.attrs.source,false),math_block:(s,n)=>{s.write(n.attrs.source);s.closeBlock(n);},
  raw_inline:(s,n)=>s.text(n.attrs.source,false),raw_block:(s,n)=>{s.write(n.attrs.source);s.closeBlock(n);},
  list_item:(s,n)=>{if(n.attrs.checked!==null)s.write(n.attrs.checked?'[x] ':'[ ] ');s.renderContent(n);},
  table:(s,n)=>{n.forEach((row,_,i)=>{const cells=[];row.forEach(cell=>cells.push(serializeCell(cell)));s.write('| '+cells.join(' | ')+' |\n');if(i===0){const align=[];row.forEach(cell=>align.push(cell.attrs.align==='center'?':---:':cell.attrs.align==='right'?'---:':cell.attrs.align==='left'?':---':'---'));s.write('| '+align.join(' | ')+' |\n');}});s.closeBlock(n);}
},{...defaultMarkdownSerializer.marks,strike:{open:'~~',close:'~~',mixable:true,expelEnclosingWhitespace:true}});
export function serializeMarkdown(doc,source){
  if(doc.content.eq(source.doc.content))return source.original;
  let result='';doc.forEach(node=>{const record=source.records.get(node.attrs.lumaId);let value=record&&node.eq(record.node)?record.raw:((record?.leading||'')+serializer.serialize(schema.nodes.doc.create(null,[node]))+'\n');
    if(!(record&&node.eq(record.node))&&result&&!/(?:\r?\n){2}$/.test(result)&&!/^\r?\n/.test(value))result+='\n';result+=value;
  });return result+source.tail;
}

export function selectionSourceRanges(doc,source,from,to){
  const ranges=[],markdown=serializeMarkdown(doc,source);let cursor=0,valid=true;
  doc.forEach((node,position)=>{
    const record=source.records.get(node.attrs.lumaId),untouched=record&&node.eq(record.node);
    let value=untouched?record.raw:(record?.leading||'')+serializer.serialize(schema.nodes.doc.create(null,[node]))+'\n';
    if(!untouched&&cursor&&!/(?:\r?\n){2}$/.test(markdown.slice(0,cursor))&&!/^\r?\n/.test(value))cursor++;
    if(to>position&&from<position+node.nodeSize){
      const nonce='LUMASEL'+Math.random().toString(36).slice(2).toUpperCase(),markers=[];
      function decorate(current,pos){
        if(current.isText){const a=Math.max(0,from-pos),b=Math.min(current.nodeSize,to-pos);if(a>=b)return current;
          const id=markers.length,left='\ue000'+nonce+id+'A\ue001',right='\ue000'+nonce+id+'B\ue001';markers.push({left,right});return schema.text(current.text.slice(0,a)+left+current.text.slice(a,b)+right+current.text.slice(b),current.marks);}
        const children=[];current.forEach((child,offset)=>children.push(decorate(child,pos+1+offset)));return current.copy(Fragment.fromArray(children));
      }
      const marked=serializer.serialize(schema.nodes.doc.create(null,[decorate(node,position)])).trim();
      let clean=marked;for(const {left,right} of markers)clean=clean.replace(left,'').replace(right,'');
      if(clean!==value.trim())valid=false;
      else {let current=marked;const base=cursor+value.length-value.trimStart().length;for(const {left,right} of markers){const start=current.indexOf(left);current=current.replace(left,'');const end=current.indexOf(right);current=current.replace(right,'');if(start<0||end<start)valid=false;else ranges.push({from:base+start,to:base+end});}}
    }
    cursor+=value.length;
  });
  return valid&&ranges.length?ranges:null;
}
function latex(source){return source.replace(/^(?:\$\$|\$|\\\[|\\\()/,'').replace(/(?:\$\$|\$|\\\]|\\\))$/,'').trim();}

export function create({element,text,onChange,resolveImage,onImage,onFiles,onSource,onTableState,language='en',annotationOptions}){
  let parsed=parseMarkdown(text),view;
  if(annotationOptions)parsed.doc=parsed.doc.type.create({lumaAnnotations:restoreAnnotations(annotationOptions.snapshot,parsed.doc,text)},parsed.doc.content);
  const annotations=annotationOptions?createAnnotations({options:{...annotationOptions,language},getText:()=>serializeMarkdown(view.state.doc,parsed),sourceRanges:(from,to)=>selectionSourceRanges(view.state.doc,parsed,from,to)}):null;
  const zh=language.startsWith('zh'),tr=(en,cn)=>zh?cn:en;
  const rules=inputRules({rules:[textblockTypeInputRule(/^(#{1,6})\s$/,schema.nodes.heading,m=>({level:m[1].length})),wrappingInputRule(/^\s*>\s$/,schema.nodes.blockquote),wrappingInputRule(/^\s*([-+*])\s$/,schema.nodes.bullet_list)]});
  function mathView(node,getPos){
    const dom=document.createElement(node.isInline?'span':'div');dom.className='direct-math';dom.contentEditable='false';dom.tabIndex=0;dom.title=tr('Double-click to edit formula','按兩下編輯數學式');
    const draw=()=>{try{window.katex.render(latex(node.attrs.source),dom,{displayMode:node.attrs.display,throwOnError:false,strict:'ignore',trust:false,maxExpand:1000});}catch{dom.textContent=node.attrs.source;}};draw();
    const edit=()=>{if(!view.editable)return;const dialog=document.createElement('dialog');dialog.className='direct-formula-dialog';const form=document.createElement('form');form.method='dialog';const label=document.createElement('label');label.textContent=tr('Edit formula (LaTeX)','編輯數學式（LaTeX）');const input=document.createElement('textarea');input.value=latex(node.attrs.source);label.append(input);const cancel=document.createElement('button');cancel.textContent=tr('Cancel','取消');cancel.value='cancel';const save=document.createElement('button');save.textContent=tr('Apply','套用');save.value='save';form.append(label,cancel,save);dialog.append(form);document.body.append(dialog);dialog.addEventListener('close',()=>{if(dialog.returnValue==='save'){const pos=getPos();if(pos!==undefined){const delimiter=node.attrs.display?'$$':'$';view.dispatch(closeHistory(view.state.tr).setNodeMarkup(pos,null,{...node.attrs,source:delimiter+input.value+delimiter}));}}dialog.remove();view.focus();},{once:true});dialog.showModal();input.focus();input.select();};
    dom.addEventListener('dblclick',edit);dom.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();edit();}});
    return {dom,stopEvent:()=>true,ignoreMutation:()=>true,update:n=>{if(n.type!==node.type)return false;node=n;draw();return true;}};
  }
  const keybindings={'Mod-k':()=>command('link'),'Mod-z':undo,'Shift-Mod-z':redo,'Mod-y':redo,'Mod-b':toggleMark(schema.marks.strong),'Mod-i':toggleMark(schema.marks.em),'Mod-`':toggleMark(schema.marks.code),Backspace:undoInputRule,Enter:splitListItem(schema.nodes.list_item),'Mod-Enter':exitCode,'Tab':chainCommands(goToNextCell(1),sinkListItem(schema.nodes.list_item)), 'Shift-Tab':chainCommands(goToNextCell(-1),liftListItem(schema.nodes.list_item))};
  view=new EditorView(element,{state:EditorState.create({doc:parsed.doc,plugins:[...(annotations?[annotations.plugin]:[]),history(),rules,keymap(keybindings),keymap(baseKeymap),gapCursor(),tableEditing()]}),
    attributes:{class:'prose direct-prose',role:'textbox','aria-multiline':'true','aria-label':tr('Direct Markdown editor','直接編輯文件'),spellcheck:'false'},
    dispatchTransaction(transaction){if(annotationOptions?.readOnlyText&&!transaction.doc.content.eq(view.state.doc.content))return;if(annotations)transaction=mapAnnotations(transaction);const state=view.state.apply(transaction);view.updateState(state);if(transaction.docChanged)onChange(serializeMarkdown(state.doc,parsed),annotations?.getSnapshot());onTableState?.(inTable());annotations?.afterTransaction(transaction);},
    nodeViews:{list_item(node,editor,getPos){const dom=document.createElement('li'),contentDOM=document.createElement('div');if(node.attrs.checked!==null){dom.className='direct-task';const check=document.createElement('input');check.type='checkbox';check.checked=node.attrs.checked;check.contentEditable='false';check.setAttribute('aria-label',tr('Task completed','完成待辦事項'));check.addEventListener('change',()=>{if(!view.editable)return;view.dispatch(closeHistory(view.state.tr).setNodeMarkup(getPos(),null,{...node.attrs,checked:check.checked}));});dom.append(check);}dom.append(contentDOM);return {dom,contentDOM};},math_inline:(n,v,p)=>mathView(n,p),math_block:(n,v,p)=>mathView(n,p),
      image(node){const dom=document.createElement('span');dom.className='direct-image';dom.contentEditable='false';const img=document.createElement('img');img.src=resolveImage(safeURL(node.attrs.src));img.alt=node.attrs.alt||'';img.title=tr('Double-click to enlarge','按兩下放大圖片');img.addEventListener('dblclick',()=>onImage(img));dom.append(img);return {dom};},
      raw_block(node){const dom=document.createElement('div');dom.className='direct-protected';dom.contentEditable='false';const caption=document.createElement('span');caption.textContent=node.attrs.source.includes('lumareader:pagebreak')?tr('PDF page break','PDF 換頁'):tr('Special syntax · preserved as written','特殊語法・保留原文');const pre=document.createElement('pre');pre.textContent=node.attrs.source;const button=document.createElement('button');button.type='button';button.textContent=tr('Edit source','在原文中調整');button.addEventListener('click',onSource);dom.append(caption,pre,button);return {dom,stopEvent:()=>true};}
    },
    handleDOMEvents:{click(view,event){if(event.target.closest('a'))event.preventDefault();return false;}},
    handlePaste(view,event){if(event.clipboardData?.files.length){onFiles(event.clipboardData.files);return true;}return false;},
    handleDrop(view,event){if(event.dataTransfer?.files.length){const pos=view.posAtCoords({left:event.clientX,top:event.clientY});if(pos)view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos.pos))));onFiles(event.dataTransfer.files);return true;}return false;},
    transformPastedHTML(html){const dom=new DOMParser().parseFromString(html,'text/html');dom.querySelectorAll('script,style,iframe,object,embed').forEach(n=>n.remove());dom.querySelectorAll('td,th').forEach(n=>{n.removeAttribute('colspan');n.removeAttribute('rowspan');});dom.querySelectorAll('[src],[href]').forEach(n=>{for(const attr of ['src','href'])if(n.hasAttribute(attr)&&!safeURL(n.getAttribute(attr)))n.removeAttribute(attr);});return dom.body.innerHTML;}
  });
  annotations?.attach(view);
  function inTable(){const {$from}=view.state.selection;for(let depth=$from.depth;depth>0;depth--)if($from.node(depth).type.spec.tableRole==='table')return true;return false;}
  function run(command){view.focus();return command(view.state,view.dispatch,view);}
  function insertMarkdown(markdown){const content=parseMarkdown(markdown).doc.content;view.dispatch(closeHistory(view.state.tr).replaceSelection(new Slice(content,0,0)).scrollIntoView());view.focus();}
  function command(name){
    const marks={bold:'strong',italic:'em',strike:'strike'};if(marks[name])return run(toggleMark(schema.marks[marks[name]]));
    if(/^heading-[1-6]$/.test(name))return run(setBlockType(schema.nodes.heading,{level:Number(name.at(-1))}));
    if(name==='paragraph')return run(setBlockType(schema.nodes.paragraph));
    if(name==='quote')return run(wrapIn(schema.nodes.blockquote));
    if(name==='code')return run(setBlockType(schema.nodes.code_block));
    if(name==='task'){insertMarkdown('- [ ] '+tr('Task','待辦事項'));return true;}
    if(name==='link'){const {from,to}=view.state.selection;if(from===to)return false;const dialog=document.createElement('dialog');dialog.className='direct-formula-dialog';const form=document.createElement('form');form.method='dialog';const label=document.createElement('label');label.textContent=tr('Link address','連結網址');const input=document.createElement('input');input.type='url';input.placeholder='https://';label.append(input);const cancel=document.createElement('button');cancel.textContent=tr('Cancel','取消');cancel.value='cancel';cancel.formNoValidate=true;const save=document.createElement('button');save.textContent=tr('Apply','套用');save.value='save';form.append(label,cancel,save);dialog.append(form);document.body.append(dialog);dialog.addEventListener('close',()=>{if(dialog.returnValue==='save'&&safeURL(input.value))view.dispatch(closeHistory(view.state.tr).addMark(from,to,schema.marks.link.create({href:input.value})));dialog.remove();view.focus();},{once:true});dialog.showModal();input.focus();return true;}
    if(name==='table'){insertMarkdown('| '+tr('Heading','欄位')+' | '+tr('Heading','欄位')+' |\n| --- | --- |\n| '+tr('Content','內容')+' | '+tr('Content','內容')+' |\n');return true;}
    const tables={'row-add':addRowAfter,'column-add':addColumnAfter,'row-delete':deleteRow,'column-delete':deleteColumn,'table-delete':deleteTable};if(tables[name])return run(tables[name]);return false;
  }
  return {view,annotations,command,insertMarkdown,focus:()=>view.focus(),destroy:()=>{annotations?.destroy();view.destroy();},getText:()=>serializeMarkdown(view.state.doc,parsed),setEditable:value=>view.setProps({editable:()=>value}),matches:text=>serializeMarkdown(view.state.doc,parsed)===text};
}

export function reconcileAnnotations(text,snapshot){
 if(!snapshot||snapshot.fingerprint===fingerprint(text))return snapshot;
 const {doc}=parseMarkdown(text);return {schemaVersion:1,fingerprint:fingerprint(text),treeFingerprint:treeFingerprint(doc),items:restoreAnnotations(snapshot,doc,text)};
}

// Reading and editing use the same document positions. Match complete text
// blocks structurally; never search for a selected phrase in Markdown.
function readingTextNodes(el){
 const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,{acceptNode:n=>{let parent=n.parentElement;while(parent&&parent!==el){if(['UL','OL','BUTTON'].includes(parent.tagName))return NodeFilter.FILTER_REJECT;parent=parent.parentElement;}return NodeFilter.FILTER_ACCEPT;}}),nodes=[];let n;while(n=walker.nextNode())nodes.push(n);return nodes;
}
function readingBlocks(root,doc){
 const blocks=[];doc.descendants((node,pos)=>{if(node.isTextblock)blocks.push({node,pos});});
 const elements=[...root.querySelectorAll('p,h1,h2,h3,h4,h5,h6,td,th,pre > code,li,.mermaid')].filter(el=>!el.closest('.katex')&&!el.parentElement.closest('td,th,.mermaid')&&!(el.tagName==='LI'&&el.querySelector(':scope > p')));
 if(elements.length!==blocks.length)return [];
 return blocks.map((b,i)=>({...b,el:elements[i]})).filter(({node,el})=>node.textContent===readingTextNodes(el).map(n=>n.textContent).join(''));
}
export function paintAnnotations(root,text,snapshot){
 if(!snapshot?.items?.length)return ()=>{};
 const parsed=parseMarkdown(text),items=restoreAnnotations(snapshot,parsed.doc,text);
 for(const {node,pos,el} of readingBlocks(root,parsed.doc)){for(const item of items){if(item.status==='orphaned')continue;const start=Math.max(0,item.anchor.from-pos-1),end=Math.min(node.content.size,item.anchor.to-pos-1);if(start>=end)continue;const segments=[];let offset=0;for(const t of readingTextNodes(el)){const a=Math.max(0,start-offset),b=Math.min(t.length,end-offset);if(a<b)segments.push({t,a,b});offset+=t.length;}for(const {t,a,b} of segments.reverse()){const range=document.createRange();range.setStart(t,a);range.setEnd(t,b);const mark=document.createElement('span');mark.className='luma-annotation-mark '+item.kind+' '+item.status;mark.dataset.lumaAnnotation=item.id;range.surroundContents(mark);}}}
 const hover=bindAnnotationHover(()=>items);const show=e=>hover.show(e),hide=e=>hover.hide(e);root.addEventListener('pointerover',show);root.addEventListener('pointerout',hide);root.addEventListener('click',show);return ()=>{root.removeEventListener('pointerover',show);root.removeEventListener('pointerout',hide);root.removeEventListener('click',show);hover.destroy();};
}

// A read-only state drives the existing annotation menu and history. The
// rendered document is never converted into a contenteditable surface.
export function createReadingAnnotations({root,text,options,onChange}){
 const parsed=parseMarkdown(text),doc=parsed.doc.type.create({lumaAnnotations:restoreAnnotations(options.snapshot,parsed.doc,text)},parsed.doc.content);
 let state=EditorState.create({doc,plugins:[history()]}),paint,disposed=false;
 const annotations=createAnnotations({options,getText:()=>text,sourceRanges:(from,to)=>selectionSourceRanges(state.doc,parsed,from,to)});
 const view={get state(){return state;},dispatch(tr){
  if(disposed||!tr.doc.content.eq(state.doc.content))return;
  state=state.apply(tr);
  if(tr.docChanged){const snapshot=annotations.getSnapshot();getSelection()?.removeAllRanges();state=state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(0))));draw(snapshot);onChange(snapshot);}
  annotations.afterTransaction(tr);
 }};
 function draw(snapshot){paint?.();for(const el of [...root.querySelectorAll('[data-luma-annotation]')].reverse())el.replaceWith(...el.childNodes);paint=paintAnnotations(root,text,snapshot);}
 function selectionChanged(){
  if(disposed||root.hidden)return;
  const selected=getSelection();let from=0,to=0;
  if(selected?.rangeCount&&!selected.isCollapsed){
   const range=selected.getRangeAt(0).cloneRange(),blocks=readingBlocks(root,state.doc),bounds=document.createRange();bounds.selectNodeContents(root);
   // Browser paragraph selection can end just outside the final paragraph.
   // Clip that boundary to the reader; never include surrounding app controls.
   if(root.contains(range.startContainer)||root.contains(range.endContainer)){
    if(range.compareBoundaryPoints(Range.START_TO_START,bounds)<0)range.setStart(root,0);
    if(range.compareBoundaryPoints(Range.END_TO_END,bounds)>0)range.setEnd(root,root.childNodes.length);
    const offset=(container,index,end)=>{const block=blocks.find(({el})=>el===container||el.contains(container));if(block){const prefix=document.createRange();prefix.setStart(block.el,0);prefix.setEnd(container,index);const n=prefix.toString().length;return n<=block.node.content.size?block.pos+1+n:null;}
     const point=document.createRange();point.setStart(container,index);point.collapse(true);const candidate=end?[...blocks].reverse().find(({el})=>point.comparePoint(el,el.childNodes.length)<=0):blocks.find(({el})=>point.comparePoint(el,0)>=0);return candidate?candidate.pos+1+(end?candidate.node.content.size:0):null;};
    const a=offset(range.startContainer,range.startOffset,false),b=offset(range.endContainer,range.endOffset,true);
    if(a!==null&&b!==null&&a<b&&range.toString().replace(/\n/g,'')===state.doc.textBetween(a,b,'').replace(/\n/g,'')){from=a;to=b;}
   }
  }
  const selection=from===to?TextSelection.near(state.doc.resolve(0)):TextSelection.create(state.doc,from,to);
  if(!selection.eq(state.selection))view.dispatch(state.tr.setSelection(selection));
 }
 function click(event){if(getSelection()?.isCollapsed!==false&&event.target.closest('[data-luma-annotation]')){event.preventDefault();annotations.plugin.props.handleClick(view,0,event);}}
 function keydown(event){if(!(event.metaKey||event.ctrlKey)||event.key.toLowerCase()!=='z'||document.querySelector('dialog[open]'))return;const selected=getSelection();if(!root.contains(document.activeElement)&&!root.contains(selected?.anchorNode))return;if((event.shiftKey?redo:undo)(state,view.dispatch)){event.preventDefault();event.stopPropagation();}}
 annotations.attach(view);draw(annotations.getSnapshot());document.addEventListener('selectionchange',selectionChanged);root.addEventListener('click',click,true);root.addEventListener('keydown',keydown);selectionChanged();
 return {setSaveError:annotations.setSaveError,getSnapshot:annotations.getSnapshot,destroy(){disposed=true;document.removeEventListener('selectionchange',selectionChanged);root.removeEventListener('click',click,true);root.removeEventListener('keydown',keydown);paint?.();annotations.destroy();}};
}
