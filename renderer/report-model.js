(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LumaReportModel=api;})(typeof window==='object'?window:globalThis,()=>{
'use strict';
const hash=text=>{let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return(h>>>0).toString(16);};
function sections(text,tokens){
 const pieces=[];let buffer='',title='';const flush=()=>{if(buffer){pieces.push({source:buffer,title:title||buffer.replace(/[#*`\n]/g,' ').trim().slice(0,60)||'…'});buffer='';title='';}};
 for(const token of tokens){if(token.type==='heading'&&token.depth<=3){flush();title=token.text;}buffer+=token.raw||'';}flush();
 // Keep definition tokens and whitespace byte for byte. Never use this parser to rewrite Markdown.
 if(pieces.map(p=>p.source).join('')!==text)return[{id:'document',title:'Markdown',source:text}];
 const seen=new Map();return pieces.map(p=>{const anchor=hash(p.title),n=seen.get(anchor)||0;seen.set(anchor,n+1);return{...p,id:anchor+'-'+n};});
}
function clean(value){
 if(value?.version===2)return cleanCanvas(value);
 if(!value||value.version!==1||!Array.isArray(value.sheets)||value.sheets.length>100)throw Error('Invalid PDF layout');
 const options=value.options||{},integer=(n,min,max,fallback)=>Number.isInteger(n)&&n>=min&&n<=max?n:fallback;
 const out={version:1,options:{pageSize:['A4','Letter','16:9','4:3'].includes(options.pageSize)?options.pageSize:'16:9',orientation:options.orientation==='portrait'?'portrait':'landscape',fontSize:integer(options.fontSize,8,22,16),inset:[6,10,14].includes(options.inset)?options.inset:10,colorFrame:options.colorFrame!==false,includeAnnotations:options.includeAnnotations===true,includeFooter:options.includeFooter!==false,footerText:typeof options.footerText==='string'?options.footerText.replace(/[\x00-\x1f\x7f]/g,' ').slice(0,120):'LumaReader',pageNumbers:options.pageNumbers!==false,numberStart:integer(options.numberStart,1,999,1),rules:options.rules!==false,blockGap:integer(options.blockGap,0,24,12),ruleGap:integer(options.ruleGap,0,20,4)},sheets:value.sheets.map(s=>({title:typeof s.title==='string'?s.title.slice(0,120):'',columns:integer(s.columns,1,3,1),rows:integer(s.rows,1,2,1),slots:Array.from({length:6},(_,i)=>Array.isArray(s.slots?.[i])?s.slots[i].filter(id=>typeof id==='string'&&id.length<=80).slice(0,2000):[])}))};
 if(!out.sheets.length)out.sheets.push({columns:1,rows:1,slots:Array.from({length:6},()=>[])});return out;
}
function reconcile(value,items){
 const layout=clean(value||{version:1,sheets:[{columns:1,rows:1,slots:[]}]}),valid=new Set(items.map(s=>s.id)),seen=new Set();
 for(const sheet of layout.sheets){const count=sheet.columns*sheet.rows;for(let i=0;i<6;i++){const keep=[];for(const id of sheet.slots[i])if(valid.has(id)&&!seen.has(id)){seen.add(id);keep.push(id);}sheet.slots[i]=i<count?keep:[];if(i>=count)sheet.slots[0].push(...keep);}}
 for(const item of items)if(!seen.has(item.id))layout.sheets.at(-1).slots[0].push(item.id);return layout;
}
function move(layout,id,sheetIndex,slotIndex){const next=clean(layout),sheet=next.sheets[sheetIndex];if(!sheet||slotIndex<0||slotIndex>=sheet.columns*sheet.rows)throw Error('Invalid destination');for(const s of next.sheets)for(const slot of s.slots){const n=slot.indexOf(id);if(n>=0)slot.splice(n,1);}sheet.slots[slotIndex].push(id);return next;}

// A text-first canvas: rows flow across pages; only adjacent blocks share columns.
// IDs and styling are document metadata. Moving a block never rewrites Markdown.
function blocks(text,tokens){
 const result=[],normalized=text.replace(/\r\n/g,'\n'),offsets=[];let cursor=0,normalCursor=0,leading='';const seen=new Map();
 for(let i=0;i<text.length;i++){offsets.push(i);if(text[i]==='\r'&&text[i+1]==='\n')i++;}offsets.push(text.length);
 for(const token of tokens){const raw=(token.raw||'').replace(/\r\n/g,'\n');if(!raw)continue;const start=normalized.indexOf(raw,normalCursor);if(start<0)return sections(text,tokens);const realStart=offsets[start],realEnd=offsets[start+raw.length],prefix=text.slice(cursor,realStart),original=text.slice(realStart,realEnd);if(prefix){if(result.length)result.at(-1).source+=prefix;else leading+=prefix;}cursor=realEnd;normalCursor=start+raw.length;if(token.type==='space'){if(result.length)result.at(-1).source+=original;else leading+=original;continue;}result.push({type:token.type,source:leading+original,title:token.text||raw.replace(/[#*`\n]/g,' ').trim().slice(0,60)});leading='';}
 if(cursor<text.length){if(result.length)result.at(-1).source+=text.slice(cursor);else result.push({type:'paragraph',source:text});}
 if(!result.length)result.push({type:'paragraph',source:text});
 return result.map(b=>{const key=hash(b.type+'\n'+b.source),n=seen.get(key)||0;seen.set(key,n+1);return{...b,title:b.title||'Markdown',id:key+'-'+n};});
}
function cleanCanvas(value){
 if(!Array.isArray(value.rows)||value.rows.length>3000)throw Error('Invalid PDF canvas');
 const legacy=clean({version:1,sheets:[],options:value.options});
 const id=x=>typeof x==='string'&&x.length<=80;
 const rows=value.rows.map(r=>{if(!Array.isArray(r.cells)||!r.cells.length||r.cells.length>3)throw Error('Invalid PDF row');return{title:typeof r.title==='string'?r.title.slice(0,120):'',cells:r.cells.map(c=>({blocks:Array.isArray(c.blocks)?c.blocks.filter(id).slice(0,3000):[]})),weights:(()=>{const values=r.cells.map((_,i)=>{const n=Number(r.weights?.[i]);return Number.isFinite(n)&&n>0?Math.max(.01,Math.min(100,n)):1;});const total=values.reduce((a,b)=>a+b,0);return values.map(n=>n/total);})(),rule:r.rule!==false,dividers:r.cells.slice(1).map((_,i)=>r.dividers?.[i]!==false&&r.rule!==false)};});
 const styles={};for(const [key,v]of Object.entries(value.styles||{}).slice(0,3000)){if(!id(key)||['__proto__','constructor','prototype'].includes(key)||!v||typeof v!=='object')continue;const ranges=Array.isArray(v.ranges)?v.ranges.filter(r=>Number.isInteger(r.from)&&Number.isInteger(r.to)&&r.from>=0&&r.to>r.from&&r.to<1000000&&Number.isInteger(r.fontSize)&&r.fontSize>=8&&r.fontSize<=36).slice(0,300).map(r=>({from:r.from,to:r.to,fontSize:r.fontSize})):[];const widthPct=Math.max(20,Math.min(100,Number(v.widthPct)||100)),offsetPct=Math.max(0,Math.min(100-widthPct,Number(v.offsetPct)||0));styles[key]={widthPct,offsetPct,spaceBefore:Math.max(0,Math.min(600,Number(v.spaceBefore)||0)),hidden:v.hidden===true,fontSize:Number.isInteger(v.fontSize)&&v.fontSize>=8&&v.fontSize<=36?v.fontSize:null,align:['left','center','right','justify'].includes(v.align)?v.align:'left',ranges};}
 const grouped=new Set(),groups=[];for(const raw of (Array.isArray(value.groups)?value.groups:[]).slice(0,1500)){if(!Array.isArray(raw))continue;const members=[...new Set(raw.filter(x=>id(x)&&!styles[x]?.hidden&&!grouped.has(x)).slice(0,3000))];if(members.length<2)continue;members.forEach(x=>grouped.add(x));groups.push(members);}
 const anchors=Array.isArray(value.anchors)?value.anchors.filter(a=>id(a.id)&&typeof a.signature==='string').slice(0,3000).map(a=>({id:a.id,signature:a.signature.slice(0,80),lead:String(a.lead||'').slice(0,80),type:String(a.type||'').slice(0,30)})):[];
 if(value.documentText!=null&&(typeof value.documentText!=='string'||value.documentText.length>500000))throw Error('Invalid PDF document text');
 return{version:2,options:legacy.options,rows:rows.length?rows:[{cells:[{blocks:[]}],weights:[1],rule:false}],styles,anchors,groups,...(typeof value.documentText==='string'?{documentText:value.documentText,sourceHash:typeof value.sourceHash==='string'?value.sourceHash.slice(0,80):''}:{})};
}
function canvas(value,items,legacyItems=[]){
 let l;if(value?.version===2)l=cleanCanvas(value);else{
 const old=clean(value||{version:1,sheets:[]}),byId=new Map(legacyItems.map(i=>[i.id,i])),assign=id=>{const section=byId.get(id);if(!section)return items.some(i=>i.id===id)?[id]:[];const start=legacyItems.slice(0,legacyItems.indexOf(section)).reduce((n,i)=>n+i.source.length,0),end=start+section.source.length;let cursor=0;return items.filter(i=>{const offset=cursor;cursor+=i.source.length;return offset>=start&&offset<end;}).map(i=>i.id);};
 const rows=[];for(const sheet of old.sheets)for(let row=0;row<sheet.rows;row++){const cells=sheet.slots.slice(row*sheet.columns,(row+1)*sheet.columns).map(ids=>({blocks:ids.flatMap(assign)}));if(cells.some(c=>c.blocks.length))rows.push({title:row===0?sheet.title||'':'',cells,weights:cells.map(()=>1/cells.length),rule:old.options.rules});}
 l=cleanCanvas({version:2,options:old.options,rows,styles:{},anchors:[]});
 }
 const valid=new Set(items.map(i=>i.id)),seen=new Set(),mapping=new Map();
 for(const a of l.anchors){if(valid.has(a.id)){mapping.set(a.id,a.id);continue;}const match=items.find(i=>!seen.has(i.id)&&hash(i.source)===a.signature)||items.find(i=>!seen.has(i.id)&&i.type===a.type&&i.source.trim().slice(0,80)===a.lead);if(match){mapping.set(a.id,match.id);seen.add(match.id);}}
 seen.clear();for(const row of l.rows)for(const cell of row.cells){cell.blocks=cell.blocks.flatMap(old=>{const id=mapping.get(old)||old;if(!valid.has(id)||seen.has(id))return[];seen.add(id);if(id!==old&&l.styles[old]){l.styles[id]={...l.styles[old],ranges:[]};delete l.styles[old];}return[id];});}
 l.rows=l.rows.filter(r=>r.cells.some(c=>c.blocks.length));for(const item of items)if(!seen.has(item.id)&&!l.styles[item.id]?.hidden)l.rows.push({cells:[{blocks:[item.id]}],weights:[1],rule:false});
 l.groups=l.groups.map(group=>group.map(old=>mapping.get(old)||old).filter(id=>valid.has(id)&&!l.styles[id]?.hidden));
 l.anchors=items.map(i=>({id:i.id,signature:hash(i.source),lead:i.source.trim().slice(0,80),type:i.type||'paragraph'}));for(const id of Object.keys(l.styles))if(!valid.has(id))delete l.styles[id];return cleanCanvas(l);
}
function locate(l,id){for(let row=0;row<l.rows.length;row++)for(let cell=0;cell<l.rows[row].cells.length;cell++){const index=l.rows[row].cells[cell].blocks.indexOf(id);if(index>=0)return{row,cell,index};}return null;}
function tidy(l){l.rows=l.rows.map(r=>{const indices=r.cells.map((c,i)=>c.blocks.length?i:-1).filter(i=>i>=0);return{...r,cells:indices.map(i=>r.cells[i]),weights:indices.map(i=>r.weights[i]),dividers:indices.slice(1).map((i,n)=>r.dividers.slice(indices[n],i).some(Boolean))};}).filter(r=>r.cells.length);return l;}
function placeMany(value,ids,target,edge){
 const l=cleanCanvas(value),requested=new Set(ids);if(!requested.size||requested.has(target))return l;
 if(!['left','right','above','below'].includes(edge))throw Error('Invalid PDF placement');
 const ordered=l.rows.flatMap(r=>r.cells.flatMap(c=>c.blocks)).filter(id=>requested.has(id));
 if(ordered.length!==requested.size)throw Error('Unknown PDF block');if(!locate(l,target))throw Error('Unknown PDF target');
 for(const row of l.rows)for(const cell of row.cells)cell.blocks=cell.blocks.filter(id=>!requested.has(id));tidy(l);
 const at=locate(l,target),row=l.rows[at.row],cell=row.cells[at.cell];
 if(edge==='left'||edge==='right'){
  if(row.cells.length>=3)throw Error('A row supports up to three columns');
  const before=cell.blocks.splice(0,at.index),after=cell.blocks.splice(1);if(before.length){l.rows.splice(at.row,0,{cells:[{blocks:before}],weights:[1],rule:false});at.row++;}if(after.length)l.rows.splice(at.row+1,0,{cells:[{blocks:after}],weights:[1],rule:false});
  const insert=at.cell+(edge==='right'?1:0),old=row.cells.length;
  if(insert===0)row.dividers.unshift(true);else if(insert===old)row.dividers.push(true);else row.dividers.splice(insert-1,1,true,true);
  row.cells.splice(insert,0,{blocks:ordered});row.weights=row.cells.map(()=>1/row.cells.length);row.rule=true;
 }else cell.blocks.splice(at.index+(edge==='below'?1:0),0,...ordered);
 return cleanCanvas(l);
}
function place(value,id,target,edge){return placeMany(value,[id],target,edge);}
function removeDivider(value,row,index){const l=cleanCanvas(value);if(!l.rows[row]||!Number.isInteger(index)||index<0||index>=l.rows[row].dividers.length)throw Error('Invalid PDF divider');l.rows[row].dividers[index]=false;return l;}
function groupMembers(value,id){return value.groups?.find(group=>group.includes(id))||[id];}
function expandGroups(value,ids){const selected=new Set(ids);for(const group of value.groups||[])if(group.some(id=>selected.has(id)))group.forEach(id=>selected.add(id));return [...selected];}
function createGroup(value,ids){const l=cleanCanvas(value),requested=new Set(expandGroups(l,ids)),order=l.rows.flatMap(r=>r.cells.flatMap(c=>c.blocks)),members=order.filter(id=>requested.has(id)&&!l.styles[id]?.hidden);if(members.length<2)throw Error('Select at least two PDF blocks');l.groups=l.groups.filter(group=>!group.some(id=>requested.has(id)));l.groups.push(members);return cleanCanvas(l);}
function ungroup(value,id){const l=cleanCanvas(value);l.groups=l.groups.filter(group=>!group.includes(id));return l;}
function removeBlocks(value,ids){const l=cleanCanvas(value),requested=new Set(ids);for(const id of requested){if(!locate(l,id))throw Error('Unknown PDF block');l.styles[id]={...l.styles[id],hidden:true};}for(const row of l.rows)for(const cell of row.cells)cell.blocks=cell.blocks.filter(id=>!requested.has(id));tidy(l);return cleanCanvas(l);}
function replaceId(value,oldId,newId){const l=cleanCanvas(value);for(const row of l.rows)for(const cell of row.cells)cell.blocks=cell.blocks.map(id=>id===oldId?newId:id);if(l.styles[oldId]){l.styles[newId]={...l.styles[oldId],ranges:[]};if(oldId!==newId)delete l.styles[oldId];}l.groups=l.groups.map(group=>group.map(id=>id===oldId?newId:id));l.anchors=l.anchors.filter(a=>a.id!==oldId);return l;}
function dropEdge(x,y){return x>=.70?'right':y<.34?'above':y>.66?'below':x<.14?'left':y<.5?'above':'below';}
return{dropEdge,hash,sections,clean,reconcile,move,blocks,canvas,locate,place,placeMany,removeDivider,groupMembers,expandGroups,createGroup,ungroup,removeBlocks,replaceId,cleanCanvas};
});
