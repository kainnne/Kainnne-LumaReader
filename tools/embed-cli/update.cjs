'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const versionURL='https://lumareader.kainnne.com/embed/version.json';
async function update({output},{fetchVersion=globalThis.fetch}={}){
 const target=path.resolve(output);
 if(!/\.html?$/i.test(target))throw Error('請指定 .html 或 .htm 檔案');
 const stat=await fs.lstat(target);if(!stat.isFile()||stat.isSymbolicLink())throw Error('目標必須是一般 HTML 檔案');
 const old=await fs.readFile(target,'utf8');
 const blocks=[...old.matchAll(/<!-- LumaReader embed -->[\s\S]*?<!-- \/LumaReader embed -->/g)];
 if(!blocks.length)throw Error('找不到工具安裝的嵌入區塊；手動嵌入請保留官方 install.js 網址並重新整理網頁。');
 const loader=/\bsrc=(['"])https:\/\/lumareader\.kainnne\.com\/embed\/install\.js(?:\?[^'"<>]*)?\1/g;
 for(const block of blocks)if([...block[0].matchAll(loader)].length!==1)throw Error('嵌入區塊已自訂或不完整，未修改 HTML。請確認官方 install.js 載入標籤。');
 const response=await fetchVersion(versionURL+'?check='+Date.now(),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('暫時無法取得版本資訊，原檔未修改。');
 const {version}=await response.json();if(typeof version!=='string'||!/^\d[\w.-]{0,63}$/.test(version))throw Error('版本資訊不正確，原檔未修改。');
 const url='https://lumareader.kainnne.com/embed/install.js?v='+encodeURIComponent(version);
 let next=old;for(const block of blocks.reverse())next=next.slice(0,block.index)+block[0].replace(loader,(_,quote)=>'src='+quote+url+quote)+next.slice(block.index+block[0].length);
 if(next===old)return {target,version,backup:null,unchanged:true};
 const suffix=Date.now()+'-'+crypto.randomUUID();const backup=target+'.before-lumareader-update-'+suffix+'.bak',temp=target+'.luma-'+suffix+'.tmp';
 await fs.copyFile(target,backup,fs.constants.COPYFILE_EXCL);
 try{if(await fs.readFile(target,'utf8')!==old)throw Error('HTML 在更新期間被修改，已停止；原始備份仍保留。');await fs.writeFile(temp,next,{flag:'wx',mode:stat.mode});await fs.rename(temp,target);}finally{await fs.rm(temp,{force:true});}
 return {target,version,backup,unchanged:false};
}
module.exports={update};
