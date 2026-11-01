/* Acoustic FSK quick messaging — independent experimental transport. */
(function(){
'use strict';
if(!window.MorseFSK)return;
const root=document.getElementById('page-chat');if(!root)return;
const pane=document.createElement('details');pane.className='card';pane.id='fskPanel';
pane.innerHTML='<summary>Canal digital acústico FSK (experimental)</summary><div class="help">Tonos binarios 750/1250 Hz, 8 bits/s, sincronización y CRC. No utiliza el protocolo Morse convencional. Requiere que ambos móviles activen este receptor; la compatibilidad real depende del micrófono y del altavoz.</div><label for="fskMessage">Mensaje rápido (máximo 1024 bytes)</label><textarea id="fskMessage" rows="2" placeholder="Mensaje binario"></textarea><div class="buttons"><button id="fskListen" class="secondary">Activar receptor FSK</button><button id="fskStop" class="secondary">Detener</button><button id="fskSend" class="primary">Enviar FSK</button></div><label for="fskInbox">Mensajes recibidos</label><textarea id="fskInbox" rows="3" readonly></textarea><div id="fskState" class="notice">Receptor inactivo. Sin confirmaciones automáticas en este modo experimental.</div>';
const ref=document.getElementById('linkPanel');ref?ref.after(pane):root.prepend(pane);
const $=id=>document.getElementById(id);
const status=t=>{$('fskState').textContent=t;};
const modem=new MorseFSK.AudioChannel({baudMs:125,onReceive:message=>{const el=$('fskInbox');el.value+=(el.value?'\n':'')+message;status('Mensaje recibido. CRC validado.');},onStatus:status});
$('fskListen').onclick=async()=>{
 try{if(typeof stopRx==='function'&&app.rxActive)await stopRx();await modem.start();status('Escuchando audio digital 750/1250 Hz.');}catch(e){status('Error de recepción FSK: '+e.message);}
};
$('fskStop').onclick=async()=>{await modem.stop();status('Receptor FSK detenido.');};
$('fskSend').onclick=async()=>{
 if(modem.sending)return;
 try{$('fskSend').disabled=true;status('Transmitiendo bits FSK; no cierres la aplicación.');await modem.send($('fskMessage').value);status('Transmisión terminada. Comprueba en el otro móvil la recepción.');}
 catch(e){status('Error de envío: '+e.message);}
 finally{$('fskSend').disabled=false;}
};
window.addEventListener('pagehide',()=>modem.stop());
})();