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

    setTheme(c1, c2) {
      const a1 = hex2rgb(c1), a2 = hex2rgb(c2);
      const c = [];
      for (let b = 0; b < BUCKETS; b++) {
        const t = b / (BUCKETS - 1);
        const r = Math.round(a1[0] + t * (a2[0] - a1[0]));
        const g = Math.round(a1[1] + t * (a2[1] - a1[1]));
        const bl = Math.round(a1[2] + t * (a2[2] - a1[2]));
        const a = (0.16 + t * 0.62).toFixed(3);
        c.push(`rgba(${r},${g},${bl},${a})`);
      }
      this.bucketColors = c;
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

    render(ctx) {
      const { px, py, vx, vy, n, bucketColors, flag } = this;

      // grains au repos : fines particules du lattice
      ctx.fillStyle = "rgba(120,140,220,0.16)";
      for (let i = 0; i < n; i++) {
        if (flag[i] === 2) continue;
        const sp = vx[i] * vx[i] + vy[i] * vy[i];
        if (sp < 0.0004) ctx.fillRect(px[i] - 0.7, py[i] - 0.7, 1.4, 1.4);
      }

      // lignes de champ : traînée groupée par palier de vitesse
      ctx.lineWidth = 1.1;
      ctx.lineCap = "round";
      for (let b = 1; b < BUCKETS; b++) {
        ctx.strokeStyle = bucketColors[b];
        ctx.beginPath();
        let drew = false;
        for (let i = 0; i < n; i++) {
          const speed = Math.hypot(vx[i], vy[i]);
          if (speed < 0.02) continue;
          let bk = (speed / MAX_SPEED * BUCKETS) | 0;
          if (bk >= BUCKETS) bk = BUCKETS - 1;
          if (bk !== b) continue;
          ctx.moveTo(px[i], py[i]);
          ctx.lineTo(px[i] - vx[i] * TAIL, py[i] - vy[i] * TAIL);
          drew = true;
        }
        if (drew) ctx.stroke();
      }
    }
  }

  AFK.GrainField = GrainField;
})();
