const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { Experiment } = require('../lab/engine.js');
function boot() {
  const elements = new Map(), listeners = new Map(); let onResize;
  const defaults = {spacing:72,radius:120,speed:210,respawn:2.6,mode:'mixed',physics:'flow'};
  const rect = {left:0,top:0,width:360,height:460};
  const context2d = new Proxy({}, {get:()=>()=>{}});
  function element(id) {
    if (!elements.has(id)) elements.set(id, {value:defaults[id],style:{removeProperty(k){delete this[k];}},checked:false,
      getBoundingClientRect:()=>rect, getContext:()=>context2d,focus(){},scrollIntoView(){},
      addEventListener(name,fn,options){listeners.set(name,{fn,options});}});
    return elements.get(id);
  }
  const window = {addEventListener(){}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../lab/lab.js'),'utf8'), {
    document:{getElementById:element,addEventListener(){}},window,
    HarvestLab:{Experiment},matchMedia:()=>({matches:false}),
    ResizeObserver:class {constructor(fn){onResize=fn;}observe(){}},
    devicePixelRatio:2,requestAnimationFrame(){},performance:{now:()=>1000}
  });
  return {element,listeners,rect,resize:()=>onResize(),lab:window.__harvestLab};
}
test('touch dragging prevents native scrolling; end releases the touch for the next gesture',()=>{
  const app=boot();app.element('start').onclick();
  function fire(name, touches) {
    let prevented=false;
    const {fn,options}=app.listeners.get(name);assert.equal(options.passive,false);
    fn({cancelable:true,preventDefault(){prevented=true;},touches,changedTouches:touches});
    assert.equal(prevented,true);
  }
  fire('touchstart',[{identifier:1,clientX:100,clientY:100}]);
  fire('touchmove',[{identifier:1,clientX:180,clientY:200}]);
  fire('touchend',[{identifier:1,clientX:180,clientY:200}]);
  fire('touchstart',[{identifier:2,clientX:180,clientY:200}]);
  fire('touchcancel',[{identifier:2}]);
});
test('Safari viewport resize preserves the active simulation and elapsed time',()=>{
  const app=boot();app.element('start').onclick();const engine=app.lab.engine;
  engine.step(.1,{active:false});
  app.rect.height=420;app.resize();
  assert.equal(app.lab.engine,engine);assert.ok(engine.time>.09);
  assert.equal(engine.height,460);assert.equal(app.element('arena').style.height,'460px');
});
