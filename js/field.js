/* AFK Farm — champ de grains magnétique (inspiré de Sensoria / MagneticScene).
 *
 * Des milliers de grains sont disposés en lattice. Un ressort les ramène vers
 * leur position d'origine ; chaque pôle (pointeur, drone, pôle posé) applique
 * une attraction en 1/distance plafonnée. Les grains dessinent les lignes de
 * champ via une traînée orientée le long de leur vecteur vitesse.
 */
(function () {
  const AFK = (window.AFK = window.AFK || {});

  const SPRING = 0.0011;     // rappel vers la position d'origine
  const DAMP_TAU = 150;      // amortissement (ms) — constante de temps
  const MAX_ACCEL = 0.03;    // plafond d'accélération (stabilité)
  const BUCKETS = 6;         // paliers de couleur selon la vitesse
  const TAIL = 14;           // longueur de la traînée (lignes de champ)
  const MAX_SPEED = 0.5;     // vitesse de référence pour le binning couleur

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
      this.setTheme("#22d3ee", "#d946ef");
    }

    // dégradé c1 -> c2, alpha croissant avec la vitesse (recoloré par biome)
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
      this.cols = cols;
      this.rows = rows;
      this.n = n;
      this.hx = new Float32Array(n);
      this.hy = new Float32Array(n);
      this.px = new Float32Array(n);
      this.py = new Float32Array(n);
      this.vx = new Float32Array(n);
      this.vy = new Float32Array(n);
      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * sp;
          const y = r * sp;
          this.hx[i] = x; this.hy[i] = y;
          this.px[i] = x; this.py[i] = y;
          i++;
        }
      }
    }

    simulate(dt, sources) {
      dt = Math.min(dt, 40);
      const damp = Math.exp(-dt / DAMP_TAU);
      const { hx, hy, px, py, vx, vy, n } = this;
      const ns = sources.length;
      for (let i = 0; i < n; i++) {
        let ax = (hx[i] - px[i]) * SPRING;
        let ay = (hy[i] - py[i]) * SPRING;
        for (let s = 0; s < ns; s++) {
          const src = sources[s];
          const dx = src.x - px[i];
          const dy = src.y - py[i];
          const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
          if (d < src.r) {
            const f = (src.strength * (1 - d / src.r)) / d;
            ax += dx * f;
            ay += dy * f;
          }
        }
        const am = Math.hypot(ax, ay);
        if (am > MAX_ACCEL) {
          const k = MAX_ACCEL / am;
          ax *= k; ay *= k;
        }
        vx[i] = (vx[i] + ax * dt) * damp;
        vy[i] = (vy[i] + ay * dt) * damp;
        px[i] += vx[i] * dt;
        py[i] += vy[i] * dt;
      }
    }

    render(ctx) {
      const { px, py, vx, vy, n, bucketColors } = this;

      // grains au repos : fines particules du lattice
      ctx.fillStyle = "rgba(120,140,220,0.16)";
      for (let i = 0; i < n; i++) {
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
          const x = px[i], y = py[i];
          ctx.moveTo(x, y);
          ctx.lineTo(x - vx[i] * TAIL, y - vy[i] * TAIL);
          drew = true;
        }
        if (drew) ctx.stroke();
      }
    }
  }

  AFK.GrainField = GrainField;
})();
