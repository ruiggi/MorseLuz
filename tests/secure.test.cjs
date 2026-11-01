const test=require('node:test');
const assert=require('node:assert/strict');
global.MorseCore=require('../app/src/main/assets/core.js');
const cryptoLink=require('../app/src/main/assets/secure.js');
test('transporte MX1 sin cifrar reproduce UTF-8',async()=>{
 const s='Señal Morse: ñ € 🛰️';
 const packet=await cryptoLink.pack(s,{compressText:false});
 assert.ok(packet.startsWith('MX1 '));
 assert.equal(await cryptoLink.unpack(packet),s);
});
test('AES-GCM cifra y autentica los mensajes',async()=>{
 const text='Mensaje reservado entre dos teléfonos';
 const pkt=await cryptoLink.pack(text,{password:'clave compartida 2026'});
 assert.ok(!pkt.includes(text));
 assert.equal(await cryptoLink.unpack(pkt,{password:'clave compartida 2026'}),text);
 await assert.rejects(cryptoLink.unpack(pkt,{password:'otra contraseña'}),/Contraseña incorrecta|alterado/);
});
test('la compresión permite recuperar textos largos',async()=>{
 const original='HOLA MORSE '.repeat(100);
 const packet=await cryptoLink.pack(original,{compressText:true});
 assert.equal(await cryptoLink.unpack(packet),original);
});
test('se rechaza formato inseguro o incompleto',async()=>{
 await assert.rejects(cryptoLink.unpack('MX1 INVALID0'),/Base32|inválid/);
 await assert.rejects(cryptoLink.pack('x',{password:'corta'}),/8 caracteres/);
});
