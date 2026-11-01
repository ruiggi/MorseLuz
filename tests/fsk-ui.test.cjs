const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../app/src/main/assets');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code=fs.readFileSync(path.join(root,'fsk-ui.js'),'utf8');
test('módulos FSK cargados en orden',()=>{assert.ok(html.indexOf('src="fsk.js"')>0);assert.ok(html.indexOf('src="fsk-ui.js"')>html.indexOf('src="fsk.js"'));});
test('interfaz FSK permite recepción, transmisión y cierre',()=>{for(const id of ['fskMessage','fskListen','fskStop','fskSend','fskInbox','fskState'])assert.ok(code.includes('id="'+id+'"'),id);});
test('FSK requiere confirmación de CRC antes de mostrar mensaje',()=>{assert.match(fs.readFileSync(path.join(root,'fsk.js'),'utf8'),/CRC incorrecto/);});
