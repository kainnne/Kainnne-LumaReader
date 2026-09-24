/** LumaReader iframe SDK v1. Host owns persistence; no remote storage is assumed. */
export function normalizeEmbedOptions(options={}) {
  const mode=options.mode ?? 'direct';
  if(!['direct','source','preview'].includes(mode))throw new TypeError('mode must be direct, source or preview');
  const features={sidebar:true,modeSwitch:false,rename:true,formatting:true,share:true,settings:true,language:true};
  for(const key of Object.keys(features))if(options.features?.[key]!==undefined){if(typeof options.features[key]!=='boolean')throw new TypeError('features.'+key+' must be boolean');features[key]=options.features[key];}
  const toolbar={formatting:false,share:false};
  for(const key of Object.keys(toolbar))if(options.toolbar?.[key]!==undefined){if(typeof options.toolbar[key]!=='boolean')throw new TypeError('toolbar.'+key+' must be boolean');toolbar[key]=features[key]&&options.toolbar[key];}
  return {mode,features,toolbar,sourcePreview:options.sourcePreview!==false,language:typeof options.language==='string'?options.language:undefined};
}
const protocol = 'lumareader-embed-v1';
let expandedInstance;
function validateFiles(value){
  if(!value.files)return {};
  if(!Array.isArray(value.files)||value.files.length<1||value.files.length>3)throw new TypeError('Provide one to three Markdown files');
  const ids=new Set();let length=0;
  const files=value.files.map(file=>{if(!file||typeof file.id!=='string'||!file.id||file.id.length>200||ids.has(file.id)||typeof file.markdown!=='string')throw new TypeError('Invalid embedded file');ids.add(file.id);length+=file.markdown.length;return {id:file.id,title:String(file.title||'Untitled').slice(0,200),markdown:file.markdown};});
  if(length>64*1024*1024||!ids.has(value.activeFileId))throw new TypeError('Invalid embedded workspace');
  return {files,activeFileId:value.activeFileId};
}
function validateDocument(document) {
  if (!document || typeof document.id !== 'string' || !document.id || document.id.length > 200 || typeof document.markdown !== 'string' || document.markdown.length > 64 * 1024 * 1024) throw new TypeError('Provide {id, title, markdown}; Markdown must be at most 64 Mi characters.');
  const workspace=validateFiles(document),active=workspace.files?.find(file=>file.id===workspace.activeFileId)||document;
  return {id:document.id,title:String(active.title || '').slice(0,200),markdown:active.markdown,...workspace,revision:0};
}
// Same expand/restore glyphs and button treatment as Kainnne × Gemini.
export function setExpandIcon(button,expanded){
  const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=expanded?'❐':'⛶';button.replaceChildren(icon);
  Object.assign(button.style,{display:'inline-flex',width:'40px',minWidth:'40px',height:'40px',minHeight:'40px',padding:'0',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,.84)',borderRadius:'14px',background:'linear-gradient(120deg,rgba(218,205,255,.68),rgba(255,183,206,.72),rgba(201,255,240,.62))',color:'#633c55',boxShadow:'0 8px 22px rgba(123,97,255,.12),inset 0 1px rgba(255,255,255,.82)',font:'22px/1 Arial,sans-serif',cursor:'pointer'});if(button.hidden)button.style.display='none';
}
export function mountLumaReader(container, options) {
  if (!(container instanceof HTMLElement)) throw new TypeError('A container element is required.');
  if (container.children.length) throw new Error('Use an empty container for each editor.');
  const configuration=normalizeEmbedOptions(options);
  let current = validateDocument(options.document), savedRevision = 0, boot, initialized = false, destroyed = false, expanded = false;
  let saving = Promise.resolve(), requestCounter = 0, savedStyle, bodyOverflow, previousFocus;
  const channel = (crypto.randomUUID?.() || [...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('')), requests = new Map();
  const url = new URL(options.url || '../web/index.html',import.meta.url);
  if (!/^https?:$/.test(url.protocol) || location.origin === 'null') throw new Error('Serve the host and editor over HTTP(S).');
  url.searchParams.set('embed','1');
  url.hash = new URLSearchParams({parentOrigin:location.origin,channel}).toString();
  const iframe = document.createElement('iframe');
  iframe.title = options.document.title ? `LumaReader — ${options.document.title}` : 'LumaReader Markdown editor';
  iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-downloads allow-modals allow-popups');
  iframe.setAttribute('referrerpolicy','no-referrer');
  iframe.setAttribute('allow','clipboard-write; web-share');
  Object.assign(iframe.style,{width:'100%',height:'100%',display:'block',border:'0',borderRadius:'inherit'});
  const expandedBar=document.createElement('div'), collapseButton=document.createElement('button');
  expandedBar.hidden=true;expandedBar.style.cssText='flex:none;box-sizing:border-box;height:48px;padding:4px 10px;text-align:right;background:#fafafa;color:#333;border-bottom:1px solid #ddd';
  collapseButton.type='button';setExpandIcon(collapseButton,true);collapseButton.setAttribute('aria-label',options.collapseLabel || 'Exit expanded view');collapseButton.title=options.collapseLabel || 'Restore / 縮回';
  collapseButton.onclick=()=>expand(false);expandedBar.append(collapseButton);
  let readyResolve, readyReject;
  const ready = new Promise((resolve,reject) => {readyResolve=resolve;readyReject=reject;});
  const startup = setTimeout(() => readyReject(new Error('LumaReader did not load. Check the URL and frame policy.')),60000);
  function send(type, data = {}) {if (!destroyed) iframe.contentWindow?.postMessage({protocol,channel,boot,type,...data},url.origin);}
  function report(error) {options.onError?.(error);}
  function rejectRequests(message) {for (const entry of requests.values()) {clearTimeout(entry.timer);entry.reject(new Error(message));}requests.clear();}
  function accept(document) {
    if (!document || document.id !== current.id || typeof document.markdown !== 'string' || !Number.isSafeInteger(document.revision) || document.revision < current.revision) return false;
    let workspace;try{workspace=validateFiles(document);}catch{return false;}
    const active=workspace.files?.find(file=>file.id===workspace.activeFileId)||document;
    const changed = document.revision > current.revision;
    current = {id:current.id,title:typeof active.title==='string'?active.title.slice(0,200):current.title,markdown:active.markdown,...workspace,revision:document.revision};
    iframe.title='LumaReader — '+current.title;
    if (changed) {try {options.onChange?.({...current});} catch (error) {report(error);}}
    return true;
  }
  function expand(value = true) {
    if (destroyed || expanded === value) return;
    if (value) {
      expandedInstance?.collapse(); expandedInstance = api;
      savedStyle = container.getAttribute('style'); bodyOverflow = document.body.style.overflow; previousFocus = document.activeElement;
      Object.assign(container.style,{position:'fixed',boxSizing:'border-box',inset:'0',width:'100vw',height:'100dvh',maxWidth:'none',maxHeight:'none',margin:'0',zIndex:'2147483000',borderRadius:'0',background:'white',display:'flex',flexDirection:'column'});
      expandedBar.hidden=false;iframe.style.height='calc(100% - 48px)';
      document.body.style.overflow = 'hidden';
    } else {
      if (savedStyle === null) container.removeAttribute('style'); else container.setAttribute('style',savedStyle);
      expandedBar.hidden=true;iframe.style.height='100%';
      document.body.style.overflow = bodyOverflow; expandedInstance = undefined; previousFocus?.focus?.();
    }
    expanded=value; send('expanded',{value}); options.onExpand?.(value);
  }
  const escape = event => {if (event.key === 'Escape' && expanded) expand(false);};
  const beforeUnload = event => {if (current.revision > savedRevision) {event.preventDefault();event.returnValue='';}};
  async function getDocument() {
    await ready;
    if (destroyed) throw new Error('Editor has been destroyed.');
    const requestId = String(++requestCounter);
    return new Promise((resolve,reject) => {
      const timer = setTimeout(() => {requests.delete(requestId);reject(new Error('Editor did not respond. Do not discard the current draft.'));},10000);
      requests.set(requestId,{resolve,reject,timer}); send('get',{requestId});
    });
  }
  function save() {
    const operation = saving.catch(() => {}).then(async () => {
      if (typeof options.onSave !== 'function') throw new Error('Provide onSave to persist documents.');
      const snapshot = await getDocument(); send('save-state',{saving:true});
      try {
        await options.onSave({...snapshot});
        savedRevision = Math.max(savedRevision,snapshot.revision);
        send('save-state',{saving:false,savedRevision,markdown:snapshot.markdown,activeFileId:snapshot.activeFileId});
        return snapshot;
      } catch (error) {send('save-state',{saving:false,error:true});throw error;}
    });
    saving = operation;
    return operation;
  }
  function receive(event) {
    const m = event.data;
    if (destroyed || event.source !== iframe.contentWindow || event.origin !== url.origin || !m || m.protocol !== protocol || m.channel !== channel) return;
    if (m.type === 'ready' && typeof m.boot === 'string') {
      if (boot !== m.boot) rejectRequests('Editor reloaded; retry the operation.');
      boot = m.boot; initialized = false;
      send('init',{...configuration,document:current,savedRevision,canSave:typeof options.onSave === 'function',readOnly:options.readOnly === true,preferences:options.preferences,baseURL:new URL(options.baseURL || './',location.href).href});
      return;
    }
    if (m.boot !== boot) return;
    if (m.type === 'initialized') {initialized=true;clearTimeout(startup);readyResolve(api);send('expanded',{value:expanded});}
    else if (m.type === 'error') {const error=new Error(m.message || 'Editor could not load.');if (!initialized) {clearTimeout(startup);readyReject(error);}report(error);}
    else if (!initialized) return;
    else if (m.type === 'change') accept(m.document);
    else if (m.type === 'result' && requests.has(m.requestId)) {
      const entry = requests.get(m.requestId);requests.delete(m.requestId);clearTimeout(entry.timer);
      if (accept(m.document)) entry.resolve({...current});else entry.reject(new Error('Invalid document response.'));
    } else if (m.type === 'save-request') {const requestBoot=boot;save().then(document=>{if(boot===requestBoot)send('save-result',{requestId:m.requestId,document});},error=>{if(boot===requestBoot)send('save-result',{requestId:m.requestId,error:true});report(error);});}
    else if (m.type === 'toggle-expand') expand(!expanded);
    else if (m.type === 'collapse') expand(false);
  }
  async function destroy({discardChanges = false} = {}) {
    if (destroyed) return;
    if (!discardChanges) { await saving.catch(() => {}); await getDocument(); }
    if (!discardChanges && current.revision > savedRevision) throw new Error('Unsaved changes: await editor.save() before removing the editor.');
    expand(false);destroyed=true;clearTimeout(startup);readyReject(new Error('Editor destroyed.'));rejectRequests('Editor destroyed.');
    window.removeEventListener('message',receive);window.removeEventListener('keydown',escape);window.removeEventListener('beforeunload',beforeUnload);iframe.remove();expandedBar.remove();
  }
  async function getActiveDocument(){const {id,activeFileId,title,markdown}=await getDocument();return {id,activeFileId,title,markdown};}
  const api = {ready,getDocument,getActiveDocument,save,expand:()=>expand(true),collapse:()=>expand(false),destroy};
  window.addEventListener('message',receive);window.addEventListener('keydown',escape);window.addEventListener('beforeunload',beforeUnload);
  iframe.src=url.href;container.append(expandedBar,iframe);
  return api;
}
