/* Visual-only grid: never reads or mutates the harvest engine. */
(function(root) {
  function update(point, sources, waves, mode, dt, reduced) {
    if (reduced) { point.px=point.x; point.py=point.y; point.vx=point.vy=0; return; }
    let tx=point.x, ty=point.y;
    for (const source of sources) {
      const dx=source.x-point.x,dy=source.y-point.y,d=Math.hypot(dx,dy);
      if (d>0 && d<source.radius) {
        const bend=Math.min(mode==='subtle'?10:28,d*.32)*(1-d/source.radius);
        tx+=dx/d*bend;ty+=dy/d*bend;
      }
    }
    if(mode==='wave') for(const wave of waves) {
      const dx=point.x-wave.x,dy=point.y-wave.y,d=Math.hypot(dx,dy);
      if(d<1)continue;
      const age=.6-wave.life, band=(d-age*180)/16;
      const push=7*Math.exp(-band*band)*(wave.life/.6);
      tx+=dx/d*push;ty+=dy/d*push;
    }
    // Clamp combined forces from overlapping poles and captures.
    const dx=tx-point.x,dy=ty-point.y,d=Math.hypot(dx,dy);
    if(d>32){tx=point.x+dx/d*32;ty=point.y+dy/d*32;}
    if(mode==='subtle') {
      const a=1-Math.exp(-dt*14);point.px+=(tx-point.px)*a;point.py+=(ty-point.py)*a;point.vx=point.vy=0;
    } else {
      let remaining=Math.min(dt,.05);
      while(remaining>1e-8){const h=Math.min(remaining,1/120),damp=Math.exp(-h*12);
        point.vx=((point.vx||0)+(tx-point.px)*180*h)*damp;
        point.vy=((point.vy||0)+(ty-point.py)*180*h)*damp;
        point.px+=point.vx*h;point.py+=point.vy*h;remaining-=h;
      }
    }
  }
  root.HarvestGrid={update};
  if(typeof module!=='undefined')module.exports=root.HarvestGrid;
})(typeof globalThis!=='undefined'?globalThis:window);
