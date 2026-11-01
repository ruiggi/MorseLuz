/* Morse Luz 2.4 — encapsulado opcional, compresión y cifrado autenticado AES-GCM.
 * Los mensajes viajan como texto ASCII MX1, compatible con el transporte Morse ML1. */
(function(root,factory){const api=factory(root.MorseCore);if(typeof module==='object'&&module.exports)module.exports=api;root.MorseSecure=api;})(typeof globalThis!=='undefined'?globalThis:this,function(M){
'use strict';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',te=new TextEncoder(),td=new TextDecoder('utf-8',{fatal:true});
function b32(bytes){return M.base32Encode(bytes);}
function un32(s){return M.base32Decode(s);}
function merge(...parts){const size=parts.reduce((n,b)=>n+b.length,0),out=new Uint8Array(size);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;}
function context(){const c=globalThis.crypto;if(!c||!c.subtle||!c.getRandomValues)throw new Error('Cifrado no disponible en este dispositivo');return c;}
async function compress(bytes){if(typeof CompressionStream==='undefined')return null;try{const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer());}catch{return null;}}
async function decompress(bytes){if(typeof DecompressionStream==='undefined')throw new Error('Este dispositivo no admite descompresión gzip');const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));const arr=await new Response(stream).arrayBuffer();if(arr.byteLength>300000)throw new Error('Mensaje descomprimido demasiado grande');return new Uint8Array(arr);}
async function derive(password,salt){const c=context();const base=await c.subtle.importKey('raw',te.encode(password),'PBKDF2',false,['deriveKey']);return c.subtle.deriveKey({name:'PBKDF2',salt,iterations:160000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function pack(text,{password='',compressText=false}={}){
 let data=te.encode(String(text));
 if(data.length>50000)throw new Error('Máximo 50 KB de mensaje original');
 let flag=0;
 if(compressText){const z=await compress(data);if(z&&z.length+8<data.length){data=z;flag|=1;}}
 let payload;
 if(password){
  if(password.length<8)throw new Error('La contraseña debe tener 8 caracteres como mínimo');
  const c=context(),salt=c.getRandomValues(new Uint8Array(16)),iv=c.getRandomValues(new Uint8Array(12)),key=await derive(password,salt);
  const cipher=new Uint8Array(await c.subtle.encrypt({name:'AES-GCM',iv,additionalData:te.encode('MORSE-LUZ-MX1'),tagLength:128},key,data));
  flag|=2;payload=merge(Uint8Array.of(flag),salt,iv,cipher);
 }else payload=merge(Uint8Array.of(flag),data);
 return 'MX1 '+b32(payload);
}
async function unpack(src,{password=''}={}){
 const match=String(src).trim().match(/^MX1\s+([A-Z2-7]+)$/i);
 if(!match)throw new Error('No es un paquete MX1 válido');
 const bytes=un32(match[1].toUpperCase());
 if(bytes.length<1)throw new Error('Trama vacía');
 const flag=bytes[0];if(flag&~3)throw new Error('Formato de trama no admitido');
 let data;
 if(flag&2){if(!password)throw new Error('Introduce la contraseña compartida para descifrar');if(bytes.length<1+16+12+16)throw new Error('Trama cifrada incompleta');const salt=bytes.slice(1,17),iv=bytes.slice(17,29),key=await derive(password,salt);try{const clear=await context().subtle.decrypt({name:'AES-GCM',iv,additionalData:te.encode('MORSE-LUZ-MX1'),tagLength:128},key,bytes.slice(29));data=new Uint8Array(clear);}catch{throw new Error('Contraseña incorrecta o mensaje alterado');}}
 else data=bytes.slice(1);
 if(flag&1)data=await decompress(data);
 return td.decode(data);
}
return {pack,unpack};
});