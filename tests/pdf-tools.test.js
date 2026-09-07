'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Marked}=require('../renderer/vendor/marked/marked.umd.js');
const {install,marker}=require('../renderer/pdf-tools');
test('PDF page breaks are standalone blocks, never markers inside code or prose',()=>{
 const marked=new Marked();install(marked);
 const html=marked.parse('# One\n\n'+marker+'\n\n# Two');
 assert.equal((html.match(/class="luma-page-break"/g)||[]).length,1);
 for(const source of ['```html\n'+marker+'\n```','~~~\n'+marker+'\n~~~','    '+marker,'Here is '+marker+' inline.', '`'+marker+'`'])assert.doesNotMatch(marked.parse(source),/class="luma-page-break"/);
 assert.equal((marked.parse(marker+'\r\n\r\nNext').match(/class="luma-page-break"/g)||[]).length,1);
});
