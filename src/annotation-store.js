'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
class AnnotationStore{
 constructor(root){this.root=root;this.queue=Promise.resolve();}
 key(document){return crypto.createHash('sha256').update(path.resolve(document)).digest('hex');}
 async read(document){try{return JSON.parse(await fs.readFile(path.join(this.root,this.key(document)+'.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async write(document,snapshot){const {cleanSnapshot}=require('./annotation-contract.cjs');const clean=cleanSnapshot(snapshot);if(!clean)throw Error('Invalid annotations');const run=async()=>{await fs.mkdir(this.root,{recursive:true});const target=path.join(this.root,this.key(document)+'.json'),temp=target+'.'+crypto.randomUUID()+'.tmp';await fs.writeFile(temp,JSON.stringify(clean),{mode:0o600});await fs.rename(temp,target);return clean;};const task=this.queue.then(run);this.queue=task.catch(()=>{});return task;}
 async image(payload){const bytes=Buffer.from(payload.bytes||[]);if(!bytes.length||bytes.length>8*1024*1024)throw Error('Image limit: 8 MB');const h=bytes.subarray(0,12).toString('latin1'),type=bytes[0]===137&&h.slice(1,4)==='PNG'?'image/png':bytes[0]===255&&bytes[1]===216?'image/jpeg':h.startsWith('GIF8')?'image/gif':h.startsWith('RIFF')&&h.slice(8)==='WEBP'?'image/webp':null;if(!type||type!==payload.type)throw Error('Unsupported image');const id='local-'+crypto.createHash('sha256').update(bytes).digest('hex');await fs.mkdir(path.join(this.root,'assets'),{recursive:true});const file=path.join(this.root,'assets',id);try{await fs.writeFile(file,Buffer.concat([Buffer.from(type+'\n'),bytes]),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}return{id,local:true};}
 async getImage(id){if(!/^local-[a-f0-9]{64}$/.test(id))throw Error('Invalid image ID');const data=await fs.readFile(path.join(this.root,'assets',id));if(data.length>8*1024*1024+30)throw Error('Image too large');const split=data.indexOf(10);return{id,type:data.subarray(0,split).toString(),bytes:new Uint8Array(data.subarray(split+1))};}
}
module.exports={AnnotationStore};
