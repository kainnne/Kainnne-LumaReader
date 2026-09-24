import {mountLumaReader,setExpandIcon} from './lumareader.js?v=1.4.1-web.10';
const $=s=>document.querySelector(s),key='lumareader-annotation-demo-v1';
let draft={id:'annotation-example',title:'閱讀與註記',markdown:'# 一段文字，多一點補充\n\n她推開門，走進午後的光裡。\n\n反白這段文字，試著替它加上圖片或重點。\n\n她推開門，走進午後的光裡。\n\n這兩句完全相同。只要反白其中一句，註記就只會綁在那一句。\n'},selection,timer;
try{const saved=localStorage.getItem(key);if(saved)draft=JSON.parse(saved);}catch{$('#status').textContent='無法讀取瀏覽器草稿。';}
function persist(snapshot){localStorage.setItem(key,JSON.stringify(snapshot));draft=snapshot;$('#status').textContent='正文與註記已存於此瀏覽器。';}
function report(error){$('#status').textContent=error.code?.startsWith('STALE')?'稿件已更新，請重新選取文字。':'儲存或操作失敗，內容仍保留在編輯器中。';}
const editor=mountLumaReader($('#reader'),{document:draft,features:{annotations:true},language:'zh-Hant',
 onChange:snapshot=>{draft=snapshot;clearTimeout(timer);timer=setTimeout(()=>{try{persist(snapshot);}catch(error){report(error);}},300);},
 onSave:async snapshot=>{clearTimeout(timer);persist(snapshot);},onError:report,
 onExpand:expanded=>setExpandIcon($('#expand'),expanded)});
setExpandIcon($('#expand'),false);$('#expand').onclick=()=>editor.expand();
window.addEventListener('pagehide',()=>{if(timer)try{persist(draft);}catch{}});
editor.ready.catch(report);
