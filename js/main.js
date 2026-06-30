/* AFK Farm — point d'entrée : canvas, fonds de biome, entrées, rendu, PWA. */
(function () {
  const AFK = window.AFK;
  const C = AFK.config;
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");

  const field = new AFK.GrainField();
  const game = new AFK.Game();
  const treeUI = new AFK.TreeUI(game);
  const ui = new AFK.UI(game, treeUI);
  game.field = field;            // la grille magnétique EST la source des Lumens

  // accessibilité : respecte « réduire les animations »
  const rmq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  game.reducedMotion = !!(rmq && rmq.matches);
  if (rmq && rmq.addEventListener) rmq.addEventListener("change", (e) => { game.reducedMotion = e.matches; });

  let dpr = 1, W = 0, H = 0;
  let stars = [], rocks = [];
  let lastBiome = -1;

  function genBackground() {
    stars = [];
    const count = Math.round((W * H) / 9000);
    for (let i = 0; i < count; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + 0.3, tw: Math.random() * Math.PI * 2, sp: 0.5 + Math.random() });
    }
    rocks = [];
    for (let i = 0; i < 36; i++) {
      rocks.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 7 + 2, vx: (Math.random() - 0.5) * 0.006, a: Math.random() * Math.PI * 2 });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    field.resize(W, H);          // reconstruit la grille
    game.resize(W, H);
    game.seedGrid();             // (ré)attribue les raretés des grains
    genBackground();
    if (treeUI.open) treeUI.resize();
  }
  window.addEventListener("resize", resize);

  /* ---------- fonds de biome ---------- */
  function drawBackground(t) {
    const b = C.biome(game.state.biome);
    const grd = ctx.createRadialGradient(W * 0.3, H * 0.1, 0, W * 0.3, H * 0.1, Math.max(W, H));
    grd.addColorStop(0, b.bg1 || "#0b0f1e");
    grd.addColorStop(0.55, b.bg0 || "#070a14");
    grd.addColorStop(1, "#04050a");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

    // étoiles communes
    for (const s of stars) {
      const a = 0.35 + 0.35 * Math.sin(t * 0.001 * s.sp + s.tw);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#cdd7ff";
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    switch (b.style) {
      case "belt": {
        ctx.save(); ctx.globalAlpha = 0.5;
        for (const r of rocks) {
          r.x += r.vx * 16; if (r.x > W + 10) r.x = -10; if (r.x < -10) r.x = W + 10;
          ctx.fillStyle = "rgba(140,150,180,0.5)";
          ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore(); break;
      }
      case "nebula": {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const blobs = [[0.3, 0.35, b.accent], [0.7, 0.55, b.accent2], [0.5, 0.7, b.accent]];
        for (const [bx, by, col] of blobs) {
          const g2 = ctx.createRadialGradient(bx * W, by * H, 0, bx * W, by * H, Math.max(W, H) * 0.35);
          g2.addColorStop(0, hexA(col, 0.18)); g2.addColorStop(1, hexA(col, 0));
          ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
        }
        ctx.restore(); break;
      }
      case "cluster": {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const g2 = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.max(W, H) * 0.5);
        g2.addColorStop(0, hexA(b.accent, 0.12)); g2.addColorStop(1, hexA(b.accent, 0));
        ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
        ctx.restore(); break;
      }
      case "blackhole": {
        const cx = W / 2, cy = H * 0.4, R = Math.min(W, H) * 0.16;
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(t * 0.0002);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(0, 0, R * (1.5 + i * 0.5), R * (0.5 + i * 0.2), 0, 0, Math.PI * 2);
          ctx.strokeStyle = hexA(i % 2 ? b.accent : b.accent2, 0.25 - i * 0.06); ctx.lineWidth = 8; ctx.stroke();
        }
        ctx.restore();
        const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        g2.addColorStop(0, "rgba(0,0,0,1)"); g2.addColorStop(0.8, "rgba(0,0,0,0.9)"); g2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case "galaxy": {
        ctx.save(); ctx.translate(W / 2, H * 0.42); ctx.rotate(t * 0.00006);
        ctx.globalCompositeOperation = "lighter";
        for (let arm = 0; arm < 2; arm++) {
          for (let i = 0; i < 90; i++) {
            const ang = i * 0.22 + arm * Math.PI;
            const rad = i * (Math.min(W, H) * 0.006);
            const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad * 0.5;
            ctx.fillStyle = hexA(i % 3 ? b.accent : b.accent2, 0.5 - i * 0.004);
            ctx.fillRect(x, y, 2, 2);
          }
        }
        ctx.restore(); break;
      }
      case "singularity": {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const cx = W / 2, cy = H * 0.4;
        for (let i = 0; i < 4; i++) {
          const rr = ((t * 0.04 + i * 80) % 320);
          ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.strokeStyle = hexA(b.accent2, 0.18 * (1 - rr / 320)); ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.restore(); break;
      }
    }
  }

  function hexA(h, a) {
    h = h.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  /* ---------- entrées (vue terrain) ---------- */
  let lastTap = 0, lastTapX = 0, lastTapY = 0;
  // le pointeur n'aimante que pendant une session de récolte active
  function canHarvest() { return ui.view === "field" && game.session.harvesting; }
  function overUI(target) { return target.closest && (target.closest("#sheet") || target.closest("#harvest") || target.closest("nav") || target.closest("header")); }
  function setPointer(x, y) { game.pointer.x = x; game.pointer.y = y; game.pointer.active = true; }

  canvas.addEventListener("pointermove", (e) => { if (canHarvest()) setPointer(e.clientX, e.clientY); });
  canvas.addEventListener("pointerdown", (e) => {
    if (!canHarvest() || overUI(e.target)) return;
    setPointer(e.clientX, e.clientY);
    const now = performance.now();
    const near = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 60;
    if (now - lastTap < 320 && near) { game.addPole(e.clientX, e.clientY); lastTap = 0; }
    else { lastTap = now; lastTapX = e.clientX; lastTapY = e.clientY; }
    hideHint();
  });
  window.addEventListener("pointerup", (e) => { if (e.pointerType === "touch") game.pointer.active = false; });
  canvas.addEventListener("pointerleave", () => { game.pointer.active = false; });

  let hintHidden = false;
  function hideHint() { if (hintHidden) return; hintHidden = true; const h = document.getElementById("hint"); if (h) h.style.opacity = "0"; }

  // initialise l'audio dès la première interaction (politique navigateur)
  window.addEventListener("pointerdown", () => { if (AFK.audio) AFK.audio.init(); }, { once: true });

  /* ---------- rendu de scène ---------- */
  function drawPole(p) {
    const a = p.life / p.maxLife;
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26);
    g.addColorStop(0, "rgba(217,70,239,0.5)"); g.addColorStop(1, "rgba(217,70,239,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(240,180,255,0.8)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  function drawDrone(d) {
    ctx.save();
    const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 22);
    g.addColorStop(0, hexA(curAccent, 0.5)); g.addColorStop(1, hexA(curAccent, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x, d.y, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#eafcff"; ctx.beginPath(); ctx.arc(d.x, d.y, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(curAccent, 0.7); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(d.x, d.y, 11, 4.5, d.phase || 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // points-Lumens allumés : nœuds lumineux ancrés dans la grille (intégrés,
  // pas de grosses orbes — ils streament dans l'aimant via la physique du champ)
  let lumPulse = 0;
  function drawLumens() {
    const f = game.field;
    if (!f || !f.lumens) return;
    lumPulse += 0.06;
    ctx.save();
    for (const e of f.lumens) {
      if (!e.lit) continue;
      const x = f.px[e.i], y = f.py[e.i];
      const rar = e.rar;
      const r = rar.r * 0.7 + Math.sin(lumPulse + e.i) * 0.4;
      ctx.globalAlpha = 0.5; ctx.fillStyle = rar.glow;
      ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = rar.color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.34, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function drawPointer() {
    if (!game.pointer.active) return;
    const x = game.pointer.x, y = game.pointer.y;
    const surging = game.surgeBoost > 1;
    const col = surging ? "#ff7a6b" : curAccent;
    const R = game.effRadius();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.62);
    g.addColorStop(0, hexA(col, 0.5)); g.addColorStop(0.5, hexA(col, 0.12)); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 0.62, 0, 6.283); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.85; ctx.strokeStyle = surging ? "#ffce9e" : curAccent2; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.283); ctx.stroke();
    ctx.restore();
  }

  function drawSurgeRing() {
    if (game.surgeRing <= 0 || game.reducedMotion) return;
    const x = game.pointer.active ? game.pointer.x : W / 2;
    const y = game.pointer.active ? game.pointer.y : H * 0.4;
    const p = 1 - game.surgeRing;            // 0 -> 1
    const r = 30 + p * Math.max(W, H) * 0.5;
    ctx.save();
    ctx.globalAlpha = game.surgeRing * 0.7;
    ctx.strokeStyle = "#fb7185"; ctx.lineWidth = 6 * game.surgeRing + 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  let curAccent = "#34e0ce", curAccent2 = "#7cf5e4";
  const GLOW = 0.72;

  function renderScene(t) {
    ctx.save();
    if (game.shake > 0.1) ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    drawBackground(t);
    field.render(ctx, game.grainSources(), GLOW);
    drawSurgeRing();
    for (const p of game.poles) drawPole(p);
    for (const d of game.drones) drawDrone(d);
    drawLumens();
    drawPointer();
    ctx.globalCompositeOperation = "lighter";
    for (const p of game.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 * (p.life / p.max) + 0.6, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.textAlign = "center"; ctx.font = "800 16px 'Space Grotesk', sans-serif";
    for (const f of game.floats) {
      ctx.globalAlpha = Math.max(0, f.life / f.max);
      ctx.fillStyle = f.color; ctx.shadowColor = f.color; ctx.shadowBlur = 10;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ---------- boucle ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = now - last; last = now;

    if (game.state.biome !== lastBiome) {
      lastBiome = game.state.biome;
      const b = C.biome(lastBiome);
      field.setTheme(b.accent, b.accent2);
      curAccent = b.accent; curAccent2 = b.accent2;
    }

    game.update(dt);
    if (ui.view === "tree") {
      treeUI.draw();
    } else {
      field.simulate(dt, game.grainSources());
      renderScene(now);
    }
    ui.tick();
    requestAnimationFrame(frame);
  }

  /* ---------- sauvegarde + PWA ---------- */
  setInterval(() => AFK.state.save(game.state), 5000);
  document.addEventListener("visibilitychange", () => { if (document.hidden) AFK.state.save(game.state); });
  window.addEventListener("beforeunload", () => AFK.state.save(game.state));

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  // exposé pour les tests automatisés
  window.__afk = { game, ui, treeUI, field };

  resize();
  requestAnimationFrame(frame);
})();
