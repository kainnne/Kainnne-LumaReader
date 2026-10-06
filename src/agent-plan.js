'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {Marked}=require('../renderer/vendor/marked/marked.umd.js'),M=require('../renderer/report-model');
const PROTOCOL='lumareader.agent/v1',MAX_TEXT=500000;
const flags=new Set(['--output','--layout','--root','--paper','--orientation','--font-size','--footer','--accent']);
const switches=new Set(['--plain','--no-footer','--no-page-numbers','--overwrite','--allow-remote-images','--allow-missing-images']);
function fail(code,message){const error=new Error(message);error.code=code;throw error;}
function parseArgs(argv){
 const at=argv.indexOf('--luma-agent'),args=argv.slice(at+1);if(at<0)fail('INVALID_COMMAND','Use --luma-agent help, inspect or export.');
 let command=args.shift()||'help';if(['--help','-h'].includes(command))command='help';if(!['help','inspect','export'].includes(command))fail('INVALID_COMMAND','Unknown agent command. Use --luma-agent help.');
 const options={},positionals=[];for(let i=0;i<args.length;i++){const arg=args[i];if(arg==='--'){positionals.push(...args.slice(i+1));break;}if(switches.has(arg)){if(options[arg])fail('INVALID_ARGUMENT','Duplicate '+arg);options[arg]=true;}else if(flags.has(arg)){if(options[arg]!==undefined||!args[i+1]||args[i+1].startsWith('--'))fail('INVALID_ARGUMENT','Provide one value for '+arg);options[arg]=args[++i];}else if(arg.startsWith('-'))fail('INVALID_ARGUMENT','Unknown option: '+arg);else positionals.push(arg);}
 if(command==='help'){if(positionals.length||Object.keys(options).length)fail('INVALID_ARGUMENT','Help takes no arguments.');return {command,options};}
 if(positionals.length!==1)fail('INVALID_ARGUMENT','Provide one local Markdown file.');
 if(command==='export'&&!options['--output'])fail('INVALID_ARGUMENT','Export requires --output report.pdf.');
 if(command==='inspect'&&options['--output'])fail('INVALID_ARGUMENT','Inspect writes JSON to stdout, not a PDF.');
 return {command,input:path.resolve(positionals[0]),options};
}
function help(version){return {ok:true,protocol:PROTOCOL,appVersion:version,commands:{inspect:'--luma-agent inspect document.md [--layout layout.json] [--root project-folder]',export:'--luma-agent export document.md --output report.pdf [--layout layout.json]'},options:{'--paper':['A4','Letter','16:9','4:3'],'--orientation':['portrait','landscape'],'--font-size':'8–22 px','--plain':'White page, no color frame','--footer':'Footer text; defaults to LumaReader','--no-footer':'Hide footer name','--no-page-numbers':'Hide page numbers','--accent':'#RRGGBB; defaults to LumaReader pink','--root':'Folder containing the Markdown and its relative image paths; defaults to the Markdown folder','--overwrite':'Explicitly replace an existing PDF','--allow-remote-images':'Allow loading http/https image URLs; disabled by default','--allow-missing-images':'Export despite unresolved images and return warnings; otherwise fail'},layoutExample:{schema:PROTOCOL,options:{pageSize:'A4',orientation:'landscape',colorFrame:true,fontSize:14},placements:[{blocks:[3,4],target:2,position:'right'}],styles:[{blocks:[2],fontSize:18,align:'left'}]},notes:['No Node.js or npm installation is required. Run the installed App executable with these arguments.','Inspect returns 1-based block indexes and stable IDs. Use them in layout placements and styles.','Set sourceHash to the inspect result sourceHash to reject a changed Markdown file.','Export uses the App renderer and pagination engine, never changes Markdown or the running App preferences, and opens no save dialog.','The installed app also bundles docs/AGENT-PDF.md.'],exitCodes:{0:'Success',2:'Invalid input or layout',3:'Render/export failed',4:'Output already exists'}};}
const optionKeys=new Set(['pageSize','orientation','fontSize','inset','colorFrame','includeFooter','footerText','pageNumbers','numberStart','rules','blockGap','ruleGap']);
function validateOptions(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('INVALID_LAYOUT','options must be an object.');
 for(const [key,v]of Object.entries(value)){
  if(!optionKeys.has(key))fail('INVALID_LAYOUT','Unknown layout option: '+key);
  const choices={pageSize:['A4','Letter','16:9','4:3'],orientation:['portrait','landscape'],inset:[6,10,14]};if(choices[key]&&!choices[key].includes(v))fail('INVALID_LAYOUT','Invalid '+key);
  const bounds={fontSize:[8,22],numberStart:[1,999],blockGap:[0,24],ruleGap:[0,20]};if(bounds[key]&&(!Number.isInteger(v)||v<bounds[key][0]||v>bounds[key][1]))fail('INVALID_LAYOUT','Invalid '+key);
  if(['colorFrame','includeFooter','pageNumbers','rules'].includes(key)&&typeof v!=='boolean')fail('INVALID_LAYOUT','Invalid '+key);
  if(key==='footerText'&&(typeof v!=='string'||v.length>120))fail('INVALID_LAYOUT','Footer must be at most 120 characters.');
 }
 return value;
}
function buildLayout(text,recipe,overrides={},sourceHash){
 const marked=new Marked(),items=M.blocks(text,marked.lexer(text));let layout=M.canvas(null,items);
 if(recipe){
  if(recipe.version===2){layout=M.canvas(M.clean(recipe),items);}
  else {
   if(recipe.schema!==PROTOCOL||!recipe||Array.isArray(recipe))fail('INVALID_LAYOUT','Use schema "'+PROTOCOL+'" or an App version 2 layout.');
   for(const key of Object.keys(recipe))if(!['schema','sourceHash','options','placements','styles','columns'].includes(key))fail('INVALID_LAYOUT','Unknown layout field: '+key);
   if(recipe.sourceHash!==undefined&&recipe.sourceHash!==sourceHash)fail('SOURCE_CHANGED','Markdown changed since inspect. Inspect again.');
   layout.options={...layout.options,...validateOptions(recipe.options)};
   const resolve=ref=>{const item=Number.isInteger(ref)?items[ref-1]:items.find(i=>i.id===ref);if(!item)fail('INVALID_LAYOUT','Unknown block: '+ref);return item.id;};
   const list=(value,name)=>{if(value===undefined)return[];if(!Array.isArray(value)||value.length>3000)fail('INVALID_LAYOUT',name+' must be an array of at most 3000 entries.');return value;};
   const ids=value=>{if(!Array.isArray(value)||!value.length||value.length>3000)fail('INVALID_LAYOUT','blocks must be a nonempty array.');const result=value.map(resolve);if(new Set(result).size!==result.length)fail('INVALID_LAYOUT','Duplicate blocks.');return result;};
   for(const p of list(recipe.placements,'placements')){if(!p||Object.keys(p).some(k=>!['blocks','target','position'].includes(k)))fail('INVALID_LAYOUT','Invalid placement.');layout=M.placeMany(layout,ids(p.blocks),resolve(p.target),p.position);}
   for(const s of list(recipe.styles,'styles')){if(!s||Object.keys(s).some(k=>!['blocks','fontSize','align','spaceBefore'].includes(k)))fail('INVALID_LAYOUT','Invalid block style.');if(s.fontSize!==undefined&&(!Number.isInteger(s.fontSize)||s.fontSize<8||s.fontSize>36))fail('INVALID_LAYOUT','Block fontSize must be 8–36.');if(s.align!==undefined&&!['left','center','right','justify'].includes(s.align))fail('INVALID_LAYOUT','Invalid alignment.');if(s.spaceBefore!==undefined&&(!Number.isFinite(s.spaceBefore)||s.spaceBefore<0||s.spaceBefore>600))fail('INVALID_LAYOUT','spaceBefore must be 0–600.');for(const id of ids(s.blocks)){const {blocks,...style}=s;layout.styles[id]={...layout.styles[id],...style};}}
   for(const c of list(recipe.columns,'columns')){if(!c||Object.keys(c).some(k=>!['block','weights','dividers'].includes(k)))fail('INVALID_LAYOUT','Invalid columns.');const row=layout.rows[M.locate(layout,resolve(c.block)).row];if(!Array.isArray(c.weights)||c.weights.length!==row.cells.length||c.weights.some(w=>!Number.isFinite(w)||w<=0||w>100))fail('INVALID_LAYOUT','Provide one positive weight for each column.');row.weights=c.weights;if(c.dividers!==undefined){if(!Array.isArray(c.dividers)||c.dividers.length!==row.cells.length-1||c.dividers.some(v=>typeof v!=='boolean'))fail('INVALID_LAYOUT','Provide one boolean for each column divider.');row.dividers=c.dividers;}}
  }
 }
 layout.options={...layout.options,...validateOptions(overrides)};return {layout:M.clean(layout),items};
}
async function readJob(request){
 const input=await fs.realpath(request.input);if(!['.md','.markdown','.mkd','.mdx'].includes(path.extname(input).toLowerCase()))fail('INVALID_INPUT','Choose a Markdown file.');
 const stat=await fs.stat(input);if(!stat.isFile()||stat.size>2*1024*1024)fail('INVALID_INPUT','Markdown must be a file of at most 2 MB.');
 const bytes=await fs.readFile(input),original=bytes.toString('utf8');if(original.length>MAX_TEXT)fail('INVALID_INPUT','PDF layout supports at most 500000 characters.');
 const sourceHash=crypto.createHash('sha256').update(bytes).digest('hex'),o=request.options,root=await fs.realpath(o['--root']?path.resolve(o['--root']):path.dirname(input)),relative=path.relative(root,input);
 if(!(await fs.stat(root)).isDirectory()||relative.startsWith('..'+path.sep)||relative==='..'||path.isAbsolute(relative))fail('INVALID_INPUT','The Markdown file must be inside --root.');
 let recipe;if(o['--layout']){const file=path.resolve(o['--layout']);if((await fs.stat(file)).size>2*1024*1024)fail('INVALID_LAYOUT','Layout exceeds 2 MB.');try{recipe=JSON.parse(await fs.readFile(file,'utf8'));if(!recipe||typeof recipe!=='object'||Array.isArray(recipe))fail('INVALID_LAYOUT','Layout must be an object.');}catch{fail('INVALID_LAYOUT','Layout must be valid JSON.');}}
 const text=recipe?.version===2&&typeof recipe.documentText==='string'?recipe.documentText:original.replace(/^\ufeff/,'');
 const overrides={};if(o['--paper'])overrides.pageSize=o['--paper'];if(o['--orientation'])overrides.orientation=o['--orientation'];if(o['--font-size'])overrides.fontSize=Number(o['--font-size']);if(o['--footer']!==undefined)overrides.footerText=o['--footer'];if(o['--plain'])overrides.colorFrame=false;if(o['--no-footer'])overrides.includeFooter=false;if(o['--no-page-numbers'])overrides.pageNumbers=false;
 const {layout,items}=buildLayout(text,recipe,overrides,sourceHash);
 if(o['--accent']&&!/^#[0-9a-f]{6}$/i.test(o['--accent']))fail('INVALID_ARGUMENT','Accent must be #RRGGBB.');
 const output=o['--output']?path.resolve(o['--output']):null;if(output){if(path.extname(output).toLowerCase()!=='.pdf')fail('INVALID_OUTPUT','Output must end in .pdf.');if(output===input)fail('INVALID_OUTPUT','Do not replace Markdown.');const folder=await fs.realpath(path.dirname(output));if(!(await fs.stat(folder)).isDirectory())fail('INVALID_OUTPUT','Output folder must exist.');try{const existing=await fs.stat(output);if(!existing.isFile())fail('INVALID_OUTPUT','Output is not a regular file.');if(await fs.realpath(output)===input)fail('INVALID_OUTPUT','Do not replace Markdown.');if(!o['--overwrite'])fail('OUTPUT_EXISTS','Output exists. Choose another path or pass --overwrite.');}catch(e){if(e.code!=='ENOENT')throw e;}}
 return {input,root,path:relative.split(path.sep).join('/'),text,sourceHash,layout,items,output,accent:o['--accent']||null,allowRemote:o['--allow-remote-images']===true,allowMissing:o['--allow-missing-images']===true,overwrite:o['--overwrite']===true};
}
function inspect(job){return {ok:true,protocol:PROTOCOL,input:job.input,sourceHash:job.sourceHash,options:job.layout.options,blocks:job.items.map((b,i)=>({index:i+1,id:b.id,type:b.type,title:b.title,excerpt:b.source.trim().slice(0,240)})),layout:job.layout};}
async function savePdf(job,bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length>64*1024*1024||bytes.subarray(0,5).toString()!=='%PDF-')fail('EXPORT_FAILED','Invalid PDF or PDF exceeds 64 MB.');
 const current=await fs.readFile(job.input);if(crypto.createHash('sha256').update(current).digest('hex')!==job.sourceHash)fail('SOURCE_CHANGED','Markdown changed while exporting. Output not saved.');
 if(!job.overwrite){try{await fs.writeFile(job.output,bytes,{flag:'wx',mode:0o600});}catch(e){if(e.code==='EEXIST')fail('OUTPUT_EXISTS','Output exists. Use --overwrite to replace it.');throw e;}}
 else{const temp=path.join(path.dirname(job.output),'.lumareader-agent-'+crypto.randomUUID()+'.tmp');try{await fs.writeFile(temp,bytes,{flag:'wx',mode:0o600});await fs.rename(temp,job.output);}finally{await fs.rm(temp,{force:true});}}
}
module.exports={PROTOCOL,parseArgs,help,buildLayout,readJob,inspect,savePdf};
