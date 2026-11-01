/* Morse Luz 2.7 — Acoustic BFSK modem (experimental).
 * Binary asynchronous framing with sync + length + CRC-16.
 * The pure decoder supports timestamped discriminator decisions for repeatable tests.
 */
(function(root,factory){const api=factory(root.MorseCore);if(typeof module==='object'&&module.exports)module.exports=api;root.MorseFSK=api;})(typeof globalThis!=='undefined'?globalThis:this,function(M){
 'use strict';
 const PREAMBLE='10'.repeat(24),SYNC='1101010010110111';
 const u8bits=v=>v.toString(2).padStart(8,'0');
 const bitsU8=s=>parseInt(s,2);
 function pack(text){
  const bytes=new TextEncoder().encode(String(text));if(bytes.length>1024)throw Error('Modo FSK: máximo 1024 bytes');
  const head=String(bytes.length).padStart(1,'0'); // Length is binary, never a human-readable header.
  const data=Array.from(bytes,u8bits).join('');
  const payload=new Uint8Array(bytes.length+2);payload[0]=bytes.length>>>8;payload[1]=bytes.length&255;payload.set(bytes,2);
  const checksum=M.crc16(payload);
  return PREAMBLE+SYNC+u8bits(payload[0])+u8bits(payload[1])+data+parseInt(checksum,16).toString(2).padStart(16,'0');
 }
 function decodeBits(bits){
  const start=bits.indexOf(SYNC);
  if(start<0)return null;
  const payload=bits.slice(start+SYNC.length);
  if(payload.length<16)return null;
  const length=parseInt(payload.slice(0,16),2);if(length>1024)throw Error('Longitud FSK excesiva');
  const required=16+length*8+16;
  if(payload.length<required)return null;
  const bytes=new Uint8Array(length+2);bytes[0]=length>>>8;bytes[1]=length&255;
  for(let i=0;i<length;i++)bytes[i+2]=bitsU8(payload.slice(16+i*8,24+i*8));
  const crc=parseInt(payload.slice(16+length*8,required),2).toString(16).toUpperCase().padStart(4,'0');
  if(M.crc16(bytes)!==crc)throw Error('FSK: CRC incorrecto');
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes.slice(2));
 }
 function firstAtOrAfter(samples,time){let low=0,high=samples.length;while(low<high){const mid=(low+high)>>>1;if(samples[mid].t<time)low=mid+1;else high=mid;}return low;}
 function decide(samples,t,baudMs){
  const a=t+.23*baudMs,b=t+.77*baudMs;let ones=0,zeros=0;
  for(let i=firstAtOrAfter(samples,a);i<samples.length&&samples[i].t<b;i++){if(samples[i].bit)ones++;else zeros++;}
  return ones+zeros?(ones>=zeros?'1':'0'):null;
 }
 function preambleScore(samples,start,baudMs,n=PREAMBLE.length){
  let good=0,seen=0;
  for(let i=0;i<n;i++){const bit=decide(samples,start+i*baudMs,baudMs);if(bit!==null){seen++;if(bit===PREAMBLE[i])good++;}}
  return {score:seen?good/seen:0,seen};
 }
 function decodeSamples(samples,baudMs=125){
  if(samples.length<20)return null;
  const first=samples[0].t,last=samples[samples.length-1].t;
  const startRange=Math.min(baudMs*3,last-first);
  for(let t=first-baudMs*.6;t<first+startRange;t+=baudMs/12){
   if(last<t+(PREAMBLE.length+SYNC.length+16)*baudMs)continue;
   const score=preambleScore(samples,t,baudMs);
   if(score.seen<PREAMBLE.length*.9||score.score<.91)continue;
   const syncStart=t+PREAMBLE.length*baudMs;
   let sync='',ok=true;
   for(let i=0;i<SYNC.length;i++){const bit=decide(samples,syncStart+i*baudMs,baudMs);if(bit===null){ok=false;break;}sync+=bit;}
   if(!ok||sync!==SYNC)continue;
   let header='';
   const payloadStart=syncStart+SYNC.length*baudMs;
   for(let i=0;i<16;i++){const bit=decide(samples,payloadStart+i*baudMs,baudMs);if(bit===null)return null;header+=bit;}
   const n=parseInt(header,2);if(n>1024)continue;
   const remaining=n*8+16;
   if(last<payloadStart+(16+remaining-.1)*baudMs)return null;
   let stream=SYNC+header;
   for(let i=0;i<remaining;i++){const bit=decide(samples,payloadStart+(16+i)*baudMs,baudMs);if(bit===null)return null;stream+=bit;}
   try{return {text:decodeBits(stream),confidence:score.score,byteLength:n};}catch(e){return {error:e.message,confidence:score.score};}
  }
  return null;
 }
 function tonePower(buffer,frequency,sampleRate){
  const w=2*Math.PI*frequency/sampleRate,coeff=2*Math.cos(w);let a=0,b=0;
  for(let i=0;i<buffer.length;i++){const x=buffer[i]+coeff*a-b;b=a;a=x;}
  return Math.max(0,a*a+b*b-coeff*a*b);
 }
 class AudioChannel{
  constructor({baudMs=125,onReceive=()=>{},onStatus=()=>{}}={}){
   this.baudMs=baudMs;this.onReceive=onReceive;this.onStatus=onStatus;this.decisions=[];this.active=false;this.sending=false;
  }
  async send(text){
   if(this.sending)throw Error('Ya se está transmitiendo');
   const C=window.AudioContext||window.webkitAudioContext;if(!C)throw Error('WebAudio no disponible');
   const bits=pack(text),ctx=new C(),osc=ctx.createOscillator(),gain=ctx.createGain();
   this.sending=true;try{
    await ctx.resume();osc.type='sine';osc.connect(gain);gain.connect(ctx.destination);
    const start=ctx.currentTime+.1,d=this.baudMs/1000;
    gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.setValueAtTime(.22,start);
    bits.split('').forEach((b,i)=>osc.frequency.setValueAtTime(b==='1'?1250:750,start+i*d));
    gain.gain.setValueAtTime(0,start+bits.length*d);
    osc.start(start);osc.stop(start+bits.length*d+.02);
    await new Promise(resolve=>setTimeout(resolve,Math.ceil((bits.length*d+.2)*1000)));
   }finally{try{osc.disconnect();gain.disconnect();await ctx.close();}catch{}this.sending=false;}
  }
  async start(){
   if(this.active)return;
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Permiso de micrófono no disponible');
   const C=window.AudioContext||window.webkitAudioContext;
   this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
   try{
    this.ctx=new C();await this.ctx.resume();
    this.source=this.ctx.createMediaStreamSource(this.stream);
    this.processor=this.ctx.createScriptProcessor(2048,1,1);
    this.sink=this.ctx.createGain();this.sink.gain.value=0;
    this.source.connect(this.processor);this.processor.connect(this.sink);this.sink.connect(this.ctx.destination);
    this.active=true;this.decisions=[];this.firstAt=0;this.lastCheck=0;
    this.processor.onaudioprocess=e=>{
     if(!this.active)return;
     const data=e.inputBuffer.getChannelData(0);
     const low=tonePower(data,750,this.ctx.sampleRate),high=tonePower(data,1250,this.ctx.sampleRate);
     const sum=low+high;
     // Avoid demodulation of silence or unrelated low-energy sounds.
     if(sum<1.5)return;
     const t=performance.now();
     if(!this.firstAt)this.firstAt=t;
     this.decisions.push({t:t-this.firstAt,bit:high>low?1:0});
     if(this.decisions.length>14000)this.decisions.splice(0,this.decisions.length-10000);
     if(t-this.lastCheck<500)return;
     this.lastCheck=t;
     const result=decodeSamples(this.decisions,this.baudMs);
     if(result?.text!==undefined){this.onReceive(result.text);this.decisions=[];this.firstAt=0;}
     else if(result?.error){this.onStatus(result.error);this.decisions=[];this.firstAt=0;}
    };
    this.onStatus('Receptor FSK activo');
   }catch(e){await this.stop();throw e;}
  }
  async stop(){
   this.active=false;
   if(this.processor)this.processor.onaudioprocess=null;
   try{this.source?.disconnect();this.processor?.disconnect();this.sink?.disconnect();}catch{}
   this.stream?.getTracks().forEach(t=>t.stop());
   try{await this.ctx?.close();}catch{}
   this.stream=null;this.ctx=null;this.processor=null;this.source=null;this.sink=null;
  }
 }
 return {PREAMBLE,SYNC,pack,decodeBits,decodeSamples,tonePower,AudioChannel};
});
