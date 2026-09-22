'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const extensions=['png','jpg','jpeg','gif','webp'];
// One asynchronous panel per window. Import on the main side to avoid copying
// large byte arrays through the renderer/IPC bridge twice.
function createImagePicker({showOpenDialog,defaultPath,readFile=fs.readFile,stat=fs.stat}) {
  const pending=new WeakSet();
  return async function choose(context,documentPath) {
    if(pending.has(context))return {ok:false,code:'IMAGE_PICKER_BUSY'};
    context.service.resolveProjectDocument(documentPath);
    pending.add(context);
    try {
      const chosen=await showOpenDialog(context.window,{title:'Choose images',defaultPath,buttonLabel:'Add images',filters:[{name:'Images',extensions}],properties:['openFile','multiSelections','noResolveAliases']});
      if(chosen.canceled||!chosen.filePaths.length)return {ok:false,canceled:true};
      if(context.window.isDestroyed())return {ok:false,canceled:true};
      const images=[],failed=[];
      for(const source of chosen.filePaths.slice(0,8)) {
        try {
          const metadata=await stat(source);
          if(!metadata.isFile()||metadata.size>32*1024*1024||!extensions.includes(path.extname(source).slice(1).toLowerCase()))throw new Error('Unsupported image');
          const image=await context.service.importMarkdownImage(documentPath,path.basename(source),await readFile(source));images.push({...image,name:path.basename(source)});
        }catch {failed.push(path.basename(source));}
      }
      return {ok:images.length>0,images,failed,truncated:chosen.filePaths.length>8};
    }finally {pending.delete(context);}
  };
}
module.exports={createImagePicker};
