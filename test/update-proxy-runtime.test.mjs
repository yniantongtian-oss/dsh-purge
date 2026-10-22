import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import https from 'node:https';import http from 'node:http';import net from 'node:net';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {requestUpdate} from '../lib/update-http.js';
const exec=promisify(execFile);

test('real CONNECT tunnel validates TLS, scopes credentials and respects total timeout',async t=>{
  if(!process.env.PURGE_PROXY_TEST_CHILD) {
    const tmp=process.env.PURGE_TEST_TLS_DIR || fs.mkdtempSync(path.join(os.tmpdir(),'purge-tls-'));
    if(!process.env.PURGE_TEST_TLS_DIR) {
      try {await exec('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(tmp,'key.pem'),'-out',path.join(tmp,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,DNS:api.github.com,DNS:release-assets.githubusercontent.com']);}
      catch(e) {if(process.platform==='win32' && e.code==='ENOENT'){t.skip('Provide PURGE_TEST_TLS_DIR when OpenSSL is unavailable');return;}throw e;}
    }
    try {
      const env={...process.env,PURGE_PROXY_TEST_CHILD:'1',PURGE_TEST_TLS_DIR:tmp,NODE_EXTRA_CA_CERTS:path.join(tmp,'cert.pem')};
      delete env.NODE_TEST_CONTEXT;
      const result=await exec(process.execPath,['--test',fileURLToPath(import.meta.url)],{
        timeout:30000,maxBuffer:1024*1024,env,
      }).catch(e=>{throw Error(e.message+'\n'+e.stdout+'\n'+e.stderr);});
      // Node 22 prints TAP (`# fail 0`). Node 24's spec reporter prints `ℹ fail 0`.
      const summary=`${result.stdout}\n${result.stderr}`;
      assert.match(summary,/(?:#|\u2139) fail 0/);
      assert.match(summary,/(?:#|\u2139) pass [1-9]/);
    } finally {if(!process.env.PURGE_TEST_TLS_DIR)fs.rmSync(tmp,{recursive:true,force:true});}
    return;
  }
  const dir=process.env.PURGE_TEST_TLS_DIR;const requests=[],connects=[];const sockets=new Set();
  const server=https.createServer({key:fs.readFileSync(path.join(dir,'key.pem')),cert:fs.readFileSync(path.join(dir,'cert.pem'))},(req,res)=>{
    requests.push({url:req.url,headers:req.headers});
    if(req.url==='/redirect'){res.writeHead(302,{location:`https://release-assets.githubusercontent.com:${server.address().port}/asset`});res.end();}
    else if(req.url==='/slow'){res.writeHead(200);res.write('x');}
    else if(req.url==='/large'){res.end('too many bytes');}
    else res.end('verified');
  });
  const proxy=http.createServer();
  proxy.on('connect',(req,socket,head)=>{
    connects.push({url:req.url,headers:req.headers});
    const upstream=net.connect(server.address().port,'127.0.0.1',()=>{socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);socket.pipe(upstream).pipe(socket);});
    sockets.add(upstream);upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());socket.on('close',()=>upstream.destroy());
  });
  for(const s of [server,proxy]){s.on('connection',socket=>sockets.add(socket));await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));}
  try {
    const env={HTTPS_PROXY:`http://user:fixture@127.0.0.1:${proxy.address().port}`,GH_TOKEN:'test-token'};
    const base=`https://api.github.com:${server.address().port}`;
    assert.equal((await requestUpdate(base+'/redirect',{env})).body.toString(),'verified');
    assert.equal(requests[0].headers.authorization,'Bearer test-token');
    assert.equal(requests[1].headers.authorization,undefined);
    assert.equal(requests[0].headers['proxy-authorization'],undefined);
    assert(connects.every(r=>!r.headers.authorization && r.headers['proxy-authorization']==='Basic '+Buffer.from('user:fixture').toString('base64')));
    await assert.rejects(requestUpdate(`https://github.com:${server.address().port}/asset`,{env}),/网络连接失败/);
    await assert.rejects(requestUpdate(base+'/large',{env,maxBytes:2}),/过大/);
    await assert.rejects(requestUpdate(base+'/slow',{env,timeout:100}),/超时/);
  } finally {for(const socket of sockets)socket.destroy();await Promise.all([server,proxy].map(s=>new Promise(resolve=>s.close(resolve))));}
});
