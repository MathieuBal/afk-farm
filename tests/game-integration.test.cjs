const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function boot(seed=42,saved=null){
 let state=seed;const math=Object.create(Math);math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const context={window:{},Math:math,Date:class extends Date{static now(){return 100000;}},localStorage:{getItem(){return saved?JSON.stringify(saved):null;},setItem(){},removeItem(){}}};
 vm.createContext(context);
 for(const path of ['lab/engine.js','lab/grid.js','js/config.js','js/state.js','js/skilltree.js','js/game.js','js/field.js','js/arena.js'])vm.runInContext(fs.readFileSync(path,'utf8'),context,{filename:path});
 const A=context.window.AFK,g=new A.Game(),f=new A.GrainField();g.field=f;g.resize(364,347);g.seedGrid();
 return {g,f,A,arena:context.HarvestArena};
}
function play(env,width=390,height=844){
 const {g,arena}=env,r=arena.fit(width,100,height-280);g.state.energy=140;g.startHarvest();
 for(let i=0;i<1800;i++){
  const t=i/120,lx=182+145*Math.sin(t*1.3),ly=173.5+138*Math.sin(t*.71),p=arena.point(r,r.x+lx*r.scale,r.y+ly*r.scale);
  Object.assign(g.pointer,p,{active:true});if(i===0||i===1441)g.triggerSurge();
  if(i%240===0&&i<=1200)g.addPole(p.x,p.y);
  g.update(1000/120);
 }
 // Handle timer floating-point boundary exactly as the next rendered frame would.
 if(g.session.harvesting)g.update(1000/120);
 return {collected:g.state.collected,bank:g.state.lumens,energy:g.state.energy};
}
test('production arena yields the same harvest across screen formats',()=>{
 for(let seed=1;seed<=20;seed++){
  const mobile=play(boot(seed),390,844),desktop=play(boot(seed),1440,1000);
  assert.equal(desktop.collected,mobile.collected);assert.equal(desktop.bank,mobile.bank);assert.ok(Math.abs(desktop.energy-mobile.energy)<1e-8);
 }
});
test('new physics captures, banks, charges Surge and does not change save schema',()=>{
 const env=boot(),out=play(env);assert.ok(out.collected>0);assert.ok(out.bank>0);assert.ok(out.energy>=14.9&&out.energy<=15.1);
 assert.equal(env.g.state.stats.sessions,1);assert.equal(env.g.session.storage,0);assert.equal(env.g.state.v,3);
 assert.equal(env.g.repopDelay,2400);assert.equal(env.f.lumens.length,13);
});
test('resize preserves lumens, rarity, anchor and respawn cooldown',()=>{
 const {f}=boot();f.harvest(0,2400);const before=JSON.stringify(f.model.nodes),rar=f.lumens[0].rar;
 f.resize(1440,900);assert.equal(JSON.stringify(f.model.nodes),before);assert.equal(f.lumens[0].rar,rar);
});
test('density improvements add population; respawn has a visible grace period',()=>{
 const {f,g}=boot();f.ensureLumens(60,()=>g.pickRar());assert.equal(f.lumens.length,60);
 f.harvest(0,2400);for(let i=0;i<289;i++){f.tickLumens(1000/120,()=>g.pickRar());f.simulate(1000/120,[]);}
 assert.ok(f.lumens[0].lit);assert.ok(f.lumens[0].age<.3);
});
test('existing progress survives loading',()=>{
 const base=boot().g.state;base.lumens=12345;base.cores=7;base.prestiges=2;base.bestBiome=3;base.treeSpent=100;base.lastSave=100000;
 const {g}=boot(1,base);assert.equal(g.state.lumens,12345);assert.equal(g.state.cores,7);assert.equal(g.state.prestiges,2);assert.equal(g.state.treeSpent,100);
});
module.exports={boot,play};
test('storage ends a session once and banks its contents',()=>{
 const env=boot();env.g.storageMax=3;const out=play(env);assert.equal(out.collected,3);assert.equal(env.g.state.stats.sessions,1);assert.ok(out.bank>0);
});
test('fleet drones still harvest while the player is idle',()=>{
 const saved=boot().g.state;saved.perks={fleet:2};saved.lastSave=100000;
 const {g,f}=boot(4,saved);const initial=g.state.lumens;
 for(let i=0;i<3600;i++)g.update(1000/120);
 assert.ok(g.state.lumens>initial);assert.ok(g.state.collected>0);assert.equal(g.session.harvesting,false);assert.equal(f.lumens.length,19);
});
