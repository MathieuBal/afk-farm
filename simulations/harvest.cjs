// Screening of the lab engine; policies are synthetic, not human recordings.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {Experiment,defaults}=require('../lab/engine.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync('js/config.js','utf8'),context);
const session=context.window.AFK.config.CONST.SESSION,seeds=Number(process.argv[2]||250);
const quantile=(a,q)=>{const b=[...a].sort((x,y)=>x-y);return b[Math.floor((b.length-1)*q)];};
function stats(a){return {mean:a.reduce((x,y)=>x+y,0)/a.length,p10:quantile(a,.1),median:quantile(a,.5),p90:quantile(a,.9),min:Math.min(...a),max:Math.max(...a)};}
const rows=[];
for(const [width,height] of [[320,300],[364,347],[768,500],[1200,700]])for(const policy of ['stationary','sweep','nearest'])for(const ability of ['pointer','support']){
 const samples=[];
 for(let seed=1;seed<=seeds;seed++){
  const scale=Math.min(1,Math.min(width,height)/360);
  const e=new Experiment(width,height,{...defaults,spacing:72*scale,radius:120*scale,speed:210*scale,seed});
  const p={active:true,x:width/2,y:height/2},times=[];let last=-1,combo=0,maxGap=0,rawValue=0,comboValue=0;
  for(let frame=0;frame<900;frame++){
   const t=frame/60;
   if(policy!=='stationary'){
    let tx,ty;
    if(policy==='sweep'){tx=width/2+width*.4*Math.sin(t*1.3);ty=height/2+height*.4*Math.sin(t*.71);}
    else {let nearest=null,best=Infinity;for(const n of e.nodes){if(n.cooldown>0||n.age<.3)continue;const d=Math.hypot(n.x-p.x,n.y-p.y);if(d<best){best=d;nearest=n;}}tx=nearest?nearest.x:p.x;ty=nearest?nearest.y:p.y;}
    const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy),step=Math.min(d,480*scale/60);
    if(d){p.x+=dx/d*step;p.y+=dy/d*step;}
   }
   if(ability==='support'){
    if(frame===0||frame===721){if(!e.surge())throw new Error('Scheduled Surge rejected');}
    if(frame%120===0&&frame<=600)e.addPole(p.x,p.y);
   }
   e.step(1/60,p);
   for(const event of e.events){const time=e.time;maxGap=Math.max(maxGap,time-(last<0?0:last));combo=last>=0&&time-last<1.6?combo+1:1;last=time;
    const value=context.window.AFK.config.RARITIES[event.rarity].value;rawValue+=value;comboValue+=value*Math.min(5,1+combo*.12);times.push(time);}
  }
  maxGap=Math.max(maxGap,15-(last<0?0:last));
  const overlays={};
  // Baseline first-session overlay. Support costs 25 at 0 and 12 + 1/60 s.
  // Both 120 and 140 energy permit the second activation at 12 s.
  for(const initial of [120,140])for(const cap of [40,60,80,120]){
   const end=Math.min(15,(initial-(ability==='support'?50:0))/session.ENERGY_DRAIN),capacityTime=times[cap-1]??Infinity;
   const reason=capacityTime<end-1e-6?'storage':end<15-1e-6?'energy':'time';
   overlays[initial+'/'+cap]={captures:Math.min(cap,times.filter(t=>t<end-1e-6).length),reason,duration:Math.min(end,capacityTime)};
  }
  samples.push({captures:e.captures,first:e.firstCapture??15,maxGap,rawValue,comboValue,population:e.nodes.length,overlays});
 }
 const row={width,height,policy,ability,seeds};
 for(const metric of ['captures','first','maxGap','rawValue','comboValue','population'])row[metric]=stats(samples.map(s=>s[metric]));
 row.overlays={};for(const key of Object.keys(samples[0].overlays)){const a=samples.map(s=>s.overlays[key]);row.overlays[key]={captures:stats(a.map(x=>x.captures)),duration:stats(a.map(x=>x.duration)),storageFraction:a.filter(x=>x.reason==='storage').length/seeds,energyFraction:a.filter(x=>x.reason==='energy').length/seeds};}
 rows.push(row);console.log(`${width}x${height} ${policy} ${ability}: ${row.captures.mean.toFixed(1)} captures`);
}
fs.writeFileSync('simulations/harvest-results.json',JSON.stringify({schema:1,seedsPerCell:seeds,sessions:seeds*rows.length,secondsPerSession:15,defaults,session,engineSHA256:crypto.createHash('sha256').update(fs.readFileSync('lab/engine.js')).digest('hex'),rows},null,2)+'\n');
