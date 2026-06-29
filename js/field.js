/* AFK Farm — champ de grains magnétique (inspiré de Sensoria / MagneticScene).
 *
 * Un lattice de milliers de grains dessine les lignes de champ (ressort de
 * rappel + attraction en 1/distance plafonnée). Un sous-ensemble de grains sont
 * des « Lumens » ancrés : allumés, ils affluent vers l'aimant et sont récoltés ;
 * récoltés, ils s'éteignent puis se rallument (repop) après un délai.
 */
(function () {
  const AFK = (window.AFK = window.AFK || {});

  const SPRING = 0.0011;
  const DAMP_TAU = 150;
  const MAX_ACCEL = 0.03;
  const BUCKETS = 6;
  const TAIL = 14;
  const MAX_SPEED = 0.5;

  function hex2rgb(h) {
    h = h.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  class GrainField {
    constructor() {
      this.spacing = 26;
      this.n = 0;
      this.hx = this.hy = this.px = this.py = this.vx = this.vy = null;
      this.bucketColors = [];
      // points-Lumens ancrés
      this.lumens = [];          // [{ i, rar, lit, cd }]
      this.flag = null;          // Uint8Array : 0 grain, 1 lumen allumé, 2 lumen éteint
      this.setTheme("#22d3ee", "#d946ef");
    }

    setTheme(accent, accent2) {
      const a = hex2rgb(accent);
      this.accentStr = a[0] + "," + a[1] + "," + a[2];
    }

    resize(w, h) {
      const sp = this.spacing;
      const cols = Math.ceil(w / sp) + 1;
      const rows = Math.ceil(h / sp) + 1;
      const n = cols * rows;
      this.cols = cols; this.rows = rows; this.n = n;
      this.hx = new Float32Array(n);
      this.hy = new Float32Array(n);
      this.px = new Float32Array(n);
      this.py = new Float32Array(n);
      this.vx = new Float32Array(n);
      this.vy = new Float32Array(n);
      this.flag = new Uint8Array(n);
      this.lumens.length = 0;
      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          this.hx[i] = c * sp; this.hy[i] = r * sp;
          this.px[i] = c * sp; this.py[i] = r * sp;
          i++;
        }
      }
    }

    simulate(dt, sources) {
      dt = Math.min(dt, 40);
      const damp = Math.exp(-dt / DAMP_TAU);
      const { hx, hy, px, py, vx, vy, n, flag } = this;
      const ns = sources.length;
      for (let i = 0; i < n; i++) {
        // lumen éteint : ancré, au repos à sa place
        if (flag[i] === 2) {
          px[i] += (hx[i] - px[i]) * 0.3;
          py[i] += (hy[i] - py[i]) * 0.3;
          vx[i] = 0; vy[i] = 0;
          continue;
        }
        // lumen allumé : plus réactif (afflue vers l'aimant) ; grain normal sinon
        const lit = flag[i] === 1;
        const fb = lit ? 2.2 : 1;
        const cap = lit ? MAX_ACCEL * 2.5 : MAX_ACCEL;
        let ax = (hx[i] - px[i]) * (lit ? SPRING * 0.6 : SPRING);
        let ay = (hy[i] - py[i]) * (lit ? SPRING * 0.6 : SPRING);
        for (let s = 0; s < ns; s++) {
          const src = sources[s];
          const dx = src.x - px[i];
          const dy = src.y - py[i];
          const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
          if (d < src.r) {
            const f = (src.strength * (1 - d / src.r)) / d * fb;
            ax += dx * f; ay += dy * f;
          }
        }
        const am = Math.hypot(ax, ay);
        if (am > cap) { const k = cap / am; ax *= k; ay *= k; }
        vx[i] = (vx[i] + ax * dt) * damp;
        vy[i] = (vy[i] + ay * dt) * damp;
        px[i] += vx[i] * dt;
        py[i] += vy[i] * dt;
      }
    }

    /* ---- points-Lumens ancrés ---- */
    ensureLumens(count, pickRar) {
      const L = this.lumens;
      while (L.length > count) { const e = L.pop(); this.flag[e.i] = 0; }
      let guard = 0;
      const m = 2; // marge en cellules pour éviter les bords
      while (L.length < count && guard < count * 6 + 30) {
        guard++;
        const c = m + ((Math.random() * (this.cols - 2 * m)) | 0);
        const r = m + ((Math.random() * (this.rows - 2 * m)) | 0);
        const i = r * this.cols + c;
        if (this.flag[i]) continue;
        this.flag[i] = 1;
        L.push({ i, rar: pickRar(), lit: true, cd: 0 });
      }
    }
    // récolte d'un lumen (par son index dans la liste) : il s'éteint
    harvest(k, repopMs) {
      const e = this.lumens[k];
      if (!e || !e.lit) return;
      e.lit = false; e.cd = repopMs;
      this.flag[e.i] = 2;
      this.px[e.i] = this.hx[e.i]; this.py[e.i] = this.hy[e.i];
      this.vx[e.i] = 0; this.vy[e.i] = 0;
    }
    // décompte des repop ; rallume les lumens prêts
    tickLumens(dt, pickRar) {
      for (const e of this.lumens) {
        if (e.lit) continue;
        e.cd -= dt;
        if (e.cd <= 0) { e.lit = true; e.rar = pickRar(); this.flag[e.i] = 1; }
      }
    }
    clearLumens() {
      for (const e of this.lumens) this.flag[e.i] = 0;
      this.lumens.length = 0;
    }

    // Rendu « glow par proximité au pôle » (retour des grains calme et propre).
    // sources : pôles actifs {x,y,r} ; glow : intensité lumineuse (0..1).
    render(ctx, sources, glow) {
      const { px, py, hx, hy, n, flag } = this;
      glow = glow == null ? 0.7 : glow;
      const ns = sources ? sources.length : 0;
      const acc = this.accentStr || "52,224,206";
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < n; i++) {
        if (flag[i] === 2) continue;           // lumen éteint : pas de halo
        const x = px[i], y = py[i];
        let prox = 0;
        for (let s = 0; s < ns; s++) {
          const src = sources[s];
          const dx = src.x - x, dy = src.y - y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const p = src.r > 0 ? 1 - d / (src.r * 1.3) : 0;
          if (p > prox) prox = p;
        }
        if (prox < 0) prox = 0;
        const disp = Math.min(1, Math.hypot(x - hx[i], y - hy[i]) / 24);
        const a = 0.10 + prox * 0.6 * glow + disp * 0.15 * glow;
        const sz = 1 + prox * 1.7 + disp * 0.6;
        ctx.globalAlpha = a;
        ctx.fillStyle = prox > 0.04 ? "rgb(" + acc + ")" : "#46517d";
        ctx.beginPath(); ctx.arc(x, y, sz, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  AFK.GrainField = GrainField;
})();
