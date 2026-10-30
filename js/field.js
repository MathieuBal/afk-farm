/* Shared harvest physics with an independent elastic decorative grid.
 * Positions use one logical arena on every device. Resize only changes rendering.
 */
(function () {
  const AFK = (window.AFK = window.AFK || {}), C = AFK.config.CONST;
  class GrainField {
    constructor() {
      this.lumens=[];this.px=[];this.py=[];this.flag=true;this.grains=[];
      this.setTheme('#34e0ce');this.resize(C.FIELD_WIDTH,C.FIELD_HEIGHT);
    }
    setTheme(accent) { this.accent=accent; }
    resize(w,h) {
      if(this.model){
        const m=this.model;if(Math.abs(m.width-w)<.01&&Math.abs(m.height-h)<.01)return;
        const sx=w/m.width,sy=h/m.height;m.width=w;m.height=h;
        for(const n of m.nodes){n.x*=sx;n.y*=sy;n.ax*=sx;n.ay*=sy;n.vx*=sx;n.vy*=sy;}
        // Retain rarity and cooldowns; only relocate colliding anchors after aspect changes.
        for(let i=0;i<m.nodes.length;i++){
          const n=m.nodes[i];
          if(n.ax<14||n.ax>w-14||n.ay<14||n.ay>h-14||m.nodes.slice(0,i).some(o=>Math.hypot(o.ax-n.ax,o.ay-n.ay)<m.options.spacing)){
            const p=m.position(n);if(p){n.ax=p.x;n.ay=p.y;n.x=p.x;n.y=p.y;n.vx=n.vy=0;}
          }
        }
        this.grains=[];for(let y=12;y<h;y+=24)for(let x=12;x<w;x+=24)this.grains.push({x,y,px:x,py:y});
        this.sync();return;
      }
      this.model=new HarvestLab.Experiment(w,h,{spacing:72*C.FIELD_SCALE,radius:120*C.FIELD_SCALE,speed:210*C.FIELD_SCALE,manualCapture:true,seed:Math.floor(Math.random()*0xffffffff)});
      this.model.nodes=[];this.requested=-1;
      for(let y=12;y<h;y+=24)for(let x=12;x<w;x+=24)this.grains.push({x,y,px:x,py:y});
    }
    ensureLumens(count,pickRar) {
      count=Math.max(0,Math.min(300,Math.round(count)));
      if(count===this.requested)return;
      this.requested=count;
      // Density improvements add population on all devices equally.
      this.model.options.spacing=72*C.FIELD_SCALE*Math.min(1,Math.sqrt(C.LUMEN_COUNT/Math.max(1,count)));
      this.model.nodes.length=Math.min(this.model.nodes.length,count);
      this.lumens.length=Math.min(this.lumens.length,count);
      while(this.model.nodes.length<count){
        const p=this.model.position();if(!p)break;
        const i=this.model.nodes.length;
        this.model.nodes.push({...p,ax:p.x,ay:p.y,vx:0,vy:0,cooldown:0,age:1,rarity:0});
        this.lumens.push({i,rar:pickRar(),lit:true,age:1,cd:0});
      }
      this.sync();
    }
    sync() {
      this.model.nodes.forEach((n,i)=>{const e=this.lumens[i];this.px[i]=n.x;this.py[i]=n.y;e.lit=n.cooldown<=0;e.age=n.age;e.cd=n.cooldown*1000;});
    }
    tickLumens(dt,pickRar) { this.pickRar=pickRar; }
    simulate(dt,sources) {
      const mapped=sources.map(s=>({x:s.x,y:s.y,radius:s.r,speed:210*C.FIELD_SCALE*s.strength/.55}));
      const cooling=this.model.nodes.map(n=>n.cooldown>0);
      this.model.step(Math.min(dt,50)/1000,{active:false},mapped);
      this.model.nodes.forEach((n,i)=>{if(cooling[i]&&n.cooldown<=0&&this.pickRar)this.lumens[i].rar=this.pickRar();});
      this.sync();
      for(const g of this.grains)HarvestGrid.update(g,mapped,[],'elastic',Math.min(dt,50)/1000,this.reducedMotion);
    }
    harvest(k,repopMs) {
      const e=this.lumens[k],n=this.model.nodes[k];if(!e||!e.lit)return;
      n.cooldown=repopMs/1000;n.vx=n.vy=0;this.sync();
    }
    clearLumens() { this.model.nodes=[];this.lumens=[];this.px=[];this.py=[];this.requested=-1; }
    render(ctx) {
      ctx.fillStyle=this.accent;ctx.globalAlpha=.45;
      for(const g of this.grains)ctx.fillRect(g.px,g.py,1.5,1.5);
      ctx.globalAlpha=1;
    }
  }
  AFK.GrainField=GrainField;
})();
