/* AFK Farm — moteur : économie corrélée, session de récolte active
 * (énergie / temps / stockage), drones AFK, chaîne de projets multi-pièces,
 * biomes, arbre de compétences et prestige. */
(function () {
  const AFK = (window.AFK = window.AFK || {});
  const C = AFK.config;
  const { CONST, RARITIES } = C;
  const fmt = AFK.state.fmt;

  class Game {
    constructor() {
      this.state = AFK.state.load();
      this.tree = AFK.tree.build();
      this.field = null;             // grille magnétique (branchée par main)
      this.w = 0; this.h = 0;

      this.drones = [];
      this.poles = [];
      this.particles = [];
      this.floats = [];

      this.pointer = { x: -9999, y: -9999, active: false };
      this.fieldActive = true;       // l'écran de récolte est-il visible ?
      this.session = { harvesting: false, timer: 0, storage: 0, storageValue: 0 };

      // combo (récompense les récoltes enchaînées) + surge + juice
      this.combo = { count: 0, mult: 1, timer: 0 };
      this.surgeState = { active: 0, cd: 0, dur: 3, cdMax: 12, cost: 25 };
      this.surgeBoost = 1;
      this.shake = 0;
      this.surgeRing = 0;
      this._sndT = 0;
      this._achT = 0;
      this._droneBudget = 0;   // débit de récolte des drones

      this.idleRate = 0;
      this.offlineGain = 0;
      this.offlineSeconds = 0;
      this.toasts = [];

      if (!this.state.stats) this.state.stats = { sessions: 0, surges: 0, comboMax: 0 };
      if (!this.state.achievements) this.state.achievements = {};

      this.applyStats();
      this.syncDrones();
      this.computeOffline();
    }

    get stats() { return this.state.stats; }
    snd(name, a) { if (AFK.audio) AFK.audio[name] && AFK.audio[name](a); }
    addShake(a) { this.shake = Math.min(22, Math.max(this.shake, a)); }

    /* ---------- agrégation des stats (tout est corrélé ici) ---------- */
    applyStats() {
      const st = this.state;
      const ts = AFK.tree.aggregate(this.tree, st.nodes);
      const S = CONST.SESSION;

      const perkLvl = (id) => st.perks[id] || 0;
      const perk = (id) => C.PERKS.find((p) => p.id === id);
      const memoryVal = perk("memory").val(perkLvl("memory"));
      const fleetVal = perk("fleet").val(perkLvl("fleet"));

      this.biomeMult = C.biomeMult(st.biome);
      this.projectMult = this.computeProjectMult();
      this.prestigeMult = 1 + st.cores * CONST.CORE_MULT + memoryVal;
      this.treeValue = 1 + ts.value;
      this.achievementMult = AFK.achievements ? 1 + AFK.achievements.unlockedCount(st) * AFK.achievements.BONUS : 1;
      this.incomeMult = this.biomeMult * this.treeValue * this.projectMult * this.prestigeMult * this.achievementMult;

      this.pullRadius = Math.max(60, 130 * (1 + ts.radius));
      this.pullStrength = 0.55 * (1 + ts.strength);
      // conductivité (density) = grille plus grande + repop plus rapide
      this.lumenCount = Math.min(140, CONST.LUMEN_COUNT + Math.round(ts.density * 2));
      this.repopDelay = Math.max(600, CONST.REPOP_BASE - ts.density * 120);
      this.luck = ts.luck;
      this.dronePowerMult = 1 + ts.dronePower;
      this.buildSpeed = 1 + ts.build;
      this.droneCount = ts.drones + fleetVal;

      // session active
      this.energyMax = S.ENERGY_MAX + ts.energy;
      this.energyRegen = S.ENERGY_REGEN + ts.regen;
      this.energyDrain = S.ENERGY_DRAIN / (1 + ts.efficiency);
      this.sessionTime = S.TIME + ts.time;
      this.storageMax = Math.round(S.STORAGE + ts.storage); // soute en nombre de lumens
      if (st.energy > this.energyMax) st.energy = this.energyMax;

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
      return this.droneCount * CONST.DRONE_EFF * this.dronePowerMult * this.avgUnitValue() * this.incomeMult;
    }

    addLumens(a) { this.state.lumens += a; this.state.totalRun += a; this.state.totalEver += a; }

    /* ---------- arbre ---------- */
    allocatedCount() { return Object.keys(this.state.nodes).length - 1; }
    nodeCost(node) { return Math.ceil(CONST.TREE_BASE_COST * Math.pow(CONST.TREE_GROWTH, this.allocatedCount()) * node.costMult); }
    allocate(id) {
      if (!AFK.tree.canAllocate(this.tree, this.state.nodes, id)) return false;
      const node = this.tree.byId.get(id);
      const cost = this.nodeCost(node);
      if (this.state.lumens < cost) return false;
      this.state.lumens -= cost;
      this.state.nodes[id] = 1;
      this.applyStats();
      this.syncDrones();
      this.snd("buy");
      return true;
    }

    /* ---------- session de récolte active ---------- */
    startHarvest() {
      if (this.session.harvesting || this.state.energy < 1) return false;
      this.session.harvesting = true;
      this.session.timer = this.sessionTime;
      this.session.storage = 0;
      this.session.storageValue = 0;
      return true;
    }
    endHarvest(reason) {
      const s = this.session;
      if (!s.harvesting) return;
      s.harvesting = false;
      const banked = s.storageValue;
      this.addLumens(banked);
      this.pointer.active = false;
      this.combo.count = 0; this.combo.mult = 1; this.combo.timer = 0;
      this.surgeState.active = 0;
      this.state.stats.sessions += 1;
      this.addShake(6);
      this.snd("bank", banked > 0 && s.storage >= this.storageMax);
      const why = reason === "energy" ? "Énergie épuisée" : reason === "time" ? "Temps écoulé" : reason === "full" ? "Soute pleine" : "Terminée";
      this.toasts.push({ kind: "bank", title: "📦 Stock encaissé", body: why + " · +" + fmt(banked) + " ✦" });
      s.storage = 0; s.storageValue = 0;
    }
    triggerSurge() {
      const ss = this.surgeState;
      if (!this.harvestActive() || ss.cd > 0 || this.state.energy < ss.cost) { this.snd("error"); return false; }
      this.state.energy -= ss.cost;
      ss.active = ss.dur; ss.cd = ss.cdMax;
      this.surgeRing = 1;
      this.state.stats.surges += 1;
      this.addShake(9);
      this.snd("surge");
      return true;
    }
    _checkAch() {
      if (!AFK.achievements) return;
      const got = AFK.achievements.check(this);
      if (!got.length) return;
      for (const a of got)
        this.toasts.push({ kind: "achiev", title: a.icon + " " + a.name, body: a.desc + " · +" + Math.round(AFK.achievements.BONUS * 100) + "% revenu" });
      this.applyStats();
      this.snd("achievement");
    }
    tickSession(dtSec) {
      const s = this.session;
      if (s.harvesting && this.fieldActive) {
        this.state.energy -= this.energyDrain * dtSec;
        s.timer -= dtSec;
        if (this.state.energy <= 0) { this.state.energy = 0; this.endHarvest("energy"); }
        else if (s.timer <= 0) { s.timer = 0; this.endHarvest("time"); }
      } else if (!s.harvesting) {
        this.state.energy = Math.min(this.energyMax, this.state.energy + this.energyRegen * dtSec);
      }
    }

    /* ---------- projets multi-pièces (chaîne AFK) ---------- */
    currentProject() { return C.project(this.state.projectIndex); }
    projectState(p) {
      const m = this.state.projects;
      if (!m[p.id]) m[p.id] = { pi: 0, p: 0, building: false };
      return m[p.id];
    }
    currentPart(p, ps) { ps = ps || this.projectState(p); return p.parts[ps.pi]; }
    partTime(part) { return part.time / this.buildSpeed; }
    fundPart() {
      const p = this.currentProject(), ps = this.projectState(p);
      if (ps.pi >= p.parts.length || ps.building) return false;
      const part = p.parts[ps.pi];
      if (this.state.lumens < part.cost) return false;
      this.state.lumens -= part.cost;
      ps.building = true;
      this.snd("buy");
      return true;
    }
    tickProjects(dtSec) {
      const p = this.currentProject(), ps = this.projectState(p);
      if (!ps.building) return;
      ps.p += dtSec;
      const part = p.parts[ps.pi];
      if (ps.p >= this.partTime(part)) this.completePart(p, ps, part);
    }
    completePart(p, ps, part) {
      ps.building = false; ps.p = 0; ps.pi += 1;
      if (ps.pi >= p.parts.length) {
        this.completeProject(p);
      } else {
        this.addShake(7); this.snd("part");
        this.toasts.push({ kind: "part", title: part.icon + " " + part.name + " réparé",
          body: p.name + " · pièce " + ps.pi + "/" + p.parts.length });
      }
    }
    completeProject(p) {
      this.state.projectIndex += 1;
      this.state.biome = this.state.projectIndex;
      if (this.state.biome > this.state.bestBiome) this.state.bestBiome = this.state.biome;
      this.applyStats();
      this.addShake(13); this.snd("project");
      this.toasts.push({ kind: "project", title: p.icon + " " + p.name + " achevé !",
        body: "Biome débloqué : " + C.biome(this.state.biome).name + " · revenu ×" + fmt(CONST.BIOME_MULT) + " · bonus ×" + p.mult.toFixed(1) });
    }

    /* ---------- prestige ---------- */
    coreGain() { return Math.floor(Math.sqrt(this.state.totalRun / CONST.PRESTIGE_DIV)); }
    canPrestige() { return this.state.projectIndex >= 2 || this.state.totalRun >= 5e5; }
    prestige() {
      const gain = this.coreGain();
      if (!this.canPrestige()) return false;
      const st = this.state;
      const residue = C.PERKS.find((p) => p.id === "residue").val(st.perks.residue || 0);
      const kept = st.lumens * residue;
      st.cores += gain; st.prestiges += 1;
      st.lumens = kept; st.totalRun = 0;
      st.biome = 0; st.projectIndex = 0; st.projects = {};
      st.nodes = { core: 1 };
      this.poles.length = 0;
      this.session.harvesting = false; this.session.storage = 0; this.session.storageValue = 0;
      this.applyStats();
      this.seedGrid();
      st.energy = this.energyMax;
      this.syncDrones(true);
      this.addShake(16); this.snd("prestige");
      this.toasts.push({ kind: "prestige", title: "🌌 Singularité atteinte", body: "+" + gain + " ◆ Cores" });
      return true;
    }
    buyPerk(id) {
      const perk = C.PERKS.find((p) => p.id === id);
      const lvl = this.state.perks[id] || 0;
      if (lvl >= perk.max) return false;
      const cost = C.perkCost(perk, lvl);
      if (this.state.cores < cost) return false;
      this.state.cores -= cost; this.state.perks[id] = lvl + 1;
      this.applyStats(); this.syncDrones();
      this.snd("buy");
      return true;
    }

    /* ---------- drones ---------- */
    syncDrones(reposition) {
      const want = Math.min(this.droneCount, 40);
      while (this.drones.length < want) {
        const a = Math.random() * Math.PI * 2;
        this.drones.push({ x: this.w / 2 + Math.cos(a) * 90, y: this.h / 2 + Math.sin(a) * 90, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2 });
      }
      if (this.drones.length > want) this.drones.length = want;
      if (reposition) for (const d of this.drones) {
        d.x = Math.max(20, Math.min(this.w - 20, d.x)); d.y = Math.max(20, Math.min(this.h - 20, d.y));
      }
    }

    /* ---------- hors-ligne ---------- */
    offlineCap() {
      const warp = C.PERKS.find((p) => p.id === "warp").val(this.state.perks.warp || 0);
      return CONST.OFFLINE_CAP_BASE + warp;
    }
    computeOffline() {
      const elapsed = (Date.now() - this.state.lastSave) / 1000;
      // régénération d'énergie + avancement du projet en construction
      this.state.energy = Math.min(this.energyMax, this.state.energy + this.energyRegen * elapsed);
      const p = this.currentProject(), ps = this.projectState(p);
      if (ps.building) {
        ps.p += elapsed;
        const part = p.parts[ps.pi];
        if (part && ps.p >= this.partTime(part)) this.completePart(p, ps, part);
      }
      // revenu passif des drones (plafonné)
      if (elapsed < 30 || this.idleRate <= 0) { this.offlineGain = 0; return; }
      const sec = Math.min(elapsed, this.offlineCap());
      const gain = this.idleRate * sec;
      this.addLumens(gain);
      this.offlineGain = gain; this.offlineSeconds = sec;
    }

    resize(w, h) { this.w = w; this.h = h; if (this.drones.length) this.syncDrones(true); }

    /* ---------- unités ---------- */
    pickRarity() {
      const w = this.rarityWeights();
      let tot = 0; for (let i = 0; i < w.length; i++) tot += w[i];
      let roll = Math.random() * tot;
      for (let i = 0; i < w.length; i++) { roll -= w[i]; if (roll <= 0) return RARITIES[i]; }
      return RARITIES[0];
    }
    bindField(field) { this.field = field; this.seedGrid(); }
    pickRarityIndex() {
      const w = this.rarityWeights();
      let tot = 0; for (let i = 0; i < w.length; i++) tot += w[i];
      let roll = Math.random() * tot;
      for (let i = 0; i < w.length; i++) { roll -= w[i]; if (roll <= 0) return i; }
      return 0;
    }
    pickRar() { return RARITIES[this.pickRarityIndex()]; }
    // (re)place les points-Lumens ancrés sur la grille
    seedGrid() {
      const f = this.field;
      if (!f || !f.flag) return;
      f.clearLumens();
      f.ensureLumens(CONST.LUMEN_COUNT, () => this.pickRar());
    }

    harvestActive() { return this.session.harvesting && this.fieldActive; }

    effRadius() { return this.pullRadius * this.surgeBoost; }
    effStrength() { return this.pullStrength * this.surgeBoost; }
    grainSources() {
      const out = [];
      const R = this.effRadius(), gs = this.effStrength() * 0.5;
      if (this.harvestActive() && this.pointer.active) out.push({ x: this.pointer.x, y: this.pointer.y, r: R * 1.15, strength: gs });
      if (this.harvestActive()) for (const p of this.poles) out.push({ x: p.x, y: p.y, r: R, strength: gs * (p.life / p.maxLife) });
      for (const d of this.drones) out.push({ x: d.x, y: d.y, r: this.pullRadius * 0.85, strength: this.pullStrength * 0.35 });
      return out;
    }
    addPole(x, y) {
      if (!this.harvestActive()) return;
      if (this.poles.length >= 6) this.poles.shift();
      this.poles.push({ x, y, life: 11000, maxLife: 11000 });
    }

    spawnFx(x, y, rar, amt) {
      this.floats.push({ x, y, vy: -0.04, text: "+" + fmt(amt), color: rar.glow, life: 900, max: 900 });
      const n = rar.key === "legendary" ? 16 : rar.key === "epic" ? 10 : 6;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 0.05 + Math.random() * 0.18;
        this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 520, max: 520, color: rar.glow });
      }
    }

    update(dt) {
      const ddt = Math.min(dt, 50);
      const dtSec = ddt / 1000;
      this.tickProjects(dtSec);
      this.tickSession(dtSec);

      // surge / juice / combo / succès
      const ss = this.surgeState;
      if (ss.active > 0) ss.active -= dtSec;
      if (ss.cd > 0) ss.cd -= dtSec;
      this.surgeBoost = ss.active > 0 ? 2.4 : 1;
      if (this.surgeRing > 0) this.surgeRing -= dtSec / ss.dur;
      if (this.shake > 0.05) this.shake *= Math.pow(0.0015, dtSec); else this.shake = 0;
      if (this.combo.timer > 0) { this.combo.timer -= ddt; if (this.combo.timer <= 0) { this.combo.count = 0; this.combo.mult = 1; } }
      this._achT += ddt;
      if (this._achT > 600) { this._achT = 0; this._checkAch(); }
      if (this._sndT > 0) this._sndT -= ddt;

      const field = this.field;

      // collecteurs : drones (toujours -> Lumens) + pointeur/pôles (récolte -> soute)
      const drones = this.drones;
      const harvest = this.harvestActive();
      const hcols = [];
      if (harvest) {
        if (this.pointer.active) hcols.push({ x: this.pointer.x, y: this.pointer.y });
        for (const p of this.poles) hcols.push({ x: p.x, y: p.y });
      }

      for (let i = this.poles.length - 1; i >= 0; i--) { this.poles[i].life -= ddt; if (this.poles[i].life <= 0) this.poles.splice(i, 1); }

      // drones : errent doucement et aimantent les Lumens qu'ils croisent
      for (const d of drones) {
        d.phase += ddt * 0.0006;
        const tx = this.w / 2 + Math.cos(d.phase) * this.w * 0.34;
        const ty = this.h / 2 + Math.sin(d.phase * 1.3) * this.h * 0.34;
        const dx = tx - d.x, dy = ty - d.y, dl = Math.hypot(dx, dy) + 0.001, acc = 0.0005 * this.dronePowerMult;
        d.vx += (dx / dl) * acc * ddt; d.vy += (dy / dl) * acc * ddt;
        const sp = Math.hypot(d.vx, d.vy), maxv = 0.45 + 0.2 * this.dronePowerMult;
        if (sp > maxv) { d.vx = d.vx / sp * maxv; d.vy = d.vy / sp * maxv; }
        d.x += d.vx * ddt; d.y += d.vy * ddt;
      }

      // points-Lumens : on maintient la grille (taille améliorable), on gère le
      // repop, et on récolte ceux qui atteignent un collecteur.
      if (field && field.flag) {
        field.ensureLumens(this.lumenCount, () => this.pickRar());
        field.tickLumens(ddt, () => this.pickRar());

        const dcap2 = CONST.COLLECT_DIST * CONST.COLLECT_DIST;
        const inc = this.incomeMult;
        let canStore = harvest;
        let fxBudget = 5;
        const L = field.lumens;
        this._droneBudget = Math.min(this._droneBudget + dtSec * this.droneCount * CONST.DRONE_EFF, this.droneCount + 1);
        for (let k = 0; k < L.length; k++) {
          const e = L[k];
          if (!e.lit) continue;
          const x = field.px[e.i], y = field.py[e.i];
          let toStorage = false, byDrone = false;
          if (this._droneBudget >= 1) {
            for (const d of drones) { const dx = x - d.x, dy = y - d.y; if (dx * dx + dy * dy < dcap2) { byDrone = true; break; } }
          }
          if (!byDrone && canStore) {
            for (const c of hcols) { const dx = x - c.x, dy = y - c.y; if (dx * dx + dy * dy < dcap2) { toStorage = true; break; } }
          }
          if (!byDrone && !toStorage) continue;
          const rar = e.rar;
          let amt = rar.value * inc;
          if (toStorage) {
            this.combo.count += 1; this.combo.timer = 1600;
            this.combo.mult = Math.min(5, 1 + this.combo.count * 0.12); // ×1 -> ×5
            if (this.combo.count > this.state.stats.comboMax) this.state.stats.comboMax = this.combo.count;
            amt *= this.combo.mult;
            this.session.storage += 1; this.session.storageValue += amt;
            if (this._sndT <= 0) { this.snd("combo", this.combo.count); this._sndT = 60; }
          } else {
            this._droneBudget -= 1;
            this.addLumens(amt);
          }
          this.state.collected += 1;
          if (fxBudget > 0) { this.spawnFx(x, y, rar, amt); fxBudget--; if (rar.key === "legendary") this.addShake(3); }
          field.harvest(k, this.repopDelay);
          if (toStorage && this.session.storage >= this.storageMax) { this.endHarvest("full"); canStore = false; }
        }
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i]; p.life -= ddt;
        if (p.life <= 0) { this.particles.splice(i, 1); continue; }
        p.x += p.vx * ddt; p.y += p.vy * ddt; p.vx *= 0.96; p.vy *= 0.96;
      }
      for (let i = this.floats.length - 1; i >= 0; i--) {
        const f = this.floats[i]; f.life -= ddt;
        if (f.life <= 0) { this.floats.splice(i, 1); continue; }
        f.y += f.vy * ddt;
      }
    }

    reset() {
      AFK.state.wipe();
      this.state = AFK.state.defaultState();
      this.poles.length = 0; this.particles.length = 0; this.floats.length = 0;
      this.session = { harvesting: false, timer: 0, storage: 0, storageValue: 0 };
      this.applyStats(); this.seedGrid(); this.state.energy = this.energyMax; this.syncDrones(true);
    }
  }

  AFK.Game = Game;
})();
