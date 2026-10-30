const fs=require('node:fs'),{boot}=require('../tests/support/game.cjs');
const sample=boot(),types=['baseline',...Object.keys(sample.A.tree.TYPES)],rows=[];
const seeds=Number(process.argv[3]||20);
for(const type of types){
 let income=0,captures=0,seconds=0,price=0;
 for(let seed=1;seed<=seeds;seed++){
  const {g,f}=boot(seed);f.grains=[];
  if(type!=='baseline'){const n=g.tree.list.find(n=>n.type===type);if(!n)continue;price+=g.nodeCost(n);g.state.nodes[n.id]=1;g.applyStats();g.syncDrones();}
  g.state.energy=g.energyMax;g.startHarvest();let frames=0;
  while(g.session.harvesting&&frames<120*120){
   const t=frames/120;Object.assign(g.pointer,{active:true,x:182+145*Math.sin(t*1.3),y:173.5+138*Math.sin(t*.71)});
   g.update(1000/120);frames++;
  }
  income+=g.state.lumens;captures+=g.state.collected;seconds+=frames/120;
 }
 rows.push({type,income:income/seeds,captures:captures/seeds,seconds:seconds/seeds,price:price/seeds});
}
const base=rows[0];for(const r of rows){r.incomeRatio=r.income/base.income;r.rateRatio=(r.income/r.seconds)/(base.income/base.seconds);}
fs.writeFileSync(process.argv[2]||'simulations/progression-results.json',JSON.stringify({seeds,policy:'sweep; no poles or Surge; full battery; one isolated perk; baseline biome; no achievements; rendering disabled',rows},null,2)+'\n');
console.log(rows.map(r=>`${r.type}: income x${r.incomeRatio.toFixed(2)}, rate x${r.rateRatio.toFixed(2)}`).join('\n'));
