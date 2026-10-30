const fs=require('node:fs'),{boot}=require('../tests/support/game.cjs'),rows=[];
for(const [width,height]of [[390,844],[844,390],[768,1024],[1440,900]])for(const support of [false,true]){
 let sum=0,min=Infinity,max=0;
 for(let seed=1;seed<=20;seed++){
  const {g,f,arena}=boot(seed),r=arena.fit(width,8,height-110,true);
  f.resize(r.width,r.height);g.resize(r.width,r.height);f.grains=[];g.state.energy=140;g.startHarvest();
  for(let i=0;i<1801&&g.session.harvesting;i++){
   const t=i/120;Object.assign(g.pointer,{active:true,x:g.w/2+g.w*.4*Math.sin(t*1.3),y:g.h/2+g.h*.4*Math.sin(t*.71)});
   if(support){if(i===0||i===1441)g.triggerSurge();if(i%240===0&&i<=1200)g.addPole(g.pointer.x,g.pointer.y);}
   g.update(1000/120);
  }
  sum+=g.state.collected;min=Math.min(min,g.state.collected);max=Math.max(max,g.state.collected);
 }
 rows.push({width,height,support,seeds:20,mean:sum/20,min,max});
}
fs.writeFileSync('simulations/immersive-results.json',JSON.stringify({note:'Synthetic sinusoidal gesture, scaled to arena extents, equal logical area; not a human fairness proof.',rows},null,2)+'\n');console.log(rows);
