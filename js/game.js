/* AFK Farm — moteur : économie corrélée, unités, drones, chaîne de projets,
 * biomes, arbre de compétences et prestige. */
(function () {
  const AFK = (window.AFK = window.AFK || {});
  const C = AFK.config;
  const { CONST, RARITIES } = C;

  class Game {
    constructor() {
      this.state = AFK.state.load();
      this.tree = AFK.tree.build();
      this.w = 0; this.h = 0;

      this.units = [];
      this.drones = [];
      this.poles = [];
      this.particles = [];
      this.floats = [];

      this.pointer = { x: -9999, y: -9999, active: false };
      this.spawnTimer = 0;
      this.idleRate = 0;
      this.offlineGain = 0;
      this.offlineSeconds = 0;
      this.toasts = [];           // file de notifications pour l'UI

      this.applyStats();
      this.syncDrones();
      this.computeOffline();
    }

    /* ---------- agrégation des stats (tout est corrélé ici) ---------- */
    applyStats() {
      const st = this.state;
      const ts = AFK.tree.aggregate(this.tree, st.nodes);

      // perks de prestige
      const perkLvl = (id) => st.perks[id] || 0;
      const perk = (id) => C.PERKS.find((p) => p.id === id);
      const memoryVal = perk("memory").val(perkLvl("memory"));
      const fleetVal = perk("fleet").val(perkLvl("fleet"));

      // multiplicateurs
      this.biomeMult = C.biomeMult(st.biome);
      this.projectMult = this.computeProjectMult();
      this.prestigeMult = 1 + st.cores * CONST.CORE_MULT + memoryVal;
      this.treeValue = 1 + ts.value;

      this.incomeMult =
        this.biomeMult * this.treeValue * this.projectMult * this.prestigeMult;

      // stats dérivées
      this.pullRadius = Math.max(60, 130 * (1 + ts.radius));
      this.pullStrength = 0.55 * (1 + ts.strength);
      this.maxUnits = Math.round(26 + ts.density);
      this.luck = ts.luck;
      this.dronePowerMult = 1 + ts.dronePower;
      this.buildSpeed = 1 + ts.build;
      this.droneCount = ts.drones + fleetVal;

      this.idleRate = this.computeIdleRate();
    }

    computeProjectMult() {
      let m = 1;
      for (let i = 0; i < this.state.projectIndex; i++) m *= C.project(i).mult;
      return m;
    }

    rarityWeights() {
      const boost = 1 + this.luck * 0.16;
      return RARITIES.map((r) => (r.key === "common" ? r.weight : r.weight * boost));
    }

    avgUnitValue() {
      const w = this.rarityWeights();
      let tot = 0, val = 0;
      for (let i = 0; i < RARITIES.length; i++) { tot += w[i]; val += w[i] * RARITIES[i].value; }
      return val / tot;
    }

    computeIdleRate() {
      return this.droneCount * CONST.DRONE_EFF * this.dronePowerMult *
        this.avgUnitValue() * this.incomeMult;
    }

    /* ---------- monnaie ---------- */
    addLumens(a) {
      this.state.lumens += a;
      this.state.totalRun += a;
      this.state.totalEver += a;
    }

    /* ---------- arbre ---------- */
    allocatedCount() { return Object.keys(this.state.nodes).length - 1; }
    nodeCost(node) {
      return Math.ceil(CONST.TREE_BASE_COST * Math.pow(CONST.TREE_GROWTH, this.allocatedCount()) * node.costMult);
    }
    allocate(id) {
      if (!AFK.tree.canAllocate(this.tree, this.state.nodes, id)) return false;
      const node = this.tree.byId.get(id);
      const cost = this.nodeCost(node);
      if (this.state.lumens < cost) return false;
      this.state.lumens -= cost;
      this.state.nodes[id] = 1;
      this.applyStats();
      this.syncDrones();
      return true;
    }

    /* ---------- projets (chaîne AFK) ---------- */
    currentProject() { return C.project(this.state.projectIndex); }
    projectState(p) {
      const m = this.state.projects;
      if (!m[p.id]) m[p.id] = { p: 0, building: false };
      return m[p.id];
    }
    projectTime(p) { return p.time / this.buildSpeed; }
    fundProject() {
      const p = this.currentProject();
      const ps = this.projectState(p);
      if (ps.building || this.state.lumens < p.cost) return false;
      this.state.lumens -= p.cost;
      ps.building = true;
      return true;
    }
    tickProjects(dtSec) {
      const p = this.currentProject();
      const ps = this.projectState(p);
      if (!ps.building) return;
      ps.p += dtSec;
      if (ps.p >= this.projectTime(p)) this.completeProject(p, ps);
    }
    completeProject(p, ps) {
      ps.building = false;
      ps.done = true;
      ps.p = 0;
      this.state.projectIndex += 1;
      this.state.biome = this.state.projectIndex;
      if (this.state.biome > this.state.bestBiome) this.state.bestBiome = this.state.biome;
      this.applyStats();
      this.toasts.push({
        kind: "project",
        title: p.icon + " " + p.name + " terminé !",
        body: "Biome débloqué : " + C.biome(this.state.biome).name +
          " · revenu ×" + AFK.state.fmt(C.CONST.BIOME_MULT) + " · bonus ×" + p.mult.toFixed(1),
      });
    }

    /* ---------- prestige ---------- */
    coreGain() {
      return Math.floor(Math.sqrt(this.state.totalRun / CONST.PRESTIGE_DIV));
    }
    canPrestige() { return this.state.projectIndex >= 2 || this.state.totalRun >= 5e5; }
    prestige() {
      const gain = this.coreGain();
      if (gain < 1 && this.state.prestiges === 0 && !this.canPrestige()) return false;
      const st = this.state;
      const residue = C.PERKS.find((p) => p.id === "residue").val(st.perks.residue || 0);
      const kept = st.lumens * residue;
      st.cores += gain;
      st.prestiges += 1;
      st.lumens = kept;
      st.totalRun = 0;
      st.biome = 0;
      st.projectIndex = 0;
      st.projects = {};
      st.nodes = { core: 1 };
      this.units.length = 0;
      this.poles.length = 0;
      this.applyStats();
      this.syncDrones(true);
      this.toasts.push({ kind: "prestige", title: "🌌 Singularité atteinte", body: "+" + gain + " ◆ Cores" });
      return true;
    }
    buyPerk(id) {
      const perk = C.PERKS.find((p) => p.id === id);
      const lvl = this.state.perks[id] || 0;
      if (lvl >= perk.max) return false;
      const cost = C.perkCost(perk, lvl);
      if (this.state.cores < cost) return false;
      this.state.cores -= cost;
      this.state.perks[id] = lvl + 1;
      this.applyStats();
      this.syncDrones();
      return true;
    }

    /* ---------- drones ---------- */
    syncDrones(reposition) {
      const want = Math.min(this.droneCount, 40);
      while (this.drones.length < want) {
        const a = Math.random() * Math.PI * 2;
        this.drones.push({
          x: this.w / 2 + Math.cos(a) * 90, y: this.h / 2 + Math.sin(a) * 90,
          vx: 0, vy: 0, phase: Math.random() * Math.PI * 2,
        });
      }
      if (this.drones.length > want) this.drones.length = want;
      if (reposition) for (const d of this.drones) {
        d.x = Math.max(20, Math.min(this.w - 20, d.x));
        d.y = Math.max(20, Math.min(this.h - 20, d.y));
      }
    }

    /* ---------- hors-ligne ---------- */
    offlineCap() {
      const warp = C.PERKS.find((p) => p.id === "warp").val(this.state.perks.warp || 0);
      return CONST.OFFLINE_CAP_BASE + warp;
    }
    computeOffline() {
      const elapsed = (Date.now() - this.state.lastSave) / 1000;
      // les projets en construction avancent hors-ligne
      const p = this.currentProject();
      const ps = this.projectState(p);
      if (ps.building) {
        ps.p += elapsed;
        if (ps.p >= this.projectTime(p)) this.completeProject(p, ps);
      }
      if (elapsed < 30 || this.idleRate <= 0) { this.offlineGain = 0; return; }
      const sec = Math.min(elapsed, this.offlineCap());
      const gain = this.idleRate * sec;
      this.addLumens(gain);
      this.offlineGain = gain;
      this.offlineSeconds = sec;
    }

    /* ---------- dimensionnement ---------- */
    resize(w, h) { this.w = w; this.h = h; if (this.drones.length) this.syncDrones(true); }

    /* ---------- unités ---------- */
    pickRarity() {
      const w = this.rarityWeights();
      let tot = 0; for (let i = 0; i < w.length; i++) tot += w[i];
      let roll = Math.random() * tot;
      for (let i = 0; i < w.length; i++) { roll -= w[i]; if (roll <= 0) return RARITIES[i]; }
      return RARITIES[0];
    }
    spawnUnit() {
      const rar = this.pickRarity();
      const m = 34;
      const a = Math.random() * Math.PI * 2;
      const sp = 0.01 + Math.random() * 0.02;
      this.units.push({
        x: m + Math.random() * (this.w - 2 * m),
        y: m + Math.random() * (this.h - 2 * m),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        rar, wob: Math.random() * Math.PI * 2,
      });
    }

    grainSources() {
      const out = [];
      const gs = this.pullStrength * 0.5;
      if (this.pointer.active) out.push({ x: this.pointer.x, y: this.pointer.y, r: this.pullRadius * 1.15, strength: gs });
      for (const p of this.poles) out.push({ x: p.x, y: p.y, r: this.pullRadius, strength: gs * (p.life / p.maxLife) });
      for (const d of this.drones) out.push({ x: d.x, y: d.y, r: this.pullRadius * 0.85, strength: gs * 0.7 });
      return out;
    }
    collectors() {
      const out = [];
      if (this.pointer.active) out.push({ x: this.pointer.x, y: this.pointer.y, r: this.pullRadius });
      for (const p of this.poles) out.push({ x: p.x, y: p.y, r: this.pullRadius });
      for (const d of this.drones) out.push({ x: d.x, y: d.y, r: this.pullRadius * 0.9 });
      return out;
    }
    addPole(x, y) {
      if (this.poles.length >= 6) this.poles.shift();
      this.poles.push({ x, y, life: 11000, maxLife: 11000 });
    }

    collect(u) {
      const amt = u.rar.value * this.incomeMult;
      this.addLumens(amt);
      this.state.collected += 1;
      this.floats.push({ x: u.x, y: u.y, vy: -0.04, text: "+" + AFK.state.fmt(amt), color: u.rar.glow, life: 900, max: 900 });
      const n = u.rar.key === "legendary" ? 16 : u.rar.key === "epic" ? 10 : 6;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 0.05 + Math.random() * 0.18;
        this.particles.push({ x: u.x, y: u.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 520, max: 520, color: u.rar.glow });
      }
    }

    update(dt) {
      const ddt = Math.min(dt, 50);
      this.tickProjects(ddt / 1000);

      this.spawnTimer -= ddt;
      if (this.units.length < this.maxUnits && this.spawnTimer <= 0) { this.spawnUnit(); this.spawnTimer = 170; }

      const cols = this.collectors();

      for (let i = this.poles.length - 1; i >= 0; i--) {
        this.poles[i].life -= ddt;
        if (this.poles[i].life <= 0) this.poles.splice(i, 1);
      }

      // drones : chassent l'unité la plus proche
      for (const d of this.drones) {
        let best = null, bd = Infinity;
        for (const u of this.units) {
          const dx = u.x - d.x, dy = u.y - d.y, dist = dx * dx + dy * dy;
          if (dist < bd) { bd = dist; best = u; }
        }
        let tx, ty;
        if (best) { tx = best.x; ty = best.y; }
        else { d.phase += ddt * 0.001; tx = this.w / 2 + Math.cos(d.phase) * this.w * 0.3; ty = this.h / 2 + Math.sin(d.phase * 1.3) * this.h * 0.3; }
        const dx = tx - d.x, dy = ty - d.y, dl = Math.hypot(dx, dy) + 0.001;
        const acc = 0.0006 * this.dronePowerMult;
        d.vx += (dx / dl) * acc * ddt; d.vy += (dy / dl) * acc * ddt;
        const sp = Math.hypot(d.vx, d.vy), maxv = 0.5 + 0.25 * this.dronePowerMult;
        if (sp > maxv) { d.vx = d.vx / sp * maxv; d.vy = d.vy / sp * maxv; }
        d.x += d.vx * ddt; d.y += d.vy * ddt;
      }

      // unités
      for (let i = this.units.length - 1; i >= 0; i--) {
        const u = this.units[i];
        u.wob += ddt * 0.003;
        let captured = false;
        for (const c of cols) {
          const dx = c.x - u.x, dy = c.y - u.y, d = Math.hypot(dx, dy) + 0.001;
          if (d < CONST.COLLECT_DIST) { this.collect(u); this.units.splice(i, 1); captured = true; break; }
          if (d < c.r) { const f = this.pullStrength * (1 - d / c.r) * 0.012; u.vx += (dx / d) * f * ddt; u.vy += (dy / d) * f * ddt; }
        }
        if (captured) continue;
        u.x += u.vx * ddt; u.y += u.vy * ddt;
        u.vx *= 0.94; u.vy *= 0.94;
        const m = 14;
        if (u.x < m) { u.x = m; u.vx = Math.abs(u.vx) + 0.01; }
        if (u.x > this.w - m) { u.x = this.w - m; u.vx = -Math.abs(u.vx) - 0.01; }
        if (u.y < m) { u.y = m; u.vy = Math.abs(u.vy) + 0.01; }
        if (u.y > this.h - m) { u.y = this.h - m; u.vy = -Math.abs(u.vy) - 0.01; }
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= ddt;
        if (p.life <= 0) { this.particles.splice(i, 1); continue; }
        p.x += p.vx * ddt; p.y += p.vy * ddt; p.vx *= 0.96; p.vy *= 0.96;
      }
      for (let i = this.floats.length - 1; i >= 0; i--) {
        const f = this.floats[i];
        f.life -= ddt;
        if (f.life <= 0) { this.floats.splice(i, 1); continue; }
        f.y += f.vy * ddt;
      }
    }

    reset() {
      AFK.state.wipe();
      this.state = AFK.state.defaultState();
      this.units.length = 0; this.poles.length = 0; this.particles.length = 0; this.floats.length = 0;
      this.applyStats(); this.syncDrones(true);
    }
  }

  AFK.Game = Game;
})();
