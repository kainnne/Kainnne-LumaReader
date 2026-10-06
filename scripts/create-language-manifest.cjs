'use strict';
const {LANGUAGES}=require('../src/interface-defaults');
function manifest(tag,assets){
 if(!/^v\d+\.\d+\.\d+$/.test(tag))throw Error('Provide a stable release tag, for example v1.5.0.');
 const version=tag.slice(1),names=new Set(assets.map(a=>a.name)),result={};
 const format={macos:`Kainnne-LumaReader-${version}-macOS-universal`,windows:`Kainnne-LumaReader-${version}-Windows-x64-Setup`,linux:`Kainnne-LumaReader-${version}-Linux-x64`},extensions={macos:'dmg',windows:'exe',linux:'AppImage'};
 for(const [platform,base]of Object.entries(format)){result[platform]={};for(const language of LANGUAGES){const file=`${base}-${language}.${extensions[platform]}`;if(!names.has(file))throw Error('Missing published language package: '+file);result[platform][language]=`https://github.com/kainnne/Kainnne-LumaReader/releases/download/${tag}/${file}`;}}
 return result;
}
if(require.main===module){try{const tag=process.argv[2],raw=require('node:child_process').execFileSync('gh',['release','view',tag,'--repo','kainnne/Kainnne-LumaReader','--json','assets'],{encoding:'utf8'});process.stdout.write(JSON.stringify(manifest(tag,JSON.parse(raw).assets),null,2)+'\n');}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={manifest};
