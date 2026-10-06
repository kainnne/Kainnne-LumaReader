'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),asar=require('@electron/asar'),{LANGUAGES}=require('../src/interface-defaults');
const language=process.env.LUMAREADER_DEFAULT_LANGUAGE;
assert.ok(LANGUAGES.includes(language));
const root=path.resolve('dist/languages',language),archives=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isSymbolicLink())continue;if(entry.isDirectory())walk(file);else if(entry.name==='app.asar')archives.push(file);}}
walk(root);assert.ok(archives.length,'Unpacked application is required for language verification');
for(const archive of archives){const metadata=JSON.parse(asar.extractFile(archive,'package.json'));assert.equal(metadata.lumareaderDefaultLanguage,language);assert.deepEqual(asar.extractFile(archive,'src/interface-defaults.js'),fs.readFileSync(path.resolve('src/interface-defaults.js')));}
console.log('PASS: Embedded default language '+language+' in '+archives.length+' application archive(s).');
