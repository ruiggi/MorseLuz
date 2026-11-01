/* Morse Luz 2.3 — enlace asistido: diagnóstico, chat, ARQ y autoconfiguración.
 * La capa física sigue siendo Morse; no se afirma un módem binario FEC verificado. */
(function(root,factory){
 const api=factory(root.MorseCore,root.MorseDigital);
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.MorseLink=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(M,D){
 'use strict';
 const defaultOptions={timeoutMs:12000,maxRetries:3,chunkBytes:8};
 const cleanId=s=>String(s).replace(/[^A-Z0-9]/gi,'').toUpperCase().slice(0,6)||'A1B2';
 class Session{
  constructor(options={}){this.options={...defaultOptions,...options};this.reset();}
  reset(){this.id='';this.frames=[];this.position=0;this.attempts=0;this.waiting=false;this.started=0;this.completed=false;this.error='';this.inbox=new Map();this.received=new Set();this.lastAck='';}
  prepare(text,id='A1B2'){if(this.waiting)throw Error('Transmisión pendiente. Detenla antes.');this.frames=this.options.fec&&D?D.createFrames(text,cleanId(id),this.options.chunkBytes):M.createFrames(text,cleanId(id),this.options.chunkBytes);this.id=cleanId(id);this.position=0;this.attempts=0;this.completed=false;this.error='';return this.frames.length;}
  outgoing(now=Date.now()){if(this.completed||!this.frames.length)return null;if(this.waiting&&now-this.started<this.options.timeoutMs)return null;if(this.waiting&&this.attempts>=this.options.maxRetries+1){this.waiting=false;this.error='Se superó el número de reintentos';return null;}this.waiting=true;this.attempts++;this.started=now;return {frame:this.frames[this.position],number:this.position+1,total:this.frames.length,attempt:this.attempts};}
  acceptAck(raw){const ack=M.parseAck(String(raw).trim());if(!ack||ack.id!==this.id||!this.waiting||ack.index!==this.position+1)return false;this.position++;this.waiting=false;this.attempts=0;this.error='';if(this.position>=this.frames.length)this.completed=true;return true;}
  ingest(raw){const p=M.parseFrame(raw)||(D&&D.parseFrame(raw));if(!p)return {kind:'unknown'};if(!p.valid)return {kind:'corrupt',id:p.id,index:p.index};const key=p.id+'/'+p.index;const duplicate=this.received.has(key);if(duplicate){const ack='ACK '+p.id+' '+String(p.index).padStart(2,'0');this.lastAck=ack;return {kind:'duplicate',ack,index:p.index,total:p.total,id:p.id};}this.received.add(key);if(this.received.size>500)this.received.clear();let entry=this.inbox.get(p.id);if(!entry||entry.total!==p.total){entry={parts:{},total:p.total};this.inbox.set(p.id,entry);}entry.parts[p.index]=p;const ack='ACK '+p.id+' '+String(p.index).padStart(2,'0');this.lastAck=ack;let text=null;try{text=M.reconstructFrames(entry.parts,entry.total);}catch(e){return {kind:'invalid-utf8',ack,message:String(e)};}if(text!==null){this.inbox.delete(p.id);return {kind:'complete',text,ack,duplicate,id:p.id};}return {kind:duplicate?'duplicate':'part',ack,index:p.index,total:p.total,id:p.id};}
  status(){return {position:this.position,total:this.frames.length,attempts:this.attempts,waiting:this.waiting,completed:this.completed,error:this.error};}
 }
 function assess({pulses=0,regularity=0,signal=0,unit=0}={}){
  const issues=[];
  if(pulses<3)issues.push('Esperando al menos tres pulsos');
  if(pulses>=3&&regularity<55)issues.push('Ritmo irregular: revisar sensibilidad o ruido');
  if(signal<0.12)issues.push('Señal débil: acercar o orientar emisor');
  if(unit>0&&unit<90)issues.push('Ritmo rápido para una cámara convencional');
  return {label:issues.length?'Revisar enlace':'Señal estable',issues};
 }
 return {Session,assess};
});
