const MAX=8*1024*1024;let database;
async function db(){return database ||= new Promise((resolve,reject)=>{const r=indexedDB.open('lumareader-annotation-assets-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('assets',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function transaction(mode,action){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('assets',mode),r=action(tx.objectStore('assets'));tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
export async function importAttachment(file){
 if(!file||file.size>MAX)throw Error('圖片上限 8 MB / Image limit: 8 MB');
 const bytes=new Uint8Array(await file.arrayBuffer()),head=String.fromCharCode(...bytes.slice(0,12));
 const type=bytes[0]===137&&head.slice(1,4)==='PNG'?'image/png':bytes[0]===255&&bytes[1]===216?'image/jpeg':head.startsWith('GIF8')?'image/gif':head.startsWith('RIFF')&&head.slice(8)==='WEBP'?'image/webp':null;
 if(!type)throw Error('請使用 PNG、JPG、GIF 或 WebP');
 if(window.lumaDesktop?.saveAnnotationAsset)return window.lumaDesktop.saveAnnotationAsset({bytes,type});
 const digest=await crypto.subtle.digest('SHA-256',bytes),id='local-'+[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(!await transaction('readonly',store=>store.get(id))){const existing=await transaction('readonly',store=>store.getAll());if(existing.reduce((sum,a)=>sum+a.bytes.byteLength,0)+bytes.length>64*1024*1024)throw Error('圖片儲存空間已滿 / Image storage is full');await transaction('readwrite',store=>store.put({id,bytes,type}));}
 return {id,local:true};
}
export async function getAttachment(asset){
 if(!asset?.local)return null;
 if(window.lumaDesktop?.getAnnotationAsset)return window.lumaDesktop.getAnnotationAsset(asset.id);
 const value=await transaction('readonly',store=>store.get(asset.id));if(!value)throw Error('找不到本機圖片 / Local image unavailable');return value;
}
export async function attachmentURL(asset){if(asset?.url)return asset.url;const value=await getAttachment(asset);return value?URL.createObjectURL(new Blob([value.bytes],{type:value.type})):null;}
