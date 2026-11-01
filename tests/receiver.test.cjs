const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../app/src/main/assets/core.js');
global.MorseCore=M;
const {Gate}=require('../app/src/main/assets/receiver.js');
for(const rate of [120,240,400]){
 test('decodificación de señales limpias a '+rate+' ms',()=>{
  const text='HOLA MUNDO 123';
  const source=M.pulsesForMorse(M.encodeText(text).morse,rate);
  const result=M.renderPulses(source.pulses,source.duration+rate*25);
  assert.equal(result.text,text);
  assert.equal(result.unit,rate);
  assert.ok(result.confidence>=85);
 });
}
test('filtro temporal bloquea impulsos espurios',()=>{
 const seen=[],g=new Gate((on,time)=>seen.push({on,time}),24);
 g.update(true,0);g.update(false,10);g.update(false,20);assert.equal(seen.length,0);
 g.update(true,30);g.update(true,60);g.update(false,80);g.update(false,110);
 assert.deepEqual(seen.map(s=>s.on),[true,false]);
});
