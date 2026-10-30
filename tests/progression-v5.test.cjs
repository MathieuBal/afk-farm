const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {boot}=require('./support/game.cjs');
test('immersive arena fills available space with uniform scale and constant logical area',()=>{
 const {arena}=boot();for(const [w,h]of [[390,844],[844,390],[1440,900]]){const r=arena.fit(w,8,h-100,true);assert.ok(Math.abs(r.width*r.height-364*347)<1e-6);assert.ok(Math.abs(r.width*r.scale-(w-16))<1e-6);assert.ok(Math.abs(r.height*r.scale-(h-108))<1e-6);const p=arena.point(r,r.x+80*r.scale,r.y+90*r.scale);assert.ok(Math.abs(p.x-80)<1e-9&&Math.abs(p.y-90)<1e-9);}
});
test('all seven branches are linked and cross-branch buying remains possible',()=>{
 const {g}=boot();for(let a=0;a<7;a++)assert.ok(g.tree.byId.get('a'+a+'_4').links.includes('a'+((a+1)%7)+'_4'));
});
test('costs grow by depth without the old exponential global penalty',()=>{
 const {g}=boot(),n=g.tree.byId.get('a0_0'),price=g.nodeCost(n);for(const x of g.tree.list.slice(1,101))g.state.nodes[x.id]=1;
 assert.ok(g.nodeCost(n)<price*3);const deep={...n,ring:30};assert.ok(g.nodeCost(deep)>g.nodeCost(n));
});
test('keystone global bonuses are additive and repop stays bounded',()=>{
 const {g,A}=boot();for(const n of g.tree.list)if(n.keystone||n.type==='repopfast')g.state.nodes[n.id]=1;
 const stats=A.tree.aggregate(g.tree,g.state.nodes);const count=g.tree.list.filter(n=>n.keystone).length;
 assert.ok(Math.abs(stats.keyMult-(1+count*.08))<1e-8);g.applyStats();assert.ok(g.repopDelay>=600);
});
test('completed ship parts grant benefits once, including old saves',()=>{
 const {g}=boot(),p=g.currentProject(),ps=g.projectState(p),capacity=g.storageMax;ps.building=true;
 g.completePart(p,ps,p.parts[0]);assert.equal(g.storageMax,capacity+10);g.applyStats();assert.equal(g.storageMax,capacity+10);
 const reloaded=boot(1,g.state).g;assert.equal(reloaded.storageMax,g.storageMax);
});
test('investing cores no longer removes the passive income bonus',()=>{
 const {g}=boot();g.state.cores=20;g.applyStats();const before=g.incomeMult;assert.ok(g.buyPerk('memory'));assert.ok(g.incomeMult>before);
});
test('pinch pans around midpoint, lifting one finger does not jump or select',()=>{
 const {g,A}=boot(),listeners={};
 const element=()=>({style:{},classList:{add(){},remove(){}},append(){},addEventListener(){},querySelector(){return element();}});
 const canvas={...element(),getContext:()=>({setTransform(){}}),setPointerCapture(){},addEventListener:(n,f)=>listeners[n]=f};
 const elements=new Map([['tree-canvas',canvas]]);const document={createElement:element,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
 vm.runInNewContext(fs.readFileSync('js/tree-ui.js','utf8'),{window:{AFK:A,innerWidth:390,innerHeight:844},document,navigator:{}});
 const ui=new A.TreeUI(g);ui.W=390;ui.H=844;ui.cam={x:0,y:0,zoom:1};let taps=0;ui.tap=()=>taps++;
 const ev=(id,x,y)=>({pointerId:id,clientX:x,clientY:y});
 listeners.pointerdown(ev(1,100,200));listeners.pointerdown(ev(2,200,200));listeners.pointermove(ev(2,220,200));
 assert.ok(ui.cam.zoom>1);listeners.pointerup(ev(2,220,200));const x=ui.cam.x;
 listeners.pointermove(ev(1,110,200));assert.ok(Math.abs(ui.cam.x-x+10/ui.cam.zoom)<1e-9);
 listeners.pointerup(ev(1,110,200));assert.equal(taps,0);
 listeners.pointerdown(ev(3,100,100));listeners.pointercancel(ev(3,100,100));assert.equal(ui.pointers.size,0);assert.equal(taps,0);
});
