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
    field.resize(W, H);
    game.resize(W, H);
    genBackground();
    if (treeUI.open) treeUI.resize();
  }
  window.addEventListener("resize", resize);

  /* ---------- fonds de biome ---------- */
  function drawBackground(t) {
    const b = C.biome(game.state.biome);
    const grd = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.max(W, H) * 0.8);
    grd.addColorStop(0, "rgba(16,20,42,1)");
    grd.addColorStop(1, "rgba(4,5,12,1)");
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
        const blobs = [[0.3, 0.35, b.c1], [0.7, 0.55, b.c2], [0.5, 0.7, b.c1]];
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
        g2.addColorStop(0, hexA(b.c1, 0.12)); g2.addColorStop(1, hexA(b.c1, 0));
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
          ctx.strokeStyle = hexA(i % 2 ? b.c1 : b.c2, 0.25 - i * 0.06); ctx.lineWidth = 8; ctx.stroke();
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
            ctx.fillStyle = hexA(i % 3 ? b.c1 : b.c2, 0.5 - i * 0.004);
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
          ctx.strokeStyle = hexA(b.c2, 0.18 * (1 - rr / 320)); ctx.lineWidth = 2; ctx.stroke();
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
  function inField() { return ui.view === "field" || ui.view === "build" || ui.view === "prestige"; }
  function overUI(target) { return target.closest && (target.closest("#sheet") || target.closest("nav") || target.closest("header")); }
  function setPointer(x, y) { game.pointer.x = x; game.pointer.y = y; game.pointer.active = true; }

  canvas.addEventListener("pointermove", (e) => { if (inField()) setPointer(e.clientX, e.clientY); });
  canvas.addEventListener("pointerdown", (e) => {
    if (!inField() || overUI(e.target)) return;
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
  function drawUnit(u) {
    const r = u.rar.r + Math.sin(u.wob) * 0.6;
    ctx.save();
    const g = ctx.createRadialGradient(u.x, u.y, 0, u.x, u.y, r * 2.4);
    g.addColorStop(0, u.rar.glow); g.addColorStop(0.25, u.rar.color); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(u.x, u.y, r * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = u.rar.color;
    ctx.beginPath(); ctx.arc(u.x, u.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.arc(u.x - r * 0.3, u.y - r * 0.3, r * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawPointer() {
    if (!game.pointer.active) return;
    const x = game.pointer.x, y = game.pointer.y;
    ctx.save();
    ctx.strokeStyle = hexA(curAccent, 0.32); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, game.pullRadius, 0, Math.PI * 2); ctx.stroke();
    const g = ctx.createRadialGradient(x, y, 0, x, y, 30);
    g.addColorStop(0, hexA(curAccent, 0.55)); g.addColorStop(1, hexA(curAccent, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  let curAccent = "#22d3ee";

  function renderScene(t) {
    drawBackground(t);
    field.render(ctx);
    for (const p of game.poles) drawPole(p);
    for (const d of game.drones) drawDrone(d);
    for (const u of game.units) drawUnit(u);
    drawPointer();
    for (const p of game.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center"; ctx.font = "700 15px 'Segoe UI', sans-serif";
    for (const f of game.floats) { ctx.globalAlpha = Math.max(0, f.life / f.max); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); }
    ctx.globalAlpha = 1;
  }

  /* ---------- boucle ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = now - last; last = now;

    if (game.state.biome !== lastBiome) {
      lastBiome = game.state.biome;
      const b = C.biome(lastBiome);
      field.setTheme(b.c1, b.c2);
      curAccent = b.accent;
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
