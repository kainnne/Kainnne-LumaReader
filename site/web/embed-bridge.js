/* Optional host transport. The embedded page is the existing Web app, with no
   replacement markup, styles, translations, menus, or editor implementation. */
(() => {
  'use strict';
  if (parent === window || new URLSearchParams(location.search).get('embed') !== '1') return;
  const params = new URLSearchParams(location.hash.slice(1));
  const parentOrigin = params.get('parentOrigin'), channel = params.get('channel');
  if (!/^https?:\/\//.test(parentOrigin || '') || !channel) return;
  window.document.body.classList.add('embedded-reader');
  // Some browsers block storage in third-party frames. Keep the existing
  // preference API usable in memory; document persistence remains host-owned.
  try { const key='lumareader-embed-storage-check';localStorage.setItem(key,'1');localStorage.removeItem(key); }
  catch { const values=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:key=>values.get(String(key))??null,setItem:(key,value)=>values.set(String(key),String(value)),removeItem:key=>values.delete(String(key)),clear:()=>values.clear(),key:index=>[...values.keys()][index]??null,get length(){return values.size;}}}); }
  const protocol = 'lumareader-embed-v1', boot = (crypto.randomUUID?.() || [...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('')), pending = new Map();
  let config, document, api, revision = 0, savedRevision = 0, sequence = 0, resolveReady;
  const ready = new Promise(resolve => {resolveReady = resolve;});
  const send = (type,data = {}) => parent.postMessage({protocol,channel,boot,type,...data},parentOrigin);
  function changed(text) {
    if (!document || text === document.markdown) return;
    document.markdown = text; revision++; send('change',{document:snapshot(false)});
  }
  function snapshot(refresh = true) {
    if (refresh && api) changed(api.getText());
    const workspace=api?.getFiles?.()||{},active=workspace.files?.find(file=>file.id===workspace.activeFileId);
    return {...document,...(active?{title:active.title,markdown:active.markdown}:{}),...workspace,revision};
  }
  function persist(text) {
    changed(text);
    if (!config.canSave) return Promise.reject(new Error(api.message('saveFailed')));
    const requestId = String(++sequence);
    return new Promise((resolve,reject) => {
      const timer = setTimeout(() => {pending.delete(requestId);reject(new Error(api.message('saveFailed')));},60000);
      pending.set(requestId,{resolve,reject,timer});send('save-request',{requestId});
    });
  }
  window.LumaEmbed = {
    ready, get config(){return config;}, get markdown(){return document?.markdown || '';},
    managedPath:null, changed, persist,
    workspaceChanged(){revision++;send('change',{document:snapshot()});},
    activate(path,title,text){this.managedPath=path;document.title=title;document.markdown=text;},
    get dirty(){return revision>savedRevision;},
    rename(title){if(config.readOnly||config.features?.rename===false||document.title===title)return;document.title=title;revision++;send('change',{document:snapshot()});},
    attach(application) {api = application;send('initialized',{document:snapshot()});},
    get attached(){return Boolean(api);}
  };
  window.addEventListener('message',event => {
    const m=event.data;
    if(event.source!==parent||event.origin!==parentOrigin||!m||m.protocol!==protocol||m.channel!==channel||m.boot!==boot)return;
    if(m.type==='init'&&!config){
      if(!m.document||typeof m.document.id!=='string'||typeof m.document.markdown!=='string'){send('error',{message:'Invalid document'});return;}
      config=m;document={id:m.document.id,title:String(m.document.title||''),markdown:m.document.markdown};revision=m.document.revision||0;savedRevision=m.savedRevision||0;resolveReady(config);
    }else if(m.type==='get'&&api)send('result',{requestId:m.requestId,document:snapshot()});
    else if(m.type==='save-state'&&api){
      if(Number.isSafeInteger(m.savedRevision)&&m.savedRevision>=savedRevision){
        savedRevision=m.savedRevision;
        if(typeof m.markdown==='string')api.saved(m.markdown,m.activeFileId);
      }
      if(m.error)api.error();
    }else if(m.type==='save-result'&&pending.has(m.requestId)){
      const request=pending.get(m.requestId);pending.delete(m.requestId);clearTimeout(request.timer);
      if(m.error)request.reject(new Error(api.message('saveFailed')));else request.resolve(m.document);
    }
  });
  send('ready');
})();
