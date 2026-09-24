'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {build,groups}=require('../scripts/build-web-runtime.cjs');
test('published Web bundles match sources and preserve ordered deferred startup',async()=>{
 await build({check:true});
 const html=await fs.readFile('site/web/index.html','utf8');
 const scripts=[...html.matchAll(/<script\b([^>]*)src="([^"]+)"[^>]*>/g)];
 assert.deepEqual(scripts.map(m=>m[2].split('?')[0]),Object.keys(groups));
 assert.ok(scripts.every(m=>/\bdefer\b/.test(m[1])));
 assert.ok(!Object.values(groups).flat().includes('code-editor.bundle.js'));
});
