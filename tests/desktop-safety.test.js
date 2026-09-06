"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { pathToFileURL } = require("node:url");
const { Writable } = require("node:stream");
const { finished } = require("node:stream/promises");
const test = require("node:test");
const { LocalReaderService, scanDocuments } = require("../src/local-server");
const { markdownSources } = require("../src/open-target");
const { DocumentWindows } = require("../src/document-windows");
const rendererRoot = path.resolve(__dirname, "../renderer");
function fixture(t) { const root = fs.mkdtempSync(path.join(os.tmpdir(), "luma-candidate-test-")); t.after(() => fs.rmSync(root, { recursive: true, force: true })); return root; }
class Response extends Writable {
 constructor(){super();this.chunks=[];}
 _write(c,_e,cb){this.chunks.push(c);cb();}
 writeHead(status,headers){this.statusCode=status;this.headers=headers;}
 text(){return Buffer.concat(this.chunks).toString();}
}
async function request(service, headers = {}) { const response = new Response(); await service.route({url:"/api/health",method:"GET",headers:{host:"127.0.0.1",...headers}},response); await finished(response);return response; }

test("each file launch resolves its parent, Unicode filename, and canonical symlink identity", async(t)=>{
 const root=fixture(t);fs.mkdirSync(path.join(root,"子資料夾"));const file=path.join(root,"子資料夾","閱讀 筆記.md");fs.writeFileSync(file,"hello");
 const alias=path.join(root,"alias.md");fs.symlinkSync(file,alias);
 const manager=new DocumentWindows();const first=await manager.resolve(pathToFileURL(file).href),second=await manager.resolve(pathToFileURL(alias).href);
 assert.equal(first.root,fs.realpathSync.native(path.dirname(file)));assert.equal(first.path,"閱讀 筆記.md");assert.equal(first.key,second.key);
 const context={window:{isDestroyed:()=>false}};manager.add(context,first.key);assert.equal(manager.find(second.key),context);
 manager.update(context,path.join(root,"other.md"));assert.equal(manager.find(first.key),undefined);manager.remove(context);assert.equal(manager.contexts.size,0);
});
test("multi-file launch keeps all supported files and deduplicates repeated arguments",()=>{
 assert.deepEqual(markdownSources(["electron","--dev","a.md","b.md","a.md"],{cwd:"/notes",statSync:()=>({isFile:()=>true})}),[pathToFileURL(path.resolve("/notes/a.md")).href,pathToFileURL(path.resolve("/notes/b.md")).href]);
});
test("window manager stops before unbounded window creation",()=>{
 const manager=new DocumentWindows({maxWindows:2});manager.add({window:{isDestroyed:()=>false}},"a");manager.add({window:{isDestroyed:()=>false}},"b");assert.throws(()=>manager.add({},"c"),/Close a document/);assert.equal(manager.contexts.size,2);
});
test("private reader rejects requests without its per-window credential",async(t)=>{
 const root=fixture(t);const service=new LocalReaderService({rendererRoot,libraryRoot:root,accessToken:"x".repeat(64)});
 assert.equal((await request(service)).statusCode,403);assert.equal((await request(service,{"x-lumareader-token":"wrong"})).statusCode,403);assert.equal((await request(service,{"x-lumareader-token":"x".repeat(64)})).statusCode,200);
});
test("independent document folders save only their own file and reject external reads",async(t)=>{
 const root=fixture(t);for(const dir of ["a","b"]) {fs.mkdirSync(path.join(root,dir));fs.writeFileSync(path.join(root,dir,"same.md"),dir);}
 const a=new LocalReaderService({rendererRoot,libraryRoot:path.join(root,"a"),accessToken:"a"}),b=new LocalReaderService({rendererRoot,libraryRoot:path.join(root,"b"),accessToken:"b"});
 const current=await a.openSource(pathToFileURL(path.join(root,"a/same.md")).href);assert.equal(current.sourceType,"project");
 await a.saveMarkdownDocument(current.path,"changed in a",current.modifiedNs);assert.equal((await b.openSource("same.md")).text,"b");
 await assert.rejects(()=>a.openSource(pathToFileURL(path.join(root,"b/same.md")).href),error=>error.code==="PATH_OUTSIDE_LIBRARY");
});
test("failed replacement preserves the original and removes only its temporary file",async(t)=>{
 const root=fixture(t);const file=path.join(root,"draft.md");fs.writeFileSync(file,"original");const service=new LocalReaderService({rendererRoot,libraryRoot:root});
 const original=await service.openSource("draft.md"),rename=fsp.rename;
 fsp.rename=async()=>{throw Object.assign(new Error("simulated disk failure"),{code:"EIO"});};
 try {await assert.rejects(()=>service.saveMarkdownDocument("draft.md","new",original.modifiedNs),/simulated disk failure/);} finally {fsp.rename=rename;}
 assert.equal(fs.readFileSync(file,"utf8"),"original");assert.deepEqual(fs.readdirSync(root),["draft.md"]);
});
test("simultaneous stale saves from two windows cannot silently overwrite each other",async(t)=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,"draft.md"),"original");const a=new LocalReaderService({rendererRoot,libraryRoot:root}),b=new LocalReaderService({rendererRoot,libraryRoot:root});
 const original=await a.openSource("draft.md");const results=await Promise.allSettled([a.saveMarkdownDocument("draft.md","first",original.modifiedNs,original.revision),b.saveMarkdownDocument("draft.md","second",original.modifiedNs,original.revision)]);
 assert.equal(results.filter(r=>r.status==="fulfilled").length,1);assert.equal(results.find(r=>r.status==="rejected").reason.code,"DOCUMENT_CHANGED");assert.equal(fs.readFileSync(path.join(root,"draft.md"),"utf8"),"first");
});
test("scans stop at configured resource limits",async(t)=>{
 const root=fixture(t);for(let i=0;i<40;i++)fs.writeFileSync(path.join(root,`${i}.md`),"x");assert.equal((await scanDocuments(root,{maxFiles:7,statConcurrency:2})).length,7);assert.deepEqual(await scanDocuments(root,{totalTimeoutMs:0}),[]);
});

test("library roots use the same canonical paths as asynchronous filesystem operations", async (t) => {
 const root = fixture(t);
 const service = new LocalReaderService({ rendererRoot, libraryRoot: root });
 assert.equal(service.getLibraryRoot(), await fsp.realpath(root));
});

test("content revisions reject external same-length edits even with a matching timestamp", async (t) => {
 const root = fixture(t); const file = path.join(root, "draft.md"); fs.writeFileSync(file, "before");
 const service = new LocalReaderService({ rendererRoot, libraryRoot: root });
 const original = await service.openSource("draft.md");
 fs.writeFileSync(file, "after!");
 const current = await service.openSource("draft.md");
 await assert.rejects(() => service.saveMarkdownDocument("draft.md", "my edit", current.modifiedNs, original.revision), error => error.code === "DOCUMENT_CHANGED");
 assert.equal(fs.readFileSync(file, "utf8"), "after!");
});
