const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../app/src/main/assets');
const ui=fs.readFileSync(path.join(dir,'link-ui.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
test('los controles usados en el panel de chat existen',()=>{
 for(const id of ['lkInput','lkPrepare','lkSend','lkRetry','lkListen','lkAck','lkChannel','lkUnit','lkChunk','lkRetries','lkFEC','lkAutoNext','lkAutoAck','lkAutoRetry','lkPassword','lkCompress','lkInbox','lkState']){
  assert.match(ui,new RegExp('id="'+id+'"'),id+' no está declarado');
 }
});
test('todos los módulos del enlace se cargan en el orden necesario',()=>{
 const modules=['core.js','receiver.js','app.js','digital.js','link.js','secure.js','link-ui.js'];
 let pos=-1;
 for(const module of modules){const next=html.indexOf('src="'+module+'"');assert.ok(next>pos,module+' sin cargar o fuera de orden');pos=next;}
});
test('el ACK empieza a contar al terminar la emisión',()=>{
 assert.match(ui,/S\.started=Date\.now\(\)/);
 assert.match(ui,/if\(!delivered\)/);
});
