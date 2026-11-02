const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict'),{webcrypto}=require('crypto');
function load(path,imports){const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const m={exports:{}};vm.runInNewContext(code,{module:m,exports:m.exports,require:k=>{if(k in imports)return imports[k];throw Error(k)},URL,Request,Response,crypto:webcrypto,structuredClone,console});return m.exports}
const model=load('lib/page-model.ts',{}),pixel=load('lib/meta-pixel.ts',{'./page-model':model});
const settings={...model.bookSettings,metaPixelId:'123456789012345',metaPixelEnabled:'on'};
function run(s=settings,host='radas.my',path='/p/book'){
 const html=pixel.metaPixelHTML(s,'book'),listeners={},inserted=[];
 const ctx={location:{hostname:host,pathname:path},document:{createElement:()=>({}),getElementsByTagName:()=>[{parentNode:{insertBefore:n=>inserted.push(n)}}],addEventListener:(name,fn)=>listeners[name]=fn}};ctx.window=ctx;
 if(html)vm.runInNewContext(html.replace(/^<script[^>]*>/,'').replace(/<\/script>$/,''),ctx);
 return {ctx,listeners,inserted,html};
}
assert.equal(pixel.metaPixelHTML({...settings,metaPixelEnabled:'off'},'book'),'');
assert.equal(pixel.metaPixelHTML({...settings,metaPixelId:'<script>'},'book'),'');
assert.equal(pixel.metaPixelHTML(settings),'');
for(const host of ['preview.vercel.app','terminal.local','radas-buku-forex-crypto.hawaiskandar.chatgpt.site'])assert.equal(run(settings,host).inserted.length,0);
assert.equal(run(settings,'radas.my','/admin').inserted.length,0);
const r=run();assert.equal(r.inserted.length,1);assert.equal(r.inserted[0].src,'https://connect.facebook.net/en_US/fbevents.js');
const queue=r.ctx.fbq.queue;assert.equal(queue[2][0],'trackSingle');assert.equal(queue[2][1],settings.metaPixelId);assert.equal(queue[2][2],'PageView');
const click=(trusted,link)=>r.listeners.click({isTrusted:trusted,target:{closest:()=>link?{}:null}});
click(false,true);click(true,false);assert.equal(queue.length,3);click(true,true);click(true,true);assert.equal(queue.length,4);assert.equal(queue[3][2],'InitiateCheckout');assert.equal(queue[3][3].currency,'MYR');assert.equal(queue[3][3].value,65);assert.equal(queue[3][3].content_ids[0],'book');assert(!r.html.includes("'Purchase'"));
vm.runInNewContext(r.html.replace(/^<script[^>]*>/,'').replace(/<\/script>$/,''),r.ctx);assert.equal(queue.length,4);
const other=run({...settings,metaPixelId:'987654321098765'});assert.equal(other.ctx.fbq.queue[2][1],'987654321098765');
console.log('PASS: production-only Pixel, disabled/invalid ID rejection, single PageView, trusted checkout clicks once, MYR payload, no Purchase, repeated-script guard and pixel isolation.');
