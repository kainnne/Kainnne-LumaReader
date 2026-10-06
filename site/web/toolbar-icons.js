/* One 24 px grid, 1.6 px rounded strokes for the native Reader toolbar. */
(() => {
  'use strict';
  const paths={
edit:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6M14 3v6h6M14 3l6 6M8 9h2M8 13h4M15 17l4-4 2 2-4 4-3 1z"/>',
settings:'<path d="M3 6h6M13 6h8M3 12h11M18 12h3M3 18h3M10 18h11"/><circle cx="11" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
save:'<path d="M5 12l4 4L19 6"/><path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/>',
exit:'<path d="M6 6l12 12M18 6 6 18"/>',
export:'<path d="M12 15V3M8 7l4-4 4 4M8 10H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-3"/>',
exportPdf:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M14 3v6h6M14 3l6 6M12 11v7M9 15l3 3 3-3"/>',
source:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M14 3v6h6M14 3l6 6M9 12l-2 3 2 3M15 12l2 3-2 3M13 11l-2 8"/>',
media:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="M4 17l5-5 4 4 4-6 4 7"/>',
vertical:'<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 7h6M9 11h6M12 14v4M10 16l2 2 2-2"/>',
horizontal:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 9v6M11 9v6M14 12h4M16 10l2 2-2 2"/>',
pagedH:'<rect x="3" y="5" width="8" height="14" rx="1.5"/><rect x="13" y="5" width="8" height="14" rx="1.5"/><path d="M6 9h2M6 12h2M16 9h2M16 12h2"/>',
pagedV:'<rect x="5" y="3" width="14" height="8" rx="1.5"/><rect x="5" y="13" width="14" height="8" rx="1.5"/><path d="M9 6h6M9 8h4M9 16h6M9 18h4"/>',
language:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>',
fontDown:'<path d="M3 18 8 5l5 13M5 13h6M16 12h5"/>',
fontUp:'<path d="M3 18 8 5l5 13M5 13h6M16 12h5M18.5 9.5v5"/>',
previewNormal:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
previewLayout:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 8h18M12 8v13M6 12h3M6 16h3M15 12h3M15 16h3"/>',
modeDirect:'<path d="M13 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h6M8 8h6M8 12h3M14 16l5-5 2 2-5 5-3 1z"/>',
modeSource:'<path d="M7 6l-5 6 5 6M17 6l5 6-5 6M14 4l-4 16"/>',
modeCompare:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 4v16M5 8h4M5 12h4M5 16h3M15 8h4M15 12h3"/>',
modeLayout:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M7 6h10M7 10h4v8H7zM14 10h3v3h-3zM14 16h3"/>',
compare:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M11 4v16M6 8h2M6 12h2M6 16h2M14 9h4M14 13h4"/>',
format:'<path d="M3 7h10M8 7v12M5 19h6M17 5v6M14 8h6"/>',
codeEdit:'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M2 21h20M9 8l-3 3 3 3M15 8l3 3-3 3M13 7l-2 8"/>',
folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l3 4h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 9h18"/>',
newMd:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M14 3v6h6M14 3l6 6M12 12v6M9 15h6"/>',
refresh:'<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
sidebar:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M5.5 8h1M5.5 11h1"/>',
undo:'<path d="M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12"/>',
redo:'<path d="M16 5l5 5-5 5M21 10H10a6 6 0 0 0 0 12"/>',
expand:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
collapse:'<path d="M3 8h5V3M21 8h-5V3M8 21v-5H3M16 21v-5h5"/>',
highlight:'<path d="M8 14l8-8 4 4-8 8-4-4zM10 16l-3 3H3l5-5M3 22h18"/>',
imageNote:'<rect x="3" y="3" width="18" height="16" rx="2"/><path d="M3 14l5-5 5 5 4-5 4 5M7 19v3l4-3"/><circle cx="16" cy="7" r="1"/>',
more:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'};
  function svg(key){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(paths[key]||paths.more)+'</svg>';}
  const bar=document.querySelector('.reader-actions');
  let context={};
  const fixed={'cancel-edit':'exit','editor-preview-control':'compare','editor-insert-toggle':'format','code-edit-control':'codeEdit','source-view':'source','media-view':'media','language-toggle':'language','font-down':'fontDown','font-up':'fontUp','palette-toggle':'settings','export-pdf':'export','share-document':'export','report-preview-export':'exportPdf'};
  function render(options){
    if(options)context={...context,...options};
    const keys={...fixed,'edit-document':document.body.classList.contains('editing-document')?'save':'edit',
      'show-markdown':({direct:'modeDirect',source:'modeSource',split:'modeCompare',pdf:'modeLayout'})[context.mode]||'modeDirect',
      'reading-mode-toggle':({vertical:'vertical',horizontal:'horizontal','paged-horizontal':'pagedH','paged-vertical':'pagedV'})[document.querySelector('#reading-mode').value]||'vertical',
      'preview-form-toggle':context.previewForm==='layout'?'previewLayout':'previewNormal'};
    for(const [id,key]of Object.entries(keys)){
      const button=document.getElementById(id);if(!button)continue;
      button.classList.add('luma-icon-only');
      button.querySelectorAll(':scope > svg').forEach(old=>old.remove());
      // Preserve named labels and inputs used by state updates and checkbox actions.
      for(const node of [...button.childNodes])if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()){
        const label=document.createElement('span');label.className='luma-action-label';node.replaceWith(label);label.append(node);
      }
      let icon=button.querySelector(':scope > .luma-action-icon');
      if(!icon){icon=document.createElement('span');icon.className='luma-action-icon';icon.setAttribute('aria-hidden','true');button.prepend(icon);}
      if(icon.dataset.icon!==key){icon.dataset.icon=key;icon.innerHTML=svg(key);if(id==='export-pdf'||id==='share-document')icon.firstElementChild.classList.add('share-symbol');}
      const labelIds={'code-edit-control':'code-edit-label','editor-insert-toggle':'format-menu-label'};
      const dynamic=labelIds[id]?document.getElementById(labelIds[id])?.textContent.trim():['report-preview-export','editor-preview-control'].includes(id)?button.querySelector(':scope > span:not(.luma-action-icon)')?.textContent.trim():null;
      const copy=dynamic||button.getAttribute('aria-label')||button.querySelector('span:not(.luma-action-icon):last-of-type')?.textContent.trim();
      if(copy){if(button.getAttribute('aria-label')!==copy)button.setAttribute('aria-label',copy);button.dataset.tooltip=copy;button.setAttribute('aria-describedby','toolbar-tooltip');button.removeAttribute('title');const input=button.querySelector('input');if(input){input.setAttribute('aria-label',copy);input.setAttribute('aria-describedby','toolbar-tooltip');}}
    }
  }
  window.LumaToolbarIcons={svg,render};
  // State updates replace translated labels; keep icons in sync without a timer.
  if(bar){new MutationObserver(()=>render()).observe(bar,{childList:true,characterData:true,subtree:true});render();}
})();
