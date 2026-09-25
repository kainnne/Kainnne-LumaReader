'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {normalizeSettingsMenu,settingsMenuTemplate}=require('../src/settings-menu');
const model=()=>normalizeSettingsMenu({labels:{open:'開啟設定…',visibility:'工具列顯示項目',theme:'顯示模式',palette:'配色',language:'介面語言',restore:'恢復預設'},visibility:[{id:'settings',label:'設定按鈕',checked:false},{id:'source',label:'原文',checked:true}],themes:[{id:'dark',label:'深色',checked:true}],palettes:[{id:'dream-rose',label:'夢幻粉櫻',checked:true}],languages:[{id:'zh-Hant',label:'繁體中文',checked:true}]});
test('native settings reflect the focused renderer, with a permanent keyboard escape hatch',()=>{
 const commands=[],menu=settingsMenuTemplate(model(),c=>commands.push(c));
 assert.equal(menu.label,'Settings');assert.equal(menu.submenu[0].accelerator,'CmdOrCtrl+,');menu.submenu[0].click();
 const visibility=menu.submenu[2].submenu;assert.equal(visibility[0].checked,false);assert.equal(visibility[1].checked,true);
 visibility[0].click({checked:true});menu.submenu[3].submenu[0].click();menu.submenu[4].submenu[0].click();menu.submenu[5].submenu[0].click();menu.submenu.at(-1).click();
 assert.deepEqual(commands,[{type:'open'},{type:'visibility',value:'settings',checked:true},{type:'theme',value:'dark'},{type:'palette',value:'dream-rose'},{type:'language',value:'zh-Hant'},{type:'restore'}]);
 const other=model();other.visibility[0].checked=true;other.visibility[1].checked=false;
 assert.equal(settingsMenuTemplate(other,()=>{}).submenu[2].submenu[1].checked,false);assert.equal(visibility[1].checked,true);
});
test('menu choices cannot introduce arbitrary native roles, shortcuts or commands',()=>{
 const result=normalizeSettingsMenu({visibility:[{id:'quit',label:'Quit',checked:true},{id:'settings',label:'Settings\u0000',checked:'yes',role:'quit'}],themes:[{id:'unknown',label:'X'}],palettes:Array.from({length:80},()=>({id:'x',label:'a'.repeat(500)}))});
 assert.deepEqual(result.visibility,[{id:'settings',label:'Settings',checked:false}]);assert.deepEqual(result.themes,[]);assert.equal(result.palettes.length,32);assert.equal(result.palettes[0].label.length,120);
 assert.equal(normalizeSettingsMenu(null),null);assert.equal(settingsMenuTemplate(null,()=>{}).submenu[0].enabled,false);
});
