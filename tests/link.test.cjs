const test=require('node:test');
const assert=require('node:assert/strict');
global.MorseCore=require('../app/src/main/assets/core.js');
const {Session,assess}=require('../app/src/main/assets/link.js');
test('roundtrip ASCII y UTF-8 con fragmentación y ACK',()=>{
 const a=new Session({chunkBytes:8,timeoutMs:100,maxRetries:2});
 const b=new Session();
 const message='HOLA SEÑAL € café';
 assert.ok(a.prepare(message,'AB12')>1);
 let received=null,clock=1000;
 while(!a.completed){
  const outgoing=a.outgoing(clock);
  assert.ok(outgoing);
  const result=b.ingest(outgoing.frame);
  if(result.kind==='complete')received=result.text;
  assert.ok(result.ack);
  assert.equal(a.acceptAck(result.ack),true);
  clock+=1000;
 }
 assert.equal(received,message);
});
test('CRC inválido se rechaza',()=>{
 const a=new Session(); a.prepare('HOLA','A1');
 const frame=a.outgoing(1000).frame;
 const tampered=frame.replace(/ [A-Z2-7]+$/, ' AAAAA');
 const b=new Session();
 assert.equal(b.ingest(tampered).kind,'corrupt');
});
test('sin ACK, reintentos limitados por timeout',()=>{
 const a=new Session({chunkBytes:8,timeoutMs:100,maxRetries:2});
 a.prepare('prueba','XZ');
 assert.equal(a.outgoing(1000).attempt,1);
 assert.equal(a.outgoing(1050),null);
 assert.equal(a.outgoing(1100).attempt,2);
 assert.equal(a.outgoing(1200).attempt,3);
 assert.equal(a.outgoing(1300),null);
 assert.match(a.error,/reintentos/);
});
test('ACK duplicado o ajeno no altera la sesión',()=>{
 const a=new Session();a.prepare('hola','A1');
 a.outgoing(1000);
 assert.equal(a.acceptAck('ACK B2 01'),false);
 assert.equal(a.acceptAck('ACK A1 02'),false);
 assert.equal(a.acceptAck('ACK A1 01'),true);
 assert.equal(a.completed,true);
 assert.equal(a.acceptAck('ACK A1 01'),false);
});
test('paquetes duplicados idempotentes',()=>{
 const a=new Session(),b=new Session();
 a.prepare('dato','A1');const p=a.outgoing(1000).frame;
 assert.equal(b.ingest(p).kind,'complete');
 assert.equal(b.ingest(p).kind,'complete');
});
test('diagnóstico de calidad',()=>{
 assert.ok(assess({pulses:1}).issues.length>0);
 assert.equal(assess({pulses:8,regularity:95,signal:1,unit:240}).issues.length,0);
});
