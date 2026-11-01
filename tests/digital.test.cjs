const test=require('node:test');
const assert=require('node:assert/strict');
const M=global.MorseCore=require('../app/src/main/assets/core.js');
const D=global.MorseDigital=require('../app/src/main/assets/digital.js');
const {Session}=require('../app/src/main/assets/link.js');
test('FEC ML2 recupera texto UTF-8 fragmentado',()=>{
 const sender=new Session({fec:true,chunkBytes:8});
 const receiver=new Session();
 const message='Óptico y acústico: SEÑAL €';
 sender.prepare(message,'FEC1');
 let reconstructed=null;
 while(!sender.completed){
  const frame=sender.outgoing(1000+sender.position*1000);
  assert.match(frame.frame,/^ML2 /);
  const received=receiver.ingest(frame.frame);
  if(received.kind==='complete')reconstructed=received.text;
  assert.equal(sender.acceptAck(received.ack),true);
 }
 assert.equal(reconstructed,message);
});
test('Hamming SECDED corrige un bit alterado de payload',()=>{
 const frame=D.createFrames('HOLA','ABC1',8)[0];
 const bits=frame.split(' ');
 const coded=M.base32Decode(bits[5]);
 coded[0]^=1;
 bits[5]=M.base32Encode(coded);
 const read=D.parseFrame(bits.join(' '));
 assert.equal(read.valid,true);
 assert.equal(read.corrected,1);
 assert.equal(new TextDecoder().decode(read.bytes),'HOLA');
});
test('Hamming SECDED rechaza dos errores en la misma palabra',()=>{
 const frame=D.createFrames('HOLA','ABC1',8)[0];
 const bits=frame.split(' '),coded=M.base32Decode(bits[5]);
 coded[0]^=3;
 bits[5]=M.base32Encode(coded);
 assert.equal(D.parseFrame(bits.join(' ')).valid,false);
});
