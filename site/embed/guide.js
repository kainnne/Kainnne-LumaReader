'use strict';
document.querySelectorAll('[data-copy-code]').forEach(button=>button.addEventListener('click',async()=>{
 const code=document.getElementById(button.dataset.copyCode),label=button.textContent;
 try{await navigator.clipboard.writeText(code.textContent.trim());button.textContent='已複製';}
 catch{const range=document.createRange();range.selectNodeContents(code);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);button.textContent='已選取，請複製';}
 setTimeout(()=>{button.textContent=label;},1800);
}));
