'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {clean}=require('../renderer/report-model');
class ReportStore{
 constructor(root){this.root=root;this.queue=Promise.resolve();}
 file(document){return path.join(this.root,crypto.createHash('sha256').update(path.resolve(document)).digest('hex')+'.json');}
 async read(document){try{const file=this.file(document);if((await fs.stat(file)).size>2*1024*1024)return null;const value=JSON.parse(await fs.readFile(file,'utf8'));try{return clean(value);}catch{return null;}}catch(e){if(e.code==='ENOENT'||e instanceof SyntaxError)return null;throw e;}}
 write(document,value){const layout=clean(value),data=JSON.stringify(layout);if(Buffer.byteLength(data)>2*1024*1024)throw Error('PDF layout exceeds 2 MB');const run=async()=>{await fs.mkdir(this.root,{recursive:true});const target=this.file(document),temp=target+'.'+crypto.randomUUID()+'.tmp';try{await fs.writeFile(temp,data,{mode:0o600});await fs.rename(temp,target);}finally{await fs.rm(temp,{force:true});}return layout;};const task=this.queue.then(run);this.queue=task.catch(()=>{});return task;}
}
module.exports={ReportStore};
