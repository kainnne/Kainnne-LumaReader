'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
async function main(){
 const root=path.resolve(__dirname,'..'),out=path.join(root,'dist-preview/embed/LumaReader-Embed-v1');
 await fs.mkdir(out,{recursive:true});
 // Retire the previous separate editor UI from this generated folder.
 for(const name of ['index.html','embed.css','embed.js'])await fs.rm(path.join(out,'embed',name),{force:true});
 for(const [from,to] of [['site/embed','embed'],['site/web','web'],['site/icon-content.webp','icon-content.webp'],['site/favicon-32.png','favicon-32.png'],['docs/EMBED.md','README.md'],['docs/THIRD-PARTY-NOTICES.md','THIRD-PARTY-NOTICES.md'],['LICENSE','LICENSE']]){
   await fs.mkdir(path.dirname(path.join(out,to)),{recursive:true});await fs.cp(path.join(root,from),path.join(out,to),{recursive:true});
 }
 // Include the actual KaTeX license with the redistribution.
 await fs.copyFile(path.join(root,'site/web/vendor/LICENSE-KATEX'),path.join(out,'web/vendor/katex/LICENSE'));
 await fs.writeFile(path.join(out,'README.md'),'# 獨立包快速試用\n\n在此資料夾執行 `python3 -m http.server 4175 --bind 127.0.0.1`，再開啟 http://127.0.0.1:4175/embed/demo.html 。直接用 file:// 開啟不支援跨視窗通訊；正式套用請將整個資料夾放到自己的 HTTPS 靜態網站。安裝指令可在你的網站資料夾執行；開發驗證指令則在 LumaReader 原始碼專案中使用。\n\n'+await fs.readFile(path.join(out,'README.md'),'utf8'));
 console.log(out);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
