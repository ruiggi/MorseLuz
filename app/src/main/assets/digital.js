/* Morse Luz 2.5: ML2 con Hamming SECDED (8,4) y CRC16 por bloque.
 * Corrige 1 bit en cada octeto codificado; detecta 2 errores en el octeto. */
(function(root,factory){const api=factory(root.MorseCore);if(typeof module==='object'&&module.exports)module.exports=api;root.MorseDigital=api;})(typeof globalThis!=='undefined'?globalThis:this,function(M){
'use strict';
function codeNibble(n){
 const b=new Array(9).fill(0);
 b[3]=(n>>3)&1;b[5]=(n>>2)&1;b[6]=(n>>1)&1;b[7]=n&1;
 b[1]=b[3]^b[5]^b[7];b[2]=b[3]^b[6]^b[7];b[4]=b[5]^b[6]^b[7];
 for(let i=1;i<=7;i++)b[8]^=b[i];
 let output=0;for(let i=1;i<=8;i++)output=(output<<1)|b[i];
 return output;
}
function decodeNibble(code){
 const b=new Array(9).fill(0);
 for(let i=1;i<=8;i++)b[i]=(code>>(8-i))&1;
 const syndrome=(b[1]^b[3]^b[5]^b[7])|((b[2]^b[3]^b[6]^b[7])<<1)|((b[4]^b[5]^b[6]^b[7])<<2);
 let overall=0;for(let i=1;i<=8;i++)overall^=b[i];
 let corrected=0;
 if(syndrome&&overall){b[syndrome]^=1;corrected=1;}
 else if(syndrome&&!overall)throw new Error('FEC: dos errores detectados');
 else if(!syndrome&&overall){b[8]^=1;corrected=1;}
 return {value:(b[3]<<3)|(b[5]<<2)|(b[6]<<1)|b[7],corrected};
}
function encode(bytes){const output=new Uint8Array(bytes.length*2);for(let i=0;i<bytes.length;i++){output[i*2]=codeNibble(bytes[i]>>4);output[i*2+1]=codeNibble(bytes[i]&15);}return output;}
function decode(bytes){if(bytes.length%2)throw new Error('FEC: tamaño de trama inválido');let corrected=0;const out=new Uint8Array(bytes.length/2);for(let i=0;i<out.length;i++){const a=decodeNibble(bytes[i*2]),b=decodeNibble(bytes[i*2+1]);out[i]=(a.value<<4)|b.value;corrected+=a.corrected+b.corrected;}return {bytes:out,corrected};}
function createFrames(text,id='A1B2',chunkBytes=8){const raw=new TextEncoder().encode(String(text));const chunks=[];for(let i=0;i<raw.length;i+=chunkBytes)chunks.push(raw.slice(i,i+chunkBytes));if(!chunks.length)chunks.push(new Uint8Array());if(chunks.length>99)throw new Error('Máximo 99 bloques por mensaje');const code=String(id).replace(/[^A-Z0-9]/gi,'').toUpperCase().slice(0,6)||'A1B2';return chunks.map((bytes,i)=>'ML2 '+code+' '+String(i+1).padStart(2,'0')+' '+String(chunks.length).padStart(2,'0')+' '+M.crc16(bytes)+' '+(bytes.length?M.base32Encode(encode(bytes)):'ZERO'));}
function parseFrame(text){
 const m=String(text).trim().toUpperCase().match(/^ML2\s+([A-Z0-9]{1,6})\s+(\d{2})\s+(\d{2})\s+([0-9A-F]{4})\s+([A-Z2-7]+|ZERO)$/);
 if(!m)return null;
 const code=m[5]==='ZERO'?new Uint8Array():M.base32Decode(m[5]);
 let result;try{result=decode(code);}catch(e){return {kind:'DATA',id:m[1],index:+m[2],total:+m[3],valid:false,corrected:0,error:e.message};}
 return {kind:'DATA',id:m[1],index:+m[2],total:+m[3],crc:m[4],valid:+m[2]>0&&+m[2]<=+m[3]&&M.crc16(result.bytes)===m[4],bytes:result.bytes,corrected:result.corrected};
}
return {codeNibble,decodeNibble,encode,decode,createFrames,parseFrame};
});