// Shared JSON validation. Annotation payloads are data, never HTML or executable plugins.
export const annotationCapabilities=Object.freeze({version:1,modes:['direct'],sourceOffsets:'UTF-16',sourceMapping:'exact-or-unavailable',maxAnnotations:200,maxSelection:10000});
export function cleanActions(actions){
 if(actions===undefined)return null;
 if(!Array.isArray(actions)||actions.length>5)throw new TypeError('At most five selection actions');
 const ids=new Set();return actions.map(a=>{if(!a||!/^[-\w]{1,40}$/.test(a.id)||ids.has(a.id)||typeof a.label!=='string'||!a.label.trim()||a.label.length>32)throw new TypeError('Invalid selection action');ids.add(a.id);return {id:a.id,label:a.label,icon:['image','highlight','comment'].includes(a.icon)?a.icon:'comment'};});
}
export function cleanItem(value){
 if(!value||typeof value!=='object')throw new TypeError('Invalid annotation');
 const item={id:String(value.id||''),kind:value.kind,label:String(value.label||''),body:String(value.body||'')};
 if(!/^[-\w]{1,100}$/.test(item.id)||!['highlight','comment','attachment'].includes(item.kind)||item.label.length>120||item.body.length>4000)throw new TypeError('Invalid annotation');
 if(value.asset!==undefined){const asset=value.asset;if(!asset||typeof asset.id!=='string'||!asset.id||asset.id.length>200)throw new TypeError('Provide an asset ID');item.asset={id:asset.id,...(asset.local===true?{local:true}:{})};if(asset.url){const u=new URL(asset.url);if(u.protocol!=='https:'||u.username||u.password||u.href.length>2000)throw new TypeError('Asset URL must be HTTPS without credentials');item.asset.url=u.href;}}
 if(value.data!==undefined){const raw=JSON.stringify(value.data);if(raw.length>4096)throw new TypeError('Annotation data too large');item.data=JSON.parse(raw);}
 return item;
}
export function cleanSnapshot(value){
 if(value===undefined||value===null)return null;
 if(value.schemaVersion!==1||typeof value.fingerprint!=='string'||value.fingerprint.length>100||!Array.isArray(value.items)||value.items.length>200)throw new TypeError('Invalid annotation snapshot');
 const ids=new Set();const items=value.items.map(v=>{const item=cleanItem(v),a=v.anchor;if(ids.has(item.id)||!a||!Number.isSafeInteger(a.from)||!Number.isSafeInteger(a.to)||a.from<0||a.to<a.from||typeof a.quote!=='string'||a.quote.length>10000||(a.currentQuote?.length||0)>10000||!['active','needsReview','orphaned'].includes(v.status))throw new TypeError('Invalid annotation anchor');ids.add(item.id);return {...item,anchor:{from:a.from,to:a.to,quote:a.quote,currentQuote:typeof a.currentQuote==='string'?a.currentQuote:a.quote},status:v.status};});
 if(JSON.stringify(items).length>1024*1024)throw new TypeError('Annotations exceed 1 MiB');
 return {schemaVersion:1,fingerprint:value.fingerprint,treeFingerprint:typeof value.treeFingerprint==='string'?value.treeFingerprint.slice(0,100):null,items};
}
// Content fingerprint, not a security credential. Restore also checks each exact quote.
export function fingerprint(text){let a=0x811c9dc5,b=0x9e3779b9;for(let i=0;i<text.length;i++){const n=text.charCodeAt(i);a=Math.imul(a^n,0x01000193);b=Math.imul(b^n,0x85ebca6b);}return `v1:${text.length}:${(a>>>0).toString(16)}:${(b>>>0).toString(16)}`;}

export function treeFingerprint(doc){return fingerprint(JSON.stringify(doc.toJSON(),(key,value)=>key==='lumaId'||key==='lumaAnnotations'?undefined:value));}
