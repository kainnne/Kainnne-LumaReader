#!/usr/bin/env node
'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const marker='<!-- LumaReader embed -->';
const help=`LumaReader · 免費 HTML 嵌入工具

用法：lumareader-embed [index.html] [--markdown transcript.md]

HTML 不存在時建立可用頁面；已有頁面會先備份，再加入完整的 LumaReader。
--markdown 選擇初始文件。預設提供可修改的示範文件。

請透過你的網站伺服器（http/https）開啟 HTML；不支援直接用 file:// 開啟。
嵌入內容免費使用，不需 API key。草稿預設存於使用者瀏覽器，不會自動寫入後台。
`;
function argumentsOf(args){
 let output,markdown;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--help'||args[i]==='-h')return {help:true};
  if(args[i]==='--markdown'){if(!args[i+1]||args[i+1].startsWith('-'))throw Error('--markdown 後面請填檔案路徑');markdown=args[++i];}
  else if(args[i].startsWith('-')||output)throw Error('不支援的參數：'+args[i]);
  else output=args[i];
 }
 return {output:output||'lumareader.html',markdown};
}
async function install({output,markdown}){
 const target=path.resolve(output);if(!/\.html?$/i.test(target))throw Error('請指定 .html 或 .htm 檔案');
 let old=null,mode=0o644;
 try{const stat=await fs.lstat(target);if(!stat.isFile()||stat.isSymbolicLink())throw Error('目標必須是一般 HTML 檔案');mode=stat.mode;old=await fs.readFile(target,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 if(old?.includes(marker))throw Error('這份 HTML 已加入 LumaReader，沒有重複修改。');
 if(old!==null&&(!/<body\b/i.test(old)||!/<\/body\s*>/i.test(old)))throw Error('找不到完整的 <body>。請指定 HTML 頁面，不是元件／片段檔。');
 const text=markdown?await fs.readFile(path.resolve(markdown),'utf8'):'# 歡迎使用 LumaReader\n\n按「編輯」開始修改文字，語言與外觀可在原本的「設定」中調整。\n';
 const id='luma-'+crypto.randomUUID(),title=markdown?path.basename(markdown).replace(/\.(?:md|markdown)$/i,''):'LumaReader';
 const data=JSON.stringify({id,title,markdown:text}).replace(/</g,'\\u003c');
 const snippet=`${marker}\n<section id="${id}" data-luma-mount></section>\n<script type="application/json" id="${id}-document">${data}</script>\n<script type="module" src="https://lumareader.kainnne.com/embed/install.js" data-luma-target="${id}" data-luma-document="${id}-document"></script>\n<!-- /LumaReader embed -->\n`;
 const base=old??'<!doctype html>\n<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LumaReader</title></head><body>\n</body></html>\n';
 const ends=[...base.matchAll(/<\/body\s*>/ig)];const at=ends.at(-1).index;const next=base.slice(0,at)+snippet+base.slice(at);
 let backup=null;
 if(old!==null){backup=target+'.before-lumareader-'+Date.now()+'.bak';await fs.copyFile(target,backup,fs.constants.COPYFILE_EXCL);}
 // Exclusive creation and a final read protect against accidental overwrites.
 if(old===null)await fs.writeFile(target,next,{flag:'wx',mode});
 else{if(await fs.readFile(target,'utf8')!==old)throw Error('HTML 在安裝期間被修改，已停止；原始備份仍保留。');const temp=target+'.luma-'+crypto.randomUUID()+'.tmp';try{await fs.writeFile(temp,next,{flag:'wx',mode});await fs.rename(temp,target);}finally{await fs.rm(temp,{force:true});}}
 return {target,backup};
}
if(require.main===module)(async()=>{const args=argumentsOf(process.argv.slice(2));if(args.help){console.log(help);return;}const result=await install(args);console.log('已加入原版 LumaReader：'+result.target);if(result.backup)console.log('原始備份：'+result.backup);console.log('用你的網站伺服器開啟這份 HTML 即可使用。草稿儲存在瀏覽器；未連接後台。');})().catch(error=>{console.error('LumaReader：'+error.message);process.exitCode=1;});
module.exports={argumentsOf,install};
