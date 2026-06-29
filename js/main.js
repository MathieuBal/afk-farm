/* AFK Farm — point d'entrée : canvas, entrées (souris/tactile), rendu, sauvegarde. */
(function () {
  const AFK = window.AFK;
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");

  const field = new AFK.GrainField();
  const game = new AFK.Game();
  const ui = new AFK.UI(game);

  let dpr = 1;
  let W = 0, H = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    field.resize(W, H);
    game.resize(W, H);
  }
  window.addEventListener("resize", resize);

  /* ---------- entrées ---------- */
  const shopEl = document.getElementById("shop");
  let lastTap = 0;
  let lastTapX = 0, lastTapY = 0;

  function overUI(target) {
    return target.closest && (target.closest("#shop") || target.closest("#shop-toggle"));
  }

  function setPointer(x, y) {
    game.pointer.x = x;
    game.pointer.y = y;
    game.pointer.active = true;
  }

  canvas.addEventListener("pointermove", (e) => {
    setPointer(e.clientX, e.clientY);
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (overUI(e.target)) return;
    setPointer(e.clientX, e.clientY);
    // détection double-tap / double-clic -> pose un pôle
    const now = performance.now();
    const near = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 60;
    if (now - lastTap < 320 && near) {
      game.addPole(e.clientX, e.clientY);
      lastTap = 0;
    } else {
      lastTap = now;
      lastTapX = e.clientX;
      lastTapY = e.clientY;
    }
    hideHint();
  });
  window.addEventListener("pointerup", (e) => {
    // sur tactile, on relâche le pôle mobile ; à la souris on garde le survol
    if (e.pointerType === "touch") game.pointer.active = false;
  });
  canvas.addEventListener("pointerleave", () => {
    game.pointer.active = false;
  });

  let hintHidden = false;
  function hideHint() {
    if (hintHidden) return;
    hintHidden = true;
    const h = document.getElementById("hint");
    h.style.opacity = "0";
  }

  /* ---------- rendu ---------- */
  function drawPole(p) {
    const a = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = a;
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26);
    grd.addColorStop(0, "rgba(217,70,239,0.5)");
    grd.addColorStop(1, "rgba(217,70,239,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(240,180,255,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawDrone(d) {
    ctx.save();
    const grd = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 22);
    grd.addColorStop(0, "rgba(34,211,238,0.45)");
    grd.addColorStop(1, "rgba(34,211,238,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dffbff";
    ctx.beginPath();
    ctx.arc(d.x, d.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // anneau orbital
    ctx.strokeStyle = "rgba(34,211,238,0.7)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, 11, 4.5, Math.sin(d.phase || 0) , 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawUnit(u) {
    const r = u.rar.r + Math.sin(u.wob) * 0.6;
    ctx.save();
    const grd = ctx.createRadialGradient(u.x, u.y, 0, u.x, u.y, r * 2.4);
    grd.addColorStop(0, u.rar.glow);
    grd.addColorStop(0.25, u.rar.color);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(u.x, u.y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = u.rar.color;
    ctx.beginPath();
    ctx.arc(u.x, u.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(u.x - r * 0.3, u.y - r * 0.3, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPointer() {
    if (!game.pointer.active) return;
    const x = game.pointer.x, y = game.pointer.y;
    ctx.save();
    ctx.strokeStyle = "rgba(34,211,238,0.32)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, game.pullRadius, 0, Math.PI * 2);
    ctx.stroke();
    const grd = ctx.createRadialGradient(x, y, 0, x, y, 30);
    grd.addColorStop(0, "rgba(34,211,238,0.55)");
    grd.addColorStop(1, "rgba(34,211,238,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    field.render(ctx);

    for (const p of game.poles) drawPole(p);
    for (const d of game.drones) drawDrone(d);
    for (const u of game.units) drawUnit(u);
    drawPointer();

    // particules
    for (const p of game.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;

    // textes flottants
    ctx.textAlign = "center";
    ctx.font = "700 15px 'Segoe UI', sans-serif";
    for (const f of game.floats) {
      ctx.globalAlpha = Math.max(0, f.life / f.max);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- boucle ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = now - last;
    last = now;
    game.update(dt);
    field.simulate(dt, game.grainSources());
    render();
    ui.tick();
    requestAnimationFrame(frame);
  }

  /* ---------- sauvegarde ---------- */
  setInterval(() => AFK.state.save(game.state), 5000);
  window.addEventListener("visibilitychange", () => {
    if (document.hidden) AFK.state.save(game.state);
  });
  window.addEventListener("beforeunload", () => AFK.state.save(game.state));

  resize();
  requestAnimationFrame(frame);
})();
