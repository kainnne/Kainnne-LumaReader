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

test('PDF font layout accepts 8px and clamps values outside the supported range',()=>{
 const {normalizePdfLayout}=require('../src/pdf-export');
 assert.equal(normalizePdfLayout({fontSize:8}).fontSize,8);
 assert.equal(normalizePdfLayout({fontSize:1}).fontSize,8);
 assert.equal(normalizePdfLayout({fontSize:40}).fontSize,22);
});

test('PDF presets share physical geometry between print CSS and native output',()=>{
 const {normalizeLayout,pageDimensions,pageStyle}=require('../renderer/pdf-tools');
 const {pdfOptions}=require('../src/pdf-export');
 for(const pageSize of ['A4','Letter','16:9','4:3']) {
   const portrait=pageDimensions({pageSize,orientation:'portrait'});
   const landscape=pageDimensions({pageSize,orientation:'landscape'});
   assert.equal(portrait.width,landscape.height);assert.equal(portrait.height,landscape.width);
   for(const orientation of ['portrait','landscape']) {
     const layout={pageSize,orientation},mm=pageDimensions(layout),native=pdfOptions('',layout).pageSize;
     assert.ok(Math.abs(native.width*25.4-mm.width)<0.001);assert.ok(Math.abs(native.height*25.4-mm.height)<0.001);
     assert.ok(pageStyle(layout).includes(`${mm.width}mm ${mm.height}mm`));
   }
 }
 assert.equal(normalizeLayout({pageSize:'Letter'}).orientation,'portrait');
 assert.equal(normalizeLayout({pageSize:'16:9'}).orientation,'landscape');
 assert.equal(normalizeLayout({pageSize:'invalid',orientation:'invalid'}).pageSize,'A4');
 assert.equal(normalizeLayout({pageSize:'__proto__'}).pageSize,'A4');
});

test('PDF available area accounts for orientation, repeating padding and footer band',()=>{
 const {pageArea,pageStyle}=require('../renderer/pdf-tools');
 assert.deepEqual(pageArea({pageSize:'16:9',orientation:'landscape',inset:14}),{width:284,height:137});
 assert.deepEqual(pageArea({pageSize:'16:9',orientation:'portrait',inset:14,colorFrame:true}),{width:144,height:281});
 const css=pageStyle({pageSize:'16:9',orientation:'landscape',inset:14,colorFrame:true,accent:'#8f69c4'});
 assert.match(css,/padding: 14mm/);assert.match(decodeURIComponent(css),/width="320mm" height="180mm"/);
 assert.doesNotMatch(pageStyle({colorFrame:false}),/data:image/);
});
