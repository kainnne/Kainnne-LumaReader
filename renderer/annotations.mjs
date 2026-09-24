import {importAttachment,attachmentURL,getAttachment} from './annotation-assets.mjs';
import {Plugin,TextSelection} from 'prosemirror-state';
import {Decoration,DecorationSet} from 'prosemirror-view';
import {closeHistory} from 'prosemirror-history';
import {cleanItem,cleanSnapshot,fingerprint,treeFingerprint} from '../site/embed/annotation-contract.js';
const clone=value=>JSON.parse(JSON.stringify(value));
const quote=(doc,a)=>doc.textBetween(a.from,a.to,'\n','\ufffc');
function fail(code){throw Object.assign(new Error(code),{code});}
export function restoreAnnotations(snapshot,doc,markdown){
 const value=cleanSnapshot(snapshot);if(!value)return [];
 const same=value.fingerprint===fingerprint(markdown)&&value.treeFingerprint===treeFingerprint(doc);
 return value.items.map(item=>same&&item.anchor.to<=doc.content.size&&quote(doc,item.anchor)===(item.anchor.currentQuote??item.anchor.quote)?item:{...item,status:'orphaned',anchor:{...item.anchor,from:0,to:0}});
}
export function mapAnnotations(transaction){
 if(!transaction.docChanged||transaction.steps.some(s=>s.attr==='lumaAnnotations'))return transaction;
 const items=transaction.before.attrs.lumaAnnotations||[];if(!items.length)return transaction;
 const mapped=items.map(item=>{
  if(item.status==='orphaned')return item;
  const from=transaction.mapping.map(item.anchor.from,1),to=transaction.mapping.map(item.anchor.to,-1);
  const anchor={...item.anchor,from:Math.min(from,to),to:Math.max(from,to)};
  const currentText=quote(transaction.doc,anchor),deleted=from>=to||!currentText||currentText.length>10000;anchor.currentQuote=deleted?'':currentText;if(deleted){anchor.from=0;anchor.to=0;}
  return {...item,anchor,status:deleted?'orphaned':item.status==='needsReview'||quote(transaction.doc,anchor)!==item.anchor.quote?'needsReview':'active'};
 });
 if(JSON.stringify(mapped)!==JSON.stringify(items))transaction.setDocAttribute('lumaAnnotations',mapped);
 return transaction;
}
export function createAnnotations({options,getText,sourceRanges}){
 let view,latest=null,lastEvent='',tokenSequence=0;const tokens=new Map();
 const zh=options.language?.startsWith('zh'),tr=(cn,en)=>zh?cn:en;
 const actions=options.actions??[{id:'highlight',label:tr('重點','Highlight'),icon:'highlight'},{id:'comment',label:tr('註解','Note'),icon:'comment'},{id:'image',label:tr('圖片註記','Image note'),icon:'image'}];
 const bar=document.createElement('div');bar.className='luma-selection-actions';bar.hidden=true;bar.setAttribute('role','toolbar');bar.setAttribute('aria-label',tr('選取文字操作','Selected text actions'));
 const listButton=document.createElement('button');listButton.type='button';listButton.className='compact-button luma-annotations-button';
 const dialogs=new Set();let frame;
 function items(){return view.state.doc.attrs.lumaAnnotations||[];}
 function snapshot(){return {schemaVersion:1,fingerprint:fingerprint(getText()),treeFingerprint:treeFingerprint(view.state.doc),items:clone(items())};}
 function check(payload){const current=options.context();if(payload?.sessionId!==current.sessionId)fail('STALE_SESSION');if(payload?.id!==current.id||payload?.activeFileId!==current.activeFileId)fail('DOCUMENT_MISMATCH');if(payload.expectedRevision!==current.revision)fail('STALE_REVISION');if(!options.writable)fail('ANNOTATIONS_READ_ONLY');return current;}
 function commit(next){if(next.length>200)fail('ANNOTATION_LIMIT');const checked=cleanSnapshot({schemaVersion:1,fingerprint:fingerprint(getText()),treeFingerprint:treeFingerprint(view.state.doc),items:next});view.dispatch(closeHistory(view.state.tr).setDocAttribute('lumaAnnotations',checked.items));}
 function getSelection(){
  const {selection,doc}=view.state;const context=options.context();let reason='';
  if(!(selection instanceof TextSelection)||selection.empty)reason='EMPTY_OR_UNSUPPORTED_SELECTION';
  const {from,to}=selection;const text=doc.textBetween(from,to,'\n','\ufffc');
  if(text.length>10000)reason='SELECTION_TOO_LARGE';
  doc.nodesBetween(from,to,(node,pos)=>{if(node.isLeaf&&!node.isText)reason='UNSUPPORTED_NODE';if(node.isText){for(const boundary of [from-pos,to-pos]){if(boundary>0&&boundary<node.text.length){const points=new Set([...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(node.text)].map(s=>s.index));if(!points.has(boundary))reason='SPLIT_GRAPHEME';}}}});
  if(reason)return {...context,canAnnotate:false,reason,selectedText:text,selectionToken:null,sourceRanges:null,offsetEncoding:'UTF-16'};
  const key=`${context.revision}:${from}:${to}`;
  if(latest?.key===key)return clone(latest.value);
  const selectionToken=`${options.session}:${++tokenSequence}`;const ranges=sourceRanges(from,to);
  const value={...context,canAnnotate:true,selectedText:text,selectionToken,sourceRanges:ranges,offsetEncoding:'UTF-16',sourceMapping:ranges?'exact':'unavailable'};
  latest={key,value};tokens.set(selectionToken,{...context,from,to,quote:text});while(tokens.size>32)tokens.delete(tokens.keys().next().value);return clone(value);
 }
 function add(payload){check(payload);const token=tokens.get(payload.selectionToken);if(!token||token.revision!==options.context().revision)fail('STALE_SELECTION');const item=cleanItem({...payload.annotation,id:payload.annotation?.id||crypto.randomUUID()});if(items().some(i=>i.id===item.id))fail('DUPLICATE_ANNOTATION');const annotation={...item,anchor:{from:token.from,to:token.to,quote:token.quote},status:'active'};commit([...items(),annotation]);return clone(annotation);}
 function mutate(operation,payload){check(payload);if(operation==='set'){const next=cleanSnapshot(payload.annotations);if(!next||(next.fingerprint!==fingerprint(getText())||next.treeFingerprint!==treeFingerprint(view.state.doc)))fail('DOCUMENT_FINGERPRINT_MISMATCH');for(const item of next.items)if(item.status!=='orphaned'&&(item.anchor.to>view.state.doc.content.size||quote(view.state.doc,item.anchor)!==(item.anchor.currentQuote??item.anchor.quote)))fail('ANCHOR_MISMATCH');commit(next.items);return snapshot();}
  const current=items().find(i=>i.id===payload.annotationId);if(!current)fail('ANNOTATION_NOT_FOUND');if(operation==='delete'){commit(items().filter(i=>i!==current));return snapshot();}
  if(current.status!=='active'&&payload.patch?.asset)fail('ANCHOR_REQUIRES_REVIEW');const item=cleanItem({...current,...payload.patch,id:current.id});commit(items().map(i=>i===current?{...item,anchor:current.anchor,status:current.status}:i));return snapshot();
 }
 function dialog(title){const d=document.createElement('dialog');d.className='luma-annotation-dialog';const h=document.createElement('h2');h.textContent=title;const close=document.createElement('button');close.type='button';close.className='compact-button';close.textContent=tr('關閉','Close');close.onclick=()=>d.close();d.append(h,close);document.body.append(d);dialogs.add(d);d.addEventListener('close',()=>{dialogs.delete(d);d.remove();});return d;}
 function showAnnotation(item){const d=dialog(item.label||tr('註記','Annotation'));const q=document.createElement('blockquote');q.textContent=item.anchor.quote;const p=document.createElement('p');p.textContent=item.body;const status=document.createElement('p');status.textContent=({active:tr('文字關聯有效','Linked text is unchanged'),needsReview:tr('原文已修改，請確認註記','Text changed — review this annotation'),orphaned:tr('原文已刪除或無法確認位置','Original text was deleted or cannot be located')})[item.status];d.append(q,p,status);if(item.asset){const img=document.createElement('img');img.alt=item.label||tr('圖片註記','Image note');img.referrerPolicy='no-referrer';d.append(img);attachmentURL(item.asset).then(url=>{if(url&&d.isConnected){img.src=url;d.addEventListener('close',()=>{if(url.startsWith('blob:'))URL.revokeObjectURL(url);},{once:true});}else if(url?.startsWith('blob:'))URL.revokeObjectURL(url);}).catch(()=>{img.replaceWith(document.createTextNode(tr('圖片無法讀取','Image unavailable')));});}if(options.writable){const context=options.context(),payload={...context,expectedRevision:context.revision,annotationId:item.id};const remove=document.createElement('button');remove.type='button';remove.className='compact-button';remove.textContent=tr('刪除註記','Delete annotation');remove.onclick=()=>{try{mutate('delete',payload);d.close();}catch{remove.textContent=tr('內容已更新，請重新開啟','Content changed; reopen the note');remove.disabled=true;}};d.append(remove);if(item.kind==='comment'){const input=document.createElement('textarea');input.value=item.body;input.maxLength=4000;input.setAttribute('aria-label',tr('註解內容','Note'));const save=document.createElement('button');save.type='button';save.className='compact-button';save.textContent=tr('儲存註解','Save note');save.onclick=()=>{try{mutate('update',{...payload,patch:{body:input.value}});d.close();}catch{save.textContent=tr('內容已更新，請重新開啟','Content changed; reopen the note');save.disabled=true;}};d.append(input,save);}}d.showModal();options.onClick?.(clone(item));}
 function showList(){const d=dialog(tr('註記','Annotations'));for(const item of items().filter(item=>item.status!=='active')){const button=document.createElement('button');button.type='button';button.className='luma-annotation-row';button.textContent=`${item.status==='active'?'':item.status==='needsReview'?'⚠ ': '○ '}${item.label||item.anchor.quote.slice(0,40)}`;button.onclick=()=>{d.close();showAnnotation(item);};d.append(button);}d.showModal();}
 function action(action){const selection=latest?.value;if(!selection?.canAnnotate||selection.revision!==options.context().revision)return;const payload={...selection,expectedRevision:selection.revision};if(options.customActions){options.onAction?.({actionId:action.id,selection});return;}
  if(action.id==='highlight'){add({...payload,annotation:{kind:'highlight',label:tr('重點','Highlight')}});return;}
  if(action.id==='image'){
    const d=dialog(tr('圖片註記','Image note')),zone=document.createElement('button'),picker=document.createElement('input'),status=document.createElement('p');
    zone.type='button';zone.className='luma-image-drop';zone.textContent=tr('拖入圖片，或點一下選擇','Drop an image or choose a file');picker.type='file';picker.accept='image/png,image/jpeg,image/gif,image/webp';picker.hidden=true;zone.onclick=()=>picker.click();
    let busy=false;const receive=async file=>{if(!file||busy)return;busy=true;zone.disabled=true;status.textContent=tr('正在儲存圖片…','Saving image…');try{const asset=await importAttachment(file);add({...payload,annotation:{kind:'attachment',label:tr('圖片註記','Image note'),asset}});d.close();}catch(error){status.textContent=error.message;}finally{busy=false;zone.disabled=false;}};
    picker.onchange=()=>receive(picker.files[0]);zone.ondragover=e=>{e.preventDefault();};zone.ondrop=e=>{e.preventDefault();e.stopPropagation();receive(e.dataTransfer.files[0]);};d.append(zone,picker,status);d.showModal();return;
  }
  const d=dialog(tr('加上註解','Add a note'));const input=document.createElement('textarea');input.maxLength=4000;input.setAttribute('aria-label',tr('註解內容','Note'));const save=document.createElement('button');save.type='button';save.className='compact-button';save.textContent=tr('儲存','Save');save.onclick=()=>{try{add({...payload,annotation:{kind:'comment',body:input.value,label:tr('註解','Note')}});d.close();}catch{save.textContent=tr('原文已更動，請重新選取','Text changed; select again');save.disabled=true;}};d.append(input,save);d.showModal();input.focus();
 }
 for(const a of actions){const b=document.createElement('button');b.type='button';b.className='compact-button';b.textContent=({image:'▧',highlight:'▰',comment:'▤'})[a.icon]+' '+a.label;b.onpointerdown=e=>e.preventDefault();b.onclick=()=>action(a);bar.append(b);}
 listButton.onclick=showList;
 function positionBar(){const v=window.visualViewport;bar.style.bottom=Math.max(14,v?innerHeight-v.height-v.offsetTop+14:14)+'px';}
 window.visualViewport?.addEventListener('resize',positionBar);window.visualViewport?.addEventListener('scroll',positionBar);positionBar();
 function update(){if(!view)return;const selection=getSelection();const encoded=JSON.stringify(selection);if(encoded!==lastEvent){lastEvent=encoded;options.onSelection?.(selection);}bar.hidden=!options.writable||!selection.canAnnotate||!actions.length;const changed=items().filter(i=>i.status!=='active').length;listButton.textContent=tr('待確認的註記','Annotations to review');listButton.hidden=!changed;}
 const hover=bindAnnotationHover(()=>items());
 const plugin=new Plugin({props:{decorations(state){const all=[];for(const item of state.doc.attrs.lumaAnnotations||[]){if(item.status==='orphaned'||item.anchor.from>=item.anchor.to||item.anchor.to>state.doc.content.size)continue;state.doc.nodesBetween(item.anchor.from,item.anchor.to,(node,pos)=>{if(node.isText)all.push(Decoration.inline(Math.max(pos,item.anchor.from),Math.min(pos+node.nodeSize,item.anchor.to),{class:`luma-annotation-mark ${item.kind} ${item.status}`,'data-luma-annotation':item.id,role:'button',tabindex:'0','aria-label':item.label||tr('註記','Annotation')}));});}return DecorationSet.create(state.doc,all);},handleClick(_view,_pos,event){const id=event.target.closest('[data-luma-annotation]')?.dataset.lumaAnnotation,item=items().find(i=>i.id===id);if(item){showAnnotation(item);return true;}return false;},handleDOMEvents:{pointerover(_view,event){hover.show(event);return false;},pointerout(_view,event){hover.hide(event);return false;},keydown(_view,event){if(event.key!=='Enter')return false;const id=event.target.closest('[data-luma-annotation]')?.dataset.lumaAnnotation,item=items().find(i=>i.id===id);if(item){event.preventDefault();showAnnotation(item);return true;}return false;}}}});
 return {plugin,attach(editor){view=editor;document.body.append(bar);options.reviewTools?.append(listButton);update();},afterTransaction(tr){if(tr.docChanged){options.onSnapshot?.(snapshot());latest=null;}cancelAnimationFrame(frame);frame=requestAnimationFrame(update);},getSelection,getSnapshot:snapshot,add,mutate,getAttachment:async id=>{const asset=items().find(item=>item.asset?.id===id)?.asset;if(!asset)fail('ATTACHMENT_NOT_FOUND');return getAttachment(asset);},destroy(){cancelAnimationFrame(frame);window.visualViewport?.removeEventListener('resize',positionBar);window.visualViewport?.removeEventListener('scroll',positionBar);hover.destroy();bar.remove();listButton.remove();for(const d of dialogs)d.close();tokens.clear();}};
}

export function bindAnnotationHover(getItems){
 const popup=document.createElement('aside');popup.className='luma-annotation-popover';popup.hidden=true;popup.setAttribute('role','tooltip');document.body.append(popup);let timer,sequence=0,url;
 const clear=()=>{sequence++;popup.hidden=true;if(url?.startsWith('blob:'))URL.revokeObjectURL(url);url=null;};
 popup.onpointerenter=()=>clearTimeout(timer);popup.onpointerleave=()=>{timer=setTimeout(clear,100);};
 return {async show(event){const target=event.target.closest('[data-luma-annotation]');if(!target)return;const item=getItems().find(i=>i.id===target.dataset.lumaAnnotation);if(!item)return;clearTimeout(timer);clear();const n=sequence;popup.replaceChildren();const text=document.createElement('p');text.textContent=item.body||item.label||item.anchor.quote;popup.append(text);if(item.asset){try{const next=await attachmentURL(item.asset);if(n!==sequence){if(next?.startsWith('blob:'))URL.revokeObjectURL(next);return;}url=next;if(url){const image=document.createElement('img');image.src=url;image.alt=item.label||'';image.referrerPolicy='no-referrer';popup.prepend(image);}}catch{text.textContent+=' · 圖片無法讀取';}}const r=target.getBoundingClientRect();popup.hidden=false;popup.style.left=Math.max(8,Math.min(innerWidth-popup.offsetWidth-8,r.left))+'px';popup.style.top=Math.max(8,Math.min(innerHeight-popup.offsetHeight-8,r.bottom+8))+'px';},hide(event){if(event.relatedTarget?.closest?.('.luma-annotation-popover'))return;timer=setTimeout(clear,100);},destroy(){clearTimeout(timer);clear();popup.remove();}};
}
