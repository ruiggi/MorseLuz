const test=require('node:test'),assert=require('node:assert/strict');
global.MorseCore=require('../app/src/main/assets/core.js');
const F=require('../app/src/main/assets/fsk.js');
test('FSK binario lleva UTF-8 y protege integridad CRC',()=>{
 const text='Hola, señal acústica Ñ €';
 const bits=F.pack(text);
 assert.ok(bits.startsWith(F.PREAMBLE+F.SYNC));
 assert.equal(F.decodeBits(bits),text);
 const altered=bits.slice(0,-8)+(bits.at(-8)==='1'?'0':'1')+bits.slice(-7);
 assert.throws(()=>F.decodeBits(altered),/CRC/);
});
test('FSK recupera bits muestreados con jitter y ruido aislado',()=>{
 const text='PRUEBA RAPIDA 123',bits=F.pack(text),baud=125;
 const samples=[];
 for(let i=0;i<bits.length;i++)for(let n=0;n<5;n++){
   const t=(i+(n+.3)/5)*baud+(n%2?2:-2);
   const bit=+(bits[i]);
   samples.push({t,bit:n===2&&i%23===0?1-bit:bit});
 }
 const result=F.decodeSamples(samples,baud);
 assert.equal(result?.text,text,JSON.stringify(result));
});
test('la trama incompleta no se acepta',()=>{
 const packet=F.pack('HOLA');
 assert.equal(F.decodeBits(packet.slice(0,-12)),null);
});
