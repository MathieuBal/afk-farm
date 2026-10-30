const test=require('node:test'), assert=require('node:assert/strict');
const {update}=require('../lab/grid.js');
const {Experiment}=require('../lab/engine.js');
test('visual modes leave harvest trajectories identical',()=>{
  const outcomes=[];
  for(const mode of ['subtle','elastic','wave']) {
    const engine=new Experiment(364,347),g={x:80,y:80,px:80,py:80};
    for(let i=0;i<1800;i++) {
      const pointer={active:true,x:180+100*Math.sin(i/100),y:170};
      engine.step(1/120,pointer);
      const before=JSON.stringify(engine);
      update(g,engine.sources(pointer),[{x:90,y:90,life:.3}],mode,1/120,false);
      assert.equal(JSON.stringify(engine),before);
      assert.ok(Number.isFinite(g.px)&&Number.isFinite(g.py));
    }
    outcomes.push(JSON.stringify(engine));
  }
  assert.equal(outcomes[0],outcomes[1]);assert.equal(outcomes[1],outcomes[2]);
});
test('elastic grid settles after release; reduced motion restores anchors',()=>{
  const g={x:80,y:80,px:80,py:80};
  for(let i=0;i<120;i++)update(g,[{x:100,y:100,radius:120}],[],'elastic',1/60,false);
  assert.ok(g.px>80);
  for(let i=0;i<300;i++)update(g,[],[],'elastic',1/60,false);
  assert.ok(Math.abs(g.px-80)<.001);
  g.px=90;g.vx=20;
  update(g,[{x:100,y:100,radius:120}],[{x:70,y:70,life:.3}],'wave',1/60,true);
  assert.equal(g.px,80);assert.equal(g.py,80);assert.equal(g.vx,0);
});
