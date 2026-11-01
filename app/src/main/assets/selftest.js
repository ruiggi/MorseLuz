/* Autodiagnóstico local: no sustituye una prueba con dos equipos físicos. */
(function(){
'use strict';
const root=document.getElementById('page-settings');if(!root||!window.MorseCore)return;
const card=document.createElement('div');card.className='card';
card.innerHTML='<h3>Autodiagnóstico de comunicación</h3><p class="help">Comprueba el códec Morse, recuperación de mensajes, corrección FEC, cifrado y permisos del dispositivo. Es una prueba local, sin medir la calidad de la señal física.</p><div class="buttons"><button id="selfTestRun" class="primary">Ejecutar pruebas</button></div><div id="selfTestResults" class="notice" role="status" aria-live="polite">Sin ejecutar</div>';
root.append(card);
document.getElementById('selfTestRun').onclick=async()=>{
 const out=[],check=(label,ok)=>out.push((ok?'✓ ':'✗ ')+label);
 try{
  const M=MorseCore,L=MorseLink,D=MorseDigital;
  const source='HOLA 123';
  check('Codificación Morse',M.decodeMorse(M.encodeText(source).morse)===source);
  const pulses=M.pulsesForMorse(M.encodeText(source).morse,240);
  check('Decodificación de pulsos simulados',M.renderPulses(pulses.pulses,pulses.duration+240*25,240).text===source);
  const a=new L.Session({fec:true,chunkBytes:8}),b=new L.Session();
  const message='SEÑAL DE PRUEBA';
  a.prepare(message,'SELF');
  let received=null;
  for(let i=0;i<100&&!a.completed;i++){
   const sent=a.outgoing(1000+i*30000);
   if(!sent)break;
   const res=b.ingest(sent.frame);
   if(res.kind==='complete')received=res.text;
   if(!res.ack||!a.acceptAck(res.ack))break;
  }
  check('Bloques con FEC, CRC y ACK',a.completed&&received===message);
  const sample=D.encode(new Uint8Array([42]));sample[0]^=1;
  check('Corrección FEC de un bit',D.decode(sample).bytes[0]===42);
  if(window.MorseSecure&&window.crypto?.subtle){
   const packed=await MorseSecure.pack('PRUEBA',{password:'clave-prueba-local'});
   check('Cifrado y descifrado AES-GCM',(await MorseSecure.unpack(packed,{password:'clave-prueba-local'}))==='PRUEBA');
  }else out.push('– Cifrado no compatible con este navegador');
  check('Contexto de acceso seguro',window.isSecureContext||!!window.AndroidBridge);
  check('API de captura de audio y vídeo',!!navigator.mediaDevices?.getUserMedia);
 }catch(e){out.push('✗ Error de comprobación: '+e.message);}
 document.getElementById('selfTestResults').textContent=out.join('\n');
 document.getElementById('selfTestResults').style.whiteSpace='pre-line';
};
})();