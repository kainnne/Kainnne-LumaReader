'use strict';
// Deliberately exposes only the static site on loopback, never the repository or desktop files.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'../site');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{try{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
 let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep))throw Error('path');
 if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
 file=await fs.realpath(file);if(!file.startsWith(root+path.sep))throw Error('path');
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(req.method==='HEAD'?undefined:await fs.readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(Number(process.env.LUMA_EMBED_PORT||4174),'127.0.0.1',()=>console.log(`LumaReader embed preview: http://127.0.0.1:${server.address().port}/embed/demo.html`));
