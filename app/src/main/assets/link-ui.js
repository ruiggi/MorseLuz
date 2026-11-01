/* Morse Luz 2.3 — interfaz de sesión con CRC y ACK, canal Morse existente. */
(function(){
'use strict';
if(!window.MorseLink||!window.MorseCore)return;
const S=new MorseLink.Session({chunkBytes:8,maxRetries:3,timeoutMs:15000});
const $=id=>document.getElementById(id);
const root=$('page-chat');if(!root)return;
const pane=document.createElement('div');pane.className='card';pane.id='linkPanel';
pane.innerHTML='<h3>Comunicación asistida</h3><p class="help">Intercambio semidúplex mediante Morse, con CRC-16, confirmaciones ACK y reintentos. Configura ambos móviles con el mismo canal y velocidad.</p><div class="two"><div><label>Canal</label><select id="lkChannel"><option value="sound">Audio</option><option value="torch">Linterna</option><option value="screen">Pantalla</option></select></div><div><label>Punto Morse</label><select id="lkUnit"><option value="240">240 ms</option><option value="400">400 ms</option><option value="120">120 ms</option></select></div></div><label>Mensaje a enviar</label><textarea id="lkInput" rows="2"></textarea><div class="buttons"><button id="lkPrepare" class="secondary">Preparar</button><button id="lkSend" class="primary">Enviar bloque</button><button id="lkRetry" class="secondary">Cancelar</button></div><div class="notice" id="lkState">Sin sesión.</div><details><summary>Ajustes de enlace</summary><div class="two"><div><label>Bytes por bloque</label><select id="lkChunk"><option>8</option><option>16</option><option>24</option></select></div><div><label>Reintentos máximos</label><select id="lkRetries"><option>2</option><option selected>3</option><option>5</option></select></div></div><label><input type="checkbox" id="lkAutoAck"> ACK automático (experimental)</label></details><label>Mensaje recibido y verificado</label><textarea id="lkInbox" rows="3" readonly></textarea><div class="buttons"><button id="lkListen" class="secondary">Activar escucha</button><button id="lkAck" class="secondary">Transmitir ACK</button></div>';
root.insertBefore(pane,root.querySelector('.card'));
const legacyCard=Array.from(root.children).find(el=>el.classList&&el.classList.contains('card')&&el!==pane);
if(legacyCard){const details=document.createElement('details');details.className='card';const summary=document.createElement('summary');summary.textContent='Herramientas avanzadas: paquetes, ACK y diagnóstico manual';details.append(summary);legacyCard.replaceWith(details);details.append(legacyCard);}
const options=document.createElement('div');
options.innerHTML='<details><summary>Seguridad y eficiencia del mensaje</summary><label><input id="lkCompress" type="checkbox" checked> Comprimir texto cuando reduzca el tamaño</label><label for="lkPassword">Contraseña compartida (opcional, mínimo 8 caracteres)</label><input id="lkPassword" type="password" autocomplete="off" placeholder="Vacío: mensaje sin cifrar"><label><input id="lkAutoRetry" type="checkbox"> Reintentos automáticos al vencer el plazo</label><p class="help">AES-256-GCM con PBKDF2. Los dos teléfonos deben usar exactamente la misma contraseña. El cifrado no protege el patrón temporal, el tamaño ni la identidad del enlace.</p></details>';
pane.insertBefore(options,$('lkInput'));
function state(s){$('lkState').textContent=s;}
function txSettings(){$('txMode').value=$('lkChannel').value;$('txUnit').value=$('lkUnit').value;$('txUnit').dispatchEvent(new Event('input'));}
$('lkPrepare').onclick=async()=>{try{S.options.chunkBytes=+$('lkChunk').value;S.options.maxRetries=+$('lkRetries').value;const id=(Date.now()%1679616).toString(36).toUpperCase().padStart(4,'0');const password=$('lkPassword').value;const msg=(password||$('lkCompress').checked)?await MorseSecure.pack($('lkInput').value,{password,compressText:$('lkCompress').checked}):$('lkInput').value;const n=S.prepare(msg,id);state(n+' bloques preparados.'+(password?' Cifrado activado.':''));}catch(e){state(e.message);}};
$('lkSend').onclick=async()=>{if(app.txBusy)return;const f=S.outgoing();if(!f){state(S.error||'Esperando ACK o sesión terminada');return;}txSettings();state('Transmitiendo bloque '+f.number+'/'+f.total+', intento '+f.attempt);await sendText(f.frame,false);state('Esperando confirmación ACK del bloque '+f.number+'.');};
$('lkRetry').onclick=()=>{if(app.txBusy)cancelTx();S.reset();state('Sesión cancelada.');};
$('lkListen').onclick=async()=>{try{const mode=$('lkChannel').value==='sound'?'audio':'camera';await switchRx(mode);$('rxAutoSpeed').checked=false;$('rxAutoSpeed').dispatchEvent(new Event('change'));$('rxFixedSpeed').value=$('lkUnit').value;$('rxGaps').value='3,7';await startRx();state(app.rxActive?'Escucha '+(mode==='audio'?'acústica':'óptica')+' activa; velocidad '+$('lkUnit').value+' ms.':'La escucha no pudo iniciarse. Revisa permisos.');}catch(e){state('No se pudo iniciar recepción: '+e.message);}};
$('lkAck').onclick=async()=>{if(!S.lastAck)return state('No hay paquete recibido.');txSettings();await sendText(S.lastAck,false);state('ACK enviado.');};
const old=onReceiveMessage;
onReceiveMessage=function(message){
 old(message);
 if(S.acceptAck(message)){state(S.completed?'Mensaje entregado y confirmado.':'ACK correcto: listo para el siguiente bloque.');if(!S.completed&&$('lkAutoNext').checked)setTimeout(()=>{if(!app.txBusy&&S.status().total)$('lkSend').click();},1200);return;}
 let result;
 try{result=S.ingest(message);}catch(e){state('Error de lectura: '+e.message);return;}
 if(result.kind==='complete'){(async()=>{try{const clear=result.text.startsWith('MX1 ')?await MorseSecure.unpack(result.text,{password:$('lkPassword').value}):result.text;$('lkInbox').value+=($('lkInbox').value?'\n\n':'')+clear;state('Mensaje completo, CRC verificado.'+(result.text.startsWith('MX1 ')?' Decodificado.':''));}catch(e){state('Mensaje recibido, pero no se puede descifrar: '+e.message);}})();}
 else if(result.kind==='part'||result.kind==='duplicate')state('Recibido bloque '+result.index+'/'+result.total);
 else if(result.kind==='corrupt')state('CRC incorrecto: bloque rechazado.');
 if(result.ack&&$('lkAutoAck').checked&&app.rxActive&&!app.txBusy){
   setTimeout(()=>{if(!app.txBusy){txSettings();sendText(result.ack,false);}},1600);
 }
};
setInterval(()=>{if(!$('lkAutoRetry').checked||app.txBusy||!S.waiting||S.completed)return;if(Date.now()-S.started>=S.options.timeoutMs)$('lkSend').click();},1000);
})();