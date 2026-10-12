'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const {Writable, PassThrough} = require('node:stream');

class Response extends Writable {
  constructor(){ super(); this.chunks=[]; this.headersSent=false; this.writes=0; }
  _write(chunk,_encoding,done){this.chunks.push(Buffer.from(chunk));done();}
  writeHead(status,headers){assert.equal(this.headersSent,false,'Headers must not be sent twice');this.headersSent=true;this.writes++;this.statusCode=status;this.headers=headers;}
  body(){return Buffer.concat(this.chunks).toString();}
}
function fixture(t, createReadStream=fs.createReadStream){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'luma-stream-test-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'index.html'),'<h1>Healthy reader</h1>');
  fs.writeFileSync(path.join(root,'empty.css'),'');
  fs.writeFileSync(path.join(root,'bad.png'),'image');
  const entry=path.resolve(__dirname,'../src/local-server.js'), localRequire=createRequire(entry), module={exports:{}};
  vm.runInNewContext(fs.readFileSync(entry,'utf8'),{require:name=>name==='node:fs'?{...fs,createReadStream}:localRequire(name),module,exports:module.exports,TextDecoder,URL,Buffer,console,process},{filename:entry});
  return new module.exports.LocalReaderService({rendererRoot:root,libraryRoot:root});
}
const request=url=>({url,method:'GET',headers:{host:'127.0.0.1'}});
async function healthy(service){const response=new Response();await service.route(request('/'),response);assert.equal(response.statusCode,200);assert.match(response.body(),/Healthy reader/);}

test('empty static files and HEAD finish successfully without opening an invalid byte range',async t=>{
  let opens=0;const service=fixture(t,(...args)=>{opens++;return fs.createReadStream(...args);});
  const empty=new Response();await service.route(request('/empty.css'),empty);assert.equal(empty.statusCode,200);assert.equal(empty.body(),'');assert.equal(opens,0);
  const head=new Response();await service.route({...request('/'),method:'HEAD'},head);assert.equal(head.statusCode,200);assert.equal(head.body(),'');assert.equal(opens,0);
  await healthy(service);
});

test('a read failure before open is confined to one request; the next document still loads',async t=>{
  const service=fixture(t,(file,...args)=>{
    if(!file.endsWith('bad.png'))return fs.createReadStream(file,...args);
    const stream=new PassThrough();process.nextTick(()=>stream.destroy(Object.assign(new Error('I/O failure'),{code:'EIO'})));return stream;
  });
  const response=new Response();await service.route(request('/bad.png'),response);assert.equal(response.writes,1);assert.match(response.body(),/EIO/);await healthy(service);
});

test('a read failure after partial data closes only that response without a second header write',async t=>{
  let failedStream;const service=fixture(t,(file,...args)=>{
    if(!file.endsWith('bad.png'))return fs.createReadStream(file,...args);
    failedStream=new PassThrough();process.nextTick(()=>{failedStream.emit('open',1);failedStream.write('partial');failedStream.destroy(Object.assign(new Error('I/O failure'),{code:'EIO'}));});return failedStream;
  });
  const response=new Response();await service.route(request('/bad.png'),response);assert.equal(response.writes,1);assert.equal(response.destroyed,true);assert.equal(failedStream.destroyed,true);await healthy(service);
});

test('a cancelled request releases its file stream and does not interrupt other windows',async t=>{
  let stream;const response=new Response();const service=fixture(t,(file,...args)=>{
    if(!file.endsWith('bad.png'))return fs.createReadStream(file,...args);
    stream=new PassThrough();process.nextTick(()=>{stream.emit('open',1);stream.write('partial');response.destroy();});return stream;
  });
  await service.route(request('/bad.png'),response);assert.equal(stream.destroyed,true);await healthy(service);
});
