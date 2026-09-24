// Permanent v1 entry point: retain this URL and the data-luma-* contract.
// Breaking changes require a separate entry point. Reader UI lives in /web/.
const revision=new URL(import.meta.url).searchParams.get('v')||'1.4.1-web.10';
const sdkURL=new URL('./lumareader.js',import.meta.url);if(revision)sdkURL.searchParams.set('v',revision);
const {mountLumaReader,setExpandIcon}=await import(sdkURL.href);
for(const script of document.querySelectorAll('script[data-luma-target][data-luma-document]')){
 const mount=document.getElementById(script.dataset.lumaTarget),data=document.getElementById(script.dataset.lumaDocument);
 if(!mount||!data||mount.dataset.lumaInstalled)continue;
 mount.dataset.lumaInstalled='true';
 try{
  const configuration=script.dataset.lumaOptions?JSON.parse(document.getElementById(script.dataset.lumaOptions)?.textContent||'null'):{};
  if(!configuration||typeof configuration!=='object'||Array.isArray(configuration))throw new Error('Invalid embed options');
  const initial=JSON.parse(data.textContent),key='lumareader-embed:'+location.pathname+':'+initial.id;
  let draft=initial,timer,editor;
  const tools=document.createElement('div'),expand=document.createElement('button'),download=document.createElement('button'),status=document.createElement('span'),container=document.createElement('div');
  tools.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0;font:13px system-ui';
  expand.type=download.type='button';setExpandIcon(expand,false);expand.setAttribute('aria-pressed','false');expand.title='Expand / 放大';expand.setAttribute('aria-label',expand.title);
  download.textContent='↓ .md';download.title='Download Markdown / 下載 Markdown';
  status.setAttribute('role','status');status.textContent='Browser draft / 瀏覽器草稿';
  container.style.cssText='box-sizing:border-box;height:600px;max-height:85dvh;border:1px solid #ded8df;border-radius:12px;overflow:hidden';
  const failed=()=>{status.textContent='Save failed — download a backup / 儲存失敗，請下載備份';};
  try{const saved=localStorage.getItem(key);if(saved){const doc=JSON.parse(saved);if(doc.id===initial.id&&typeof doc.markdown==='string')draft=doc;}}catch{failed();}
  function persist(value){clearTimeout(timer);timer=null;localStorage.setItem(key,JSON.stringify(value));draft=value;status.textContent='Saved in this browser / 已存於此瀏覽器';}
  expand.hidden=configuration.expand===false;download.hidden=configuration.download===false;
  if(expand.hidden)expand.style.display='none';
  tools.append(expand,download,status);mount.append(tools,container);
  editor=mountLumaReader(container,{...configuration,document:draft,...(revision?{url:new URL('../web/index.html?v='+encodeURIComponent(revision),import.meta.url).href}:{}),readOnly:script.dataset.lumaReadonly==='true'||configuration.readOnly===true,onChange:value=>{draft=value;clearTimeout(timer);timer=setTimeout(()=>{try{persist(draft);}catch{failed();}},250);},onSave:async value=>persist(value),onError:failed,onExpand:expanded=>{setExpandIcon(expand,expanded);expand.setAttribute('aria-pressed',String(expanded));}});
  expand.onclick=()=>editor.expand();
  download.onclick=async()=>{const value=await editor.getDocument();const url=URL.createObjectURL(new Blob([value.markdown],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=String(value.title||'document').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').replace(/\.md$/i,'')+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  window.addEventListener('pagehide',()=>{if(timer)try{persist(draft);}catch{failed();}});
  // Optional website integration without replacing the Reader frontend.
  mount.lumaReader=editor;
  mount.dispatchEvent(new CustomEvent('lumareader:mounted',{bubbles:true,detail:{editor}}));
  editor.ready.catch(failed);
 }catch{mount.textContent='Unable to load LumaReader / 無法載入 LumaReader';}
}
