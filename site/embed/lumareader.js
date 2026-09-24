/** LumaReader iframe SDK v1. Host owns persistence; no remote storage is assumed. */
const protocol = 'lumareader-embed-v1';
let expandedInstance;
function validateDocument(document) {
  if (!document || typeof document.id !== 'string' || !document.id || document.id.length > 200 || typeof document.markdown !== 'string' || document.markdown.length > 64 * 1024 * 1024) throw new TypeError('Provide {id, title, markdown}; Markdown must be at most 64 Mi characters.');
  return {id:document.id,title:String(document.title || '').slice(0,200),markdown:document.markdown,revision:0};
}
export function mountLumaReader(container, options) {
  if (!(container instanceof HTMLElement)) throw new TypeError('A container element is required.');
  if (container.children.length) throw new Error('Use an empty container for each editor.');
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
  expandedBar.hidden=true;expandedBar.style.cssText='flex:none;box-sizing:border-box;height:38px;padding:4px 10px;text-align:right;background:#fafafa;color:#333;border-bottom:1px solid #ddd';
  collapseButton.type='button';collapseButton.textContent=options.collapseLabel || '↙';collapseButton.setAttribute('aria-label',options.collapseLabel || 'Exit expanded view');collapseButton.style.cssText='font:inherit;cursor:pointer;padding:3px 10px;border:1px solid #ddd;border-radius:6px;background:white;color:#333';
  collapseButton.onclick=()=>expand(false);expandedBar.append(collapseButton);
  let readyResolve, readyReject;
  const ready = new Promise((resolve,reject) => {readyResolve=resolve;readyReject=reject;});
  const startup = setTimeout(() => readyReject(new Error('LumaReader did not load. Check the URL and frame policy.')),20000);
  function send(type, data = {}) {if (!destroyed) iframe.contentWindow?.postMessage({protocol,channel,boot,type,...data},url.origin);}
  function report(error) {options.onError?.(error);}
  function rejectRequests(message) {for (const entry of requests.values()) {clearTimeout(entry.timer);entry.reject(new Error(message));}requests.clear();}
  function accept(document) {
    if (!document || document.id !== current.id || typeof document.markdown !== 'string' || !Number.isSafeInteger(document.revision) || document.revision < current.revision) return false;
    const changed = document.revision > current.revision;
    current = {id:current.id,title:current.title,markdown:document.markdown,revision:document.revision};
    if (changed) {try {options.onChange?.({...current});} catch (error) {report(error);}}
    return true;
  }
  function expand(value = true) {
    if (destroyed || expanded === value) return;
    if (value) {
      expandedInstance?.collapse(); expandedInstance = api;
      savedStyle = container.getAttribute('style'); bodyOverflow = document.body.style.overflow; previousFocus = document.activeElement;
      Object.assign(container.style,{position:'fixed',boxSizing:'border-box',inset:'0',width:'100vw',height:'100dvh',maxWidth:'none',maxHeight:'none',margin:'0',zIndex:'2147483000',borderRadius:'0',background:'white',display:'flex',flexDirection:'column'});
      expandedBar.hidden=false;iframe.style.height='calc(100% - 38px)';
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
        send('save-state',{saving:false,savedRevision,markdown:snapshot.markdown});
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
      send('init',{document:current,savedRevision,canSave:typeof options.onSave === 'function',readOnly:options.readOnly === true,preferences:options.preferences,baseURL:new URL(options.baseURL || './',location.href).href});
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
  const api = {ready,getDocument,save,expand:()=>expand(true),collapse:()=>expand(false),destroy};
  window.addEventListener('message',receive);window.addEventListener('keydown',escape);window.addEventListener('beforeunload',beforeUnload);
  iframe.src=url.href;container.append(expandedBar,iframe);
  return api;
}
