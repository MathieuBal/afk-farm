(() => {
  'use strict';
  const $ = id => document.getElementById(id), canvas = $('field'), ctx = canvas.getContext('2d');
  const colors = ['#a6bed4', '#68dfff', '#c29bff', '#ffcf6b'];
  let seed = 42, engine, width = 0, height = 0, scale = 1, running = false, last = 0, debt = 0, previousTap = null, results = [], config, grains = [], effects = [], waves = [], audio;
  const pointer = { x: 0, y: 0, active: false }, keys = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const settingIds = ['spacing','radius','speed','respawn','mode','physics','gridStyle'];
  function settings() { return Object.fromEntries(settingIds.map(id => [id, ['mode','physics','gridStyle'].includes(id) ? $(id).value : +$(id).value])); }
  let touchId = null;
  function reset() {
    touchId = null;
    running = false; $('arena').style.removeProperty('height'); debt = 0; keys.clear(); pointer.active = false; previousTap = null; effects = []; waves = [];
    config = settings(); config.gridVisible = $('grid').checked; config.sound = $('sound').checked;
    // Scale all spatial rules together on narrow/short canvases, not population alone.
    scale = Math.min(1, Math.min(width, height) / 360);
    engine = new HarvestLab.Experiment(width, height, { ...config, spacing: config.spacing * scale, radius: config.radius * scale, speed: config.speed * scale, seed });
    grains = []; for (let y = 12; y < height; y += 24) for (let x = 12; x < width; x += 24) grains.push({x,y,px:x,py:y});
    for (const id of ['spacing','radius','speed','respawn']) $(id+'-out').textContent = config[id] + (id === 'respawn' ? ' s' : id === 'speed' ? ' unités/s' : ' unités');
    $('overlay').hidden = false; $('overlay').style.display = 'grid'; $('start').disabled = false; $('surge').disabled = true;
    [...settingIds,'grid','sound'].forEach(id => $(id).disabled = false); metrics();
  }
  function metrics() { $('metrics').textContent = `Terrain ${seed} · ${width} × ${height} · ${engine.nodes.length} Lumens · ${engine.captures} captures · ${Math.max(0,15-engine.time).toFixed(1)} s`; }
  function resize() {
    const r = canvas.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
    // Keep the simulation stable while Safari changes its browser chrome.
    if (running || (w === width && h === height)) return;
    width = w; height = h;
    const dpr = Math.min(devicePixelRatio || 1,2); canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    reset();
  }
  new ResizeObserver(resize).observe($('arena'));
  settingIds.forEach(id => $(id).addEventListener('input',reset));
  $('grid').onchange = reset;
  $('replay').onclick = () => { reset(); $('status').textContent = 'Même terrain, mêmes raretés initiales. Prêt à comparer.'; };
  $('next').onclick = () => { seed++; reset(); $('status').textContent = 'Nouveau terrain prêt.'; };
  $('start').onclick = () => { $('arena').style.removeProperty('height'); resize(); reset(); $('arena').style.height = $('arena').getBoundingClientRect().height + 'px'; running = true; $('overlay').style.display='none'; $('start').disabled=true; $('surge').disabled=false; [...settingIds,'grid','sound'].forEach(id=>$(id).disabled=true); $('status').textContent='Essai en cours'; canvas.focus({preventScroll:true}); $('arena').scrollIntoView({block:'start',behavior:'instant'}); if ($('sound').checked) initAudio(); };
  function initAudio() { try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch {} }
  $('sound').onchange = () => { if ($('sound').checked) initAudio(); };
  function ping(rarity) { if (!audio || !$('sound').checked) return; const o=audio.createOscillator(), g=audio.createGain(); o.type='sine'; o.frequency.value=[600,750,900,1150][rarity]; g.gain.setValueAtTime(.035,audio.currentTime); g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.09); o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.1);o.onended=()=>{o.disconnect();g.disconnect();}; }
  $('surge').onclick = () => { if(running)engine.surge(); };
  function place(e) { const r=canvas.getBoundingClientRect(); pointer.x=Math.max(0,Math.min(width,(e.clientX-r.left)*width/r.width)); pointer.y=Math.max(0,Math.min(height,(e.clientY-r.top)*height/r.height)); pointer.active=running; }
  canvas.onpointerdown=e=>{if(e.pointerType==='touch'||!running)return;canvas.setPointerCapture(e.pointerId);place(e);const now=performance.now();if(previousTap&&now-previousTap.t<320&&Math.hypot(pointer.x-previousTap.x,pointer.y-previousTap.y)<40){engine.addPole(pointer.x,pointer.y);previousTap=null;}else previousTap={t:now,x:pointer.x,y:pointer.y};};
  canvas.onpointermove=e=>{if(e.pointerType!=='touch'&&(e.pointerType==='mouse'||e.buttons))place(e);};
  canvas.onpointerup=e=>{if(e.pointerType!=='mouse')pointer.active=false;};
  canvas.onpointercancel=canvas.onlostpointercapture=()=>{pointer.active=false;};canvas.onpointerleave=()=>{pointer.active=false;};
  // Explicit non-passive handlers keep iOS gestures inside the game surface.
  function stopTouchScroll(e) { if (e.cancelable) e.preventDefault(); }
  canvas.addEventListener('touchstart', e => {
    stopTouchScroll(e);
    if (!running || touchId !== null) return;
    const t = e.changedTouches[0]; if (!t) return;
    touchId = t.identifier; place(t);
    const now = performance.now();
    if (previousTap && now - previousTap.t < 320 && Math.hypot(pointer.x-previousTap.x,pointer.y-previousTap.y) < 40) {
      engine.addPole(pointer.x,pointer.y); previousTap = null;
    } else previousTap = {t:now,x:pointer.x,y:pointer.y};
  }, {passive:false});
  canvas.addEventListener('touchmove', e => {
    stopTouchScroll(e);
    const t = Array.from(e.touches).find(t => t.identifier === touchId);
    if (t && running) place(t);
  }, {passive:false});
  function endTouch(e) {
    stopTouchScroll(e);
    if (Array.from(e.changedTouches).some(t => t.identifier === touchId)) {
      touchId = null; pointer.active = false;
    }
  }
  canvas.addEventListener('touchend', endTouch, {passive:false});
  canvas.addEventListener('touchcancel', endTouch, {passive:false});
  canvas.onkeydown=e=>{if(!running)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','p','P'].includes(e.key)){e.preventDefault();if(!pointer.active){pointer.x=width/2;pointer.y=height/2;pointer.active=true;}keys.add(e.key);if(!e.repeat&&e.key===' ')engine.surge();if(!e.repeat&&e.key.toLowerCase()==='p')engine.addPole(pointer.x,pointer.y);}};
  window.addEventListener('keyup',e=>keys.delete(e.key));canvas.onblur=()=>{keys.clear();pointer.active=false;};
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){reset();$('status').textContent='Essai interrompu pendant ton absence. Relance pour une mesure complète.';}});
  function finish() {
    running=false;pointer.active=false;keys.clear();[...settingIds,'grid','sound'].forEach(id=>$(id).disabled=false);$('start').disabled=false;$('surge').disabled=true;
    const result={seed,width,height,scale,config:{...config},captures:engine.captures,firstCapture:engine.firstCapture,distance:engine.distance,rating:'Non noté'};results.push(result);
    const tr=document.createElement('tr');for(const value of [results.length,`${seed} · ${width}×${height}`,`${config.physics} / ${config.mode} / ${config.gridStyle}`,`${config.spacing} / ${config.radius}`,engine.captures,engine.firstCapture===null?'—':engine.firstCapture.toFixed(2)+' s']){const td=document.createElement('td');td.textContent=value;tr.append(td);}
    const td=document.createElement('td'),select=document.createElement('select');select.setAttribute('aria-label','Ressenti de l’essai '+results.length);for(const v of ['Non noté','Agréable','Trop mou','Trop dense','Trop vide','Trop brusque','Grille trop agitée','Grille trop discrète'])select.add(new Option(v,v));select.onchange=()=>result.rating=select.value;td.append(select);tr.append(td);$('results').prepend(tr);$('status').textContent='Essai terminé. Note ton ressenti, puis change un seul réglage.';
  }
  $('copy').onclick=async()=>{const text=JSON.stringify({version:2,results},null,2);try{await navigator.clipboard.writeText(text);$('status').textContent='Résultats copiés.';}catch{$('export').hidden=false;$('export').value=text;$('export').select();$('status').textContent='Sélectionne et copie les résultats ci-dessous.';}};
  function draw(dt) {
    ctx.clearRect(0,0,width,height);const sources=engine.sources(pointer);
    waves=waves.filter(w=>(w.life-=dt)>0);
    ctx.fillStyle='#587b91';
    for(const g of grains) {
      HarvestGrid.update(g,sources,waves,config.gridStyle,dt,reduced.matches);
      if(config.gridVisible){ctx.globalAlpha=config.gridStyle==='subtle'?.35:.55;ctx.fillRect(g.px,g.py,1.5,1.5);}
    }
    ctx.globalAlpha=1;for(const n of engine.nodes){if(n.cooldown>0)continue;const r=[3,4,5,6][n.rarity]*Math.min(1,n.age/.3);ctx.fillStyle=colors[n.rarity];ctx.shadowColor=colors[n.rarity];ctx.shadowBlur=reduced.matches?0:10;ctx.beginPath();ctx.arc(n.x,n.y,r,0,Math.PI*2);ctx.fill();}ctx.shadowBlur=0;
    for(const s of sources){ctx.strokeStyle='#6ce6c533';ctx.beginPath();ctx.arc(s.x,s.y,s.radius,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#6ce6c5';ctx.beginPath();ctx.arc(s.x,s.y,10,0,Math.PI*2);ctx.stroke();}
    effects=effects.filter(e=>(e.life-=dt)>0);for(const e of effects){ctx.globalAlpha=e.life/.25;ctx.strokeStyle=colors[e.rarity];ctx.beginPath();ctx.arc(e.x,e.y,6+(reduced.matches?0:(.25-e.life)*65),0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
  }
  function frame(now) {
    const dt=Math.min(.05,(now-(last||now))/1000);last=now;
    if(engine){if(running){if(keys.size){pointer.x=Math.max(0,Math.min(width,pointer.x+((keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0))*260*dt));pointer.y=Math.max(0,Math.min(height,pointer.y+((keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0))*260*dt));}debt+=dt;while(debt>=1/120&&running){engine.step(1/120,pointer);for(const e of engine.events){effects.push({...e,life:.25});if(config.gridStyle==='wave'&&!reduced.matches)waves.push({...e,life:.6});}waves=waves.slice(-12);if(engine.events.length)ping(engine.events[0].rarity);debt-=1/120;if(engine.time>=15-1e-6)finish();}$('surge').disabled=!running||engine.time<engine.surgeReady;}draw(dt);metrics();}requestAnimationFrame(frame);
  }
  window.__harvestLab={get engine(){return engine;},get results(){return results;}};
  resize();requestAnimationFrame(frame);
})();
