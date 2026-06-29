/* AFK Farm — logique de jeu : unités, pôles collecteurs, drones, récolte,
 * achat d'améliorations et progression hors-ligne. */
(function () {
  const AFK = (window.AFK = window.AFK || {});
  const { RARITIES, UPGRADES, cost } = AFK.config;

  const COLLECT_DIST = 16;      // distance de capture (px)
  const OFFLINE_CAP = 8 * 3600; // gains hors-ligne plafonnés à 8 h
  const DRONE_EFF = 0.7;        // captures/s estimées par drone (offline + HUD)

  class Game {
    constructor() {
      this.state = AFK.state.load();
      this.w = 0;
      this.h = 0;

      this.units = [];
      this.drones = [];
      this.poles = [];       // pôles posés au double-tap (façon Sensoria)
      this.particles = [];
      this.floats = [];

      this.pointer = { x: -9999, y: -9999, active: false };
      this.spawnTimer = 0;
      this.idleRate = 0;
      this.offlineGain = 0;

      this.applyUpgrades();
      this.syncDrones();
      this.computeOffline();
    }

    /* ---- valeurs dérivées des niveaux ---- */
    applyUpgrades() {
      const L = this.state.levels;
      this.pullRadius = UPGRADES[0].effect(L.radius);
      this.pullStrength = UPGRADES[1].effect(L.strength);
      this.maxUnits = UPGRADES[2].effect(L.density);
      this.valueMult = UPGRADES[3].effect(L.refine);
      this.droneCount = UPGRADES[4].effect(L.drones);
      this.luck = UPGRADES[5].effect(L.luck);
      this.idleRate = this.computeIdleRate();
    }

    /* poids des raretés modulé par la polarité (luck) */
    rarityWeights() {
      const boost = 1 + this.luck * 0.18;
      return RARITIES.map((r) =>
        r.key === "common" ? r.weight : r.weight * boost
      );
    }

    computeIdleRate() {
      const w = this.rarityWeights();
      let tot = 0, val = 0;
      for (let i = 0; i < RARITIES.length; i++) {
        tot += w[i];
        val += w[i] * RARITIES[i].value;
      }
      const avg = (val / tot) * this.valueMult;
      return this.droneCount * DRONE_EFF * avg;
    }

    pickRarity() {
      const w = this.rarityWeights();
      let tot = 0;
      for (let i = 0; i < w.length; i++) tot += w[i];
      let roll = Math.random() * tot;
      for (let i = 0; i < w.length; i++) {
        roll -= w[i];
        if (roll <= 0) return RARITIES[i];
      }
      return RARITIES[0];
    }

    /* ---- dimensionnement ---- */
    resize(w, h) {
      this.w = w;
      this.h = h;
      if (this.drones.length) this.syncDrones(true);
    }

    syncDrones(reposition) {
      const want = this.droneCount;
      while (this.drones.length < want) {
        const a = Math.random() * Math.PI * 2;
        this.drones.push({
          x: this.w / 2 + Math.cos(a) * 80,
          y: this.h / 2 + Math.sin(a) * 80,
          vx: 0,
          vy: 0,
          phase: Math.random() * Math.PI * 2,
        });
      }
      if (this.drones.length > want) this.drones.length = want;
      if (reposition) {
        for (const d of this.drones) {
          d.x = Math.max(20, Math.min(this.w - 20, d.x));
          d.y = Math.max(20, Math.min(this.h - 20, d.y));
        }
      }
    }

    /* ---- progression hors-ligne ---- */
    computeOffline() {
      const elapsed = (Date.now() - this.state.lastSave) / 1000;
      if (elapsed < 30 || this.idleRate <= 0) {
        this.offlineGain = 0;
        return;
      }
      const sec = Math.min(elapsed, OFFLINE_CAP);
      const gain = this.idleRate * sec;
      this.state.lumens += gain;
      this.offlineGain = gain;
      this.offlineSeconds = sec;
    }

    spawnUnit(atEdge) {
      const rar = this.pickRarity();
      const m = 30;
      const x = m + Math.random() * (this.w - 2 * m);
      const y = m + Math.random() * (this.h - 2 * m);
      const a = Math.random() * Math.PI * 2;
      const sp = 0.01 + Math.random() * 0.02;
      this.units.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        rar,
        wob: Math.random() * Math.PI * 2,
        born: performance.now(),
      });
    }

    /* sources qui courbent le champ de grains (pointeur + pôles + drones) */
    grainSources() {
      const out = [];
      if (this.pointer.active) {
        out.push({ x: this.pointer.x, y: this.pointer.y, r: this.pullRadius * 1.15, strength: this.pullStrength * 0.5 });
      }
      for (const p of this.poles) {
        out.push({ x: p.x, y: p.y, r: this.pullRadius, strength: this.pullStrength * 0.5 * (p.life / p.maxLife) });
      }
      for (const d of this.drones) {
        out.push({ x: d.x, y: d.y, r: this.pullRadius * 0.85, strength: this.pullStrength * 0.35 });
      }
      return out;
    }

    /* collecteurs d'unités (pointeur + pôles + drones) */
    collectors() {
      const out = [];
      if (this.pointer.active) {
        out.push({ x: this.pointer.x, y: this.pointer.y, r: this.pullRadius, k: 1, kind: "pointer" });
      }
      for (const p of this.poles) {
        out.push({ x: p.x, y: p.y, r: this.pullRadius, k: 1, kind: "pole" });
      }
      for (const d of this.drones) {
        out.push({ x: d.x, y: d.y, r: this.pullRadius * 0.9, k: 1, kind: "drone" });
      }
      return out;
    }

    addPole(x, y) {
      if (this.poles.length >= 6) this.poles.shift(); // max 6 (homage Sensoria)
      this.poles.push({ x, y, life: 11000, maxLife: 11000 });
    }

    collect(unit, sx, sy) {
      const amt = unit.rar.value * this.valueMult;
      this.state.lumens += amt;
      this.state.totalCollected += 1;
      this.floats.push({
        x: unit.x, y: unit.y, vy: -0.04,
        text: "+" + AFK.state.fmt(amt),
        color: unit.rar.glow, life: 900, max: 900,
      });
      const count = unit.rar.key === "legendary" ? 16 : unit.rar.key === "epic" ? 10 : 6;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 0.05 + Math.random() * 0.18;
        this.particles.push({
          x: unit.x, y: unit.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 520, max: 520, color: unit.rar.glow,
        });
      }
    }

    update(dt) {
      const ddt = Math.min(dt, 50);

      // apparition d'unités jusqu'au plafond
      this.spawnTimer -= ddt;
      if (this.units.length < this.maxUnits && this.spawnTimer <= 0) {
        this.spawnUnit();
        this.spawnTimer = 180;
      }

      const cols = this.collectors();

      // pôles posés : déclin
      for (let i = this.poles.length - 1; i >= 0; i--) {
        this.poles[i].life -= ddt;
        if (this.poles[i].life <= 0) this.poles.splice(i, 1);
      }

      // drones : chassent l'unité la plus proche, sinon errent
      for (const d of this.drones) {
        let best = null, bd = Infinity;
        for (const u of this.units) {
          const dx = u.x - d.x, dy = u.y - d.y;
          const dist = dx * dx + dy * dy;
          if (dist < bd) { bd = dist; best = u; }
        }
        let tx, ty;
        if (best) {
          tx = best.x; ty = best.y;
        } else {
          d.phase += ddt * 0.001;
          tx = this.w / 2 + Math.cos(d.phase) * this.w * 0.3;
          ty = this.h / 2 + Math.sin(d.phase * 1.3) * this.h * 0.3;
        }
        const dx = tx - d.x, dy = ty - d.y;
        const dl = Math.hypot(dx, dy) + 0.001;
        const acc = 0.0006;
        d.vx += (dx / dl) * acc * ddt;
        d.vy += (dy / dl) * acc * ddt;
        const sp = Math.hypot(d.vx, d.vy);
        const maxv = 0.55;
        if (sp > maxv) { d.vx = d.vx / sp * maxv; d.vy = d.vy / sp * maxv; }
        d.x += d.vx * ddt;
        d.y += d.vy * ddt;
      }

      // unités : dérive + attraction des collecteurs + capture
      for (let i = this.units.length - 1; i >= 0; i--) {
        const u = this.units[i];
        u.wob += ddt * 0.003;
        let captured = false;
        for (const c of cols) {
          const dx = c.x - u.x, dy = c.y - u.y;
          const d = Math.hypot(dx, dy) + 0.001;
          if (d < COLLECT_DIST) {
            this.collect(u, c.x, c.y);
            this.units.splice(i, 1);
            captured = true;
            break;
          }
          if (d < c.r) {
            const f = this.pullStrength * (1 - d / c.r) * 0.012;
            u.vx += (dx / d) * f * ddt;
            u.vy += (dy / d) * f * ddt;
          }
        }
        if (captured) continue;

        u.x += u.vx * ddt;
        u.y += u.vy * ddt;
        // amortissement léger + dérive de fond
        u.vx *= 0.94;
        u.vy *= 0.94;
        // rebond sur les bords
        const m = 14;
        if (u.x < m) { u.x = m; u.vx = Math.abs(u.vx) + 0.01; }
        if (u.x > this.w - m) { u.x = this.w - m; u.vx = -Math.abs(u.vx) - 0.01; }
        if (u.y < m) { u.y = m; u.vy = Math.abs(u.vy) + 0.01; }
        if (u.y > this.h - m) { u.y = this.h - m; u.vy = -Math.abs(u.vy) - 0.01; }
      }

      // particules
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= ddt;
        if (p.life <= 0) { this.particles.splice(i, 1); continue; }
        p.x += p.vx * ddt;
        p.y += p.vy * ddt;
        p.vx *= 0.96;
        p.vy *= 0.96;
      }

      // textes flottants
      for (let i = this.floats.length - 1; i >= 0; i--) {
        const f = this.floats[i];
        f.life -= ddt;
        if (f.life <= 0) { this.floats.splice(i, 1); continue; }
        f.y += f.vy * ddt;
      }
    }

    /* ---- achat ---- */
    buy(id) {
      const idx = UPGRADES.findIndex((u) => u.id === id);
      if (idx < 0) return false;
      const up = UPGRADES[idx];
      const lvl = this.state.levels[id];
      if (lvl >= up.max) return false;
      const c = cost(up, lvl);
      if (this.state.lumens < c) return false;
      this.state.lumens -= c;
      this.state.levels[id] = lvl + 1;
      this.applyUpgrades();
      if (id === "drones") this.syncDrones();
      return true;
    }

    reset() {
      this.state = AFK.state.defaultState();
      this.units.length = 0;
      this.poles.length = 0;
      this.particles.length = 0;
      this.floats.length = 0;
      this.applyUpgrades();
      this.syncDrones();
      AFK.state.wipe();
    }
  }

  AFK.Game = Game;
})();
