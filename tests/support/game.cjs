const vm=require('node:vm'),fs=require('node:fs');
function boot(seed=42,saved=null){
 let state=seed;const math=Object.create(Math);math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const context={window:{},Math:math,Date:class extends Date{static now(){return 100000;}},localStorage:{getItem(){return saved?JSON.stringify(saved):null;},setItem(){},removeItem(){}}};
 vm.createContext(context);
 for(const path of ['lab/engine.js','lab/grid.js','js/config.js','js/state.js','js/skilltree.js','js/game.js','js/field.js','js/arena.js'])vm.runInContext(fs.readFileSync(path,'utf8'),context,{filename:path});
 const A=context.window.AFK,g=new A.Game(),f=new A.GrainField();g.field=f;g.resize(364,347);g.seedGrid();
 return {g,f,A,arena:context.HarvestArena};
}

module.exports={boot};
