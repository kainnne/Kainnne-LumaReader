import {mountLumaReader,setExpandIcon} from './lumareader.js?v=1.4.1-web.8';
const key = 'lumareader-embed-demo-v1', $ = id => document.getElementById(id);
const initial = {id:'novel-transcript-01',title:'第一章・逐字稿',markdown:'# 第一章・逐字稿\n\n午後的雨停了，她推開書店的門。\n\n**編輯這段文字**，直接修改文字，再試試視窗外的放大按鈕。縮回之後，內容和游標都會保留。\n\n## 對話筆記\n\n| 角色 | 台詞 |\n| --- | --- |\n| 小雨 | 你也在等雨停嗎？ |\n| 店長 | 我在等故事開始。 |\n\n修改表格後，按「儲存並前往下一步」，再回來確認內容仍然存在。\n'};
let draft = initial, editor, storageError = false, backupTimer;
function error(value) {storageError=true;$('notice').textContent='草稿未能儲存：'+value.message+'。請先下載 .md 備份。';$('notice').dataset.error='true';}
try {const raw=localStorage.getItem(key);if(raw){const parsed=JSON.parse(raw);if(parsed.id===initial.id&&typeof parsed.markdown==='string')draft=parsed;}}catch(e){error(e);}
function persist(value) {clearTimeout(backupTimer); backupTimer=null; localStorage.setItem(key,JSON.stringify(value));draft={...value};storageError=false;$('notice').dataset.error='false';$('notice').textContent='草稿已保留在這個瀏覽器；重新整理也能繼續。尚未上傳伺服器。';}
async function mount() {
 editor=mountLumaReader($('reader'),{document:draft,collapseLabel:'縮回編輯器',onChange:value=>{draft=value;clearTimeout(backupTimer);backupTimer=setTimeout(()=>{try{persist(draft);}catch(e){error(e);}},250);},onSave:async value=>persist(value),onError:error,onExpand:expanded=>{setExpandIcon($('expand-reader'),expanded);$('expand-reader').setAttribute('aria-label',expanded?'縮回編輯器':'放大編輯器');$('expand-reader').setAttribute('aria-pressed',String(expanded));}});
 await editor.ready;
}
setExpandIcon($('expand-reader'),false);$('expand-reader').setAttribute('aria-label','放大編輯器');
$('expand-reader').onclick=()=>{if($('expand-reader').getAttribute('aria-pressed')==='true')editor.collapse();else editor.expand();};
$('backup').onclick=async()=>{try{const current=await editor.getDocument();const url=URL.createObjectURL(new Blob([current.markdown],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=String(current.title||'transcript').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').replace(/\.md$/i,'')+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){error(e);}};
$('next').onclick=async()=>{const button=$('next');button.disabled=true;try{await editor.save();await editor.destroy();editor=null;$('edit-step').hidden=true;$('image-step').hidden=false;$('step-label').textContent='02 加入圖片';$('output').textContent=draft.markdown;}catch(e){error(e);}finally{button.disabled=false;}};
$('back').onclick=async()=>{$('back').disabled=true;try{$('image-step').hidden=true;$('edit-step').hidden=false;$('step-label').textContent='01 編輯逐字稿';await mount();}catch(e){error(e);}finally{$('back').disabled=false;}};
$('add-image').onclick=()=>{try{const url=new URL($('image-url').value);if(url.protocol!=='https:')throw Error('圖片請使用 https:// 網址');const caption=$('image-caption').value.replace(/[\[\]\\\r\n]/g,'');const next={...draft,markdown:draft.markdown+'\n\n!['+caption+']('+url.href.replace(/[()<>]/g,c=>'%'+c.charCodeAt(0).toString(16))+')\n'};if(next.files)next.files=next.files.map(file=>file.id===next.activeFileId?{...file,markdown:next.markdown}:file);persist(next);$('output').textContent=draft.markdown;$('image-url').value='';$('image-caption').value='';}catch(e){error(e);}};
window.addEventListener('pagehide',()=>{if(backupTimer){try{persist(draft);}catch(e){error(e);}}});
window.addEventListener('beforeunload',event=>{if(backupTimer){try{persist(draft);}catch(e){error(e);}}if(storageError){event.preventDefault();event.returnValue='';}});
mount().catch(error);
