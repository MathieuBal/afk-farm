/* AFK Farm — interface : HUD, navigation, panneau Chantier (projets),
 * panneau Prestige, et notifications. */
(function () {
  const AFK = (window.AFK = window.AFK || {});
  const C = AFK.config;
  const fmt = AFK.state.fmt;
  const fmtTime = AFK.state.fmtTime;

  class UI {
    constructor(game, treeUI) {
      this.game = game;
      this.treeUI = treeUI;
      this.view = "field";
      this.$ = (id) => document.getElementById(id);

      this.lumensEl = this.$("lumens-count");
      this.lumenNameEl = this.$("lumen-name");
      this.rateEl = this.$("rate-count");
      this.biomeEl = this.$("biome-name");
      this.coresEl = this.$("cores-hud");
      this.treeLumensEl = this.$("tree-lumens");
      this._lastLumens = -1;

      this.harvestBtn = this.$("harvest-btn");
      this.harvestLabel = this.harvestBtn.querySelector(".lbl");
      this.surgeBtn = this.$("surge-btn");
      this.surgeCdFill = this.surgeBtn.querySelector(".cd-fill");
      this.barEnergy = this.$("bar-energy");
      this.barStorage = this.$("bar-storage");
      this.barTimer = this.$("bar-timer");
      this.storeTxt = this.$("store-txt");
      this.comboEl = this.$("combo");
      this.comboTxt = this.$("combo-txt");

      this.bindNav();
      this.bindHarvest();
      this.applyTheme();
      this.maybeOffline();
    }

    bindHarvest() {
      this.harvestBtn.addEventListener("click", () => {
        const g = this.game;
        if (AFK.audio) AFK.audio.init();
        if (g.session.harvesting) return;
        if (!g.startHarvest()) {
          this.harvestBtn.classList.add("shake");
          setTimeout(() => this.harvestBtn.classList.remove("shake"), 400);
        }
      });
      this.surgeBtn.addEventListener("click", () => {
        if (AFK.audio) AFK.audio.init();
        this.game.triggerSurge();
      });
    }

    applyTheme() {
      const b = C.biome(this.game.state.biome);
      const root = document.documentElement.style;
      root.setProperty("--accent", b.accent);
      root.setProperty("--accent2", b.accent2);
      root.setProperty("--accent-soft", b.soft);
      root.setProperty("--bg0", b.bg0);
      root.setProperty("--bg1", b.bg1);
      this.treeUI.setTheme(b.accent, b.accent2);
    }

    bindNav() {
      const set = (v) => () => this.setView(v);
      this.$("nav-field").addEventListener("click", set("field"));
      this.$("nav-tree").addEventListener("click", set("tree"));
      this.$("nav-build").addEventListener("click", set("build"));
      this.$("nav-prestige").addEventListener("click", set("prestige"));
      this.$("profile-btn").addEventListener("click", () => { if (AFK.audio) AFK.audio.init(); this.setView(this.view === "profile" ? "field" : "profile"); });
      this.$("tree-close").addEventListener("click", set("field"));
      this.$("tree-respec").addEventListener("click", () => {
        const spent = this.game.state.treeSpent || 0;
        if (spent <= 0) return;
        if (confirm("Réinitialiser l'arbre et récupérer " + fmt(spent) + " ✦ ?")) this.game.respecTree();
      });
      this.$("sheet-close").addEventListener("click", set("field"));
      this.$("reset-btn").addEventListener("click", () => {
        if (confirm("Tout réinitialiser (prestige inclus) ?")) { this.game.reset(); this.applyTheme(); this.setView("field"); }
      });
    }

    setView(v) {
      this.view = v;
      const sheet = this.$("sheet");
      const treeHdr = this.$("tree-header");
      this.treeUI[v === "tree" ? "show" : "hide"]();
      treeHdr.classList.toggle("hidden", v !== "tree");
      if (v === "tree") this.treeUI.centerOnFrontier();

      const isSheet = v === "build" || v === "prestige" || v === "profile";
      sheet.classList.toggle("open", isSheet);
      this.$("sheet-foot").classList.toggle("hidden", v !== "profile");
      if (v === "build") this.renderBuild();
      if (v === "prestige") this.renderPrestige();
      if (v === "profile") this.renderProfile();

      // la récolte n'est visible/active que sur l'écran terrain
      this.game.fieldActive = v === "field";
      this.$("harvest").classList.toggle("hidden", v !== "field");
      this.$("hint").classList.toggle("hidden", v !== "field");

      for (const id of ["nav-field", "nav-tree", "nav-build", "nav-prestige"])
        this.$(id).classList.toggle("active", id === "nav-" + v);
    }

    /* ---------- panneau Chantier ---------- */
    renderBuild() {
      const g = this.game;
      const p = g.currentProject();
      const ps = g.projectState(p);
      const el = this.$("sheet-body");
      this.$("sheet-title").textContent = "🛠️ Chantier";
      const done = g.state.projectIndex;
      const totalTime = C.projectTotalTime(p) / g.buildSpeed;

      let parts = "";
      for (let i = 0; i < p.parts.length; i++) {
        const part = p.parts[i];
        let cls, right;
        if (i < ps.pi) { cls = "done"; right = "✓"; }
        else if (i === ps.pi && ps.building) {
          const t = g.partTime(part);
          cls = "building";
          right = '<div class="part-bar"><i id="part-fill" style="width:' + Math.min(100, (ps.p / t) * 100).toFixed(1) + '%"></i></div>' +
            '<span class="part-remain" id="part-remain">' + fmtTime(t - ps.p) + '</span>';
        } else if (i === ps.pi) {
          const afford = g.state.lumens >= part.cost;
          cls = "current" + (afford ? " afford" : "");
          right = '<button class="part-fund ' + (afford ? "ok" : "no") + '" id="fund-btn">✦ ' + fmt(part.cost) + '</button>';
        } else {
          cls = "locked";
          right = '<span class="part-lock">✦ ' + fmt(part.cost) + ' · ' + fmtTime(part.time / g.buildSpeed) + '</span>';
        }
        parts += '<div class="part ' + cls + '"><span class="part-icon">' + part.icon + '</span>' +
          '<span class="part-name">' + part.name + '</span><span class="part-right">' + right + '</span></div>';
      }

      el.innerHTML =
        '<p class="sheet-intro">Répare ta flotte <b>pièce par pièce</b>. Chaque pièce prend du temps (plusieurs heures) et avance en temps réel, <b>même hors-ligne</b>. L\'ouvrage complet débloque un biome plus riche et un bonus permanent.</p>' +
        '<div class="project-card">' +
          '<div class="pj-head"><span class="pj-icon">' + p.icon + '</span>' +
            '<div><div class="pj-name">' + p.name + '</div><div class="pj-desc">' + p.desc + '</div></div></div>' +
          '<div class="pj-stats">Bonus permanent <b>×' + p.mult.toFixed(1) + '</b> · Biome <b>' + C.biome(done + 1).name + '</b> · ' +
            '<b>' + ps.pi + '/' + p.parts.length + '</b> pièces · Total <b>~' + fmtTime(totalTime) + '</b></div>' +
          '<div class="parts">' + parts + '</div>' +
        '</div>' +
        '<div class="pj-meta">' + done + ' ouvrage' + (done > 1 ? "s" : "") + ' terminé' + (done > 1 ? "s" : "") +
          ' · Vitesse de construction ×' + g.buildSpeed.toFixed(2) + ' (améliore-la dans l\'arbre 🔧)</div>';

      const fund = this.$("fund-btn");
      if (fund) fund.addEventListener("click", () => { if (g.fundPart()) this.renderBuild(); });
    }

    /* ---------- panneau Prestige ---------- */
    renderPrestige() {
      const g = this.game;
      const el = this.$("sheet-body");
      this.$("sheet-title").textContent = "🌌 Singularité (Prestige)";
      const gain = g.coreGain();
      const can = g.canPrestige() && (gain >= 1 || g.state.prestiges === 0);
      const memVal = (C.PERKS.find((p) => p.id === "memory").val(g.state.perks.memory || 0) * 100).toFixed(0);

      let perks = "";
      for (const perk of C.PERKS) {
        const lvl = g.state.perks[perk.id] || 0;
        const maxed = lvl >= perk.max;
        const cost = C.perkCost(perk, lvl);
        const afford = g.state.cores >= cost;
        perks +=
          '<div class="perk ' + (maxed ? "maxed" : afford ? "afford" : "") + '" data-perk="' + perk.id + '">' +
            '<span class="perk-icon">' + perk.icon + '</span>' +
            '<div class="perk-body"><div class="perk-name">' + perk.name + ' <span class="perk-lvl">Niv ' + lvl + '</span></div>' +
              '<div class="perk-desc">' + perk.desc + '</div></div>' +
            '<div class="perk-cost">' + (maxed ? "MAX" : "◆ " + fmt(cost)) + '</div>' +
          '</div>';
      }

      el.innerHTML =
        '<p class="sheet-intro">Réinitialise Lumens, projets et arbre pour gagner des <b>◆ Cores</b> qui boostent <b>tout</b> en permanence (+' + (C.CONST.CORE_MULT * 100) + '% revenu / Core). Mémoire actuelle : +' + memVal + '%.</p>' +
        '<div class="prestige-box">' +
          '<div class="pb-row"><span>◆ Cores</span><b>' + fmt(g.state.cores) + '</b></div>' +
          '<div class="pb-row"><span>Gain au prestige</span><b class="gain">+' + fmt(gain) + ' ◆</b></div>' +
          '<div class="pb-row"><span>Prestiges</span><b>' + g.state.prestiges + '</b></div>' +
          '<button class="pj-btn ' + (can ? "ok" : "no") + '" id="prestige-btn">' + (can ? "Provoquer la Singularité" : "Atteins le Croiseur ou 500k ✦") + '</button>' +
        '</div>' +
        '<div class="perks-title">Améliorations permanentes</div>' +
        '<div class="perks">' + perks + '</div>';

      const pb = this.$("prestige-btn");
      if (pb) pb.addEventListener("click", () => {
        if (g.canPrestige() && confirm("Provoquer la Singularité ? (+ " + fmt(gain) + " ◆)")) {
          g.prestige(); this.applyTheme(); this.renderPrestige();
        }
      });
      el.querySelectorAll(".perk").forEach((node) => {
        node.addEventListener("click", () => { if (g.buyPerk(node.dataset.perk)) this.renderPrestige(); });
      });
    }

    /* ---------- panneau Profil (succès + stats + son) ---------- */
    renderProfile() {
      const g = this.game, st = g.state;
      const el = this.$("sheet-body");
      this.$("sheet-title").textContent = "👤 Profil";
      const A = AFK.achievements;
      const got = A.unlockedCount(st);
      const audioOn = AFK.audio && AFK.audio.isEnabled();

      const stat = (k, v) => '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
      let stats =
        stat("Lumens cumulés", fmt(st.totalEver)) +
        stat("Unités récoltées", fmt(st.collected)) +
        stat("Meilleur biome", C.biome(st.bestBiome).name) +
        stat("Prestiges ◆", fmt(st.cores)) +
        stat("Sessions", fmt(st.stats.sessions)) +
        stat("Surges", fmt(st.stats.surges)) +
        stat("Combo max", "×" + st.stats.comboMax) +
        stat("Nœuds · drones", g.allocatedCount() + " · " + g.droneCount);

      let achs = "";
      for (const a of A.LIST) {
        const ok = !!st.achievements[a.id];
        achs += '<div class="ach ' + (ok ? "got" : "locked") + '"><span class="ach-ic">' + a.icon + '</span>' +
          '<div><div class="ach-name">' + a.name + (ok ? ' <span class="chk">✓</span>' : '') + '</div>' +
          '<div class="ach-desc">' + a.desc + '</div></div></div>';
      }

      el.innerHTML =
        '<p class="sheet-intro">Chaque succès débloqué accorde <b>+' + Math.round(A.BONUS * 100) + '% de revenu global</b> permanent. Bonus actuel : <b>×' + g.achievementMult.toFixed(2) + '</b>.</p>' +
        '<div class="mute-row"><span>🔊 Sons</span><button id="mute-btn">' + (audioOn ? "Activés" : "Coupés") + '</button></div>' +
        '<div class="stats-grid">' + stats + '</div>' +
        '<div class="perks-title">Succès (' + got + '/' + A.LIST.length + ')</div>' +
        '<div class="ach-grid">' + achs + '</div>';

      const mb = this.$("mute-btn");
      if (mb) mb.addEventListener("click", () => { if (AFK.audio) { const on = AFK.audio.toggle(); mb.textContent = on ? "Activés" : "Coupés"; } });
    }

    /* ---------- toasts ---------- */
    maybeOffline() {
      const g = this.game;
      if (g.offlineGain >= 1) {
        this.toast("De retour 👋", "Tes drones ont récolté pendant " + fmtTime(g.offlineSeconds) +
          " : <b class='gain'>+" + fmt(g.offlineGain) + " ✦</b>", 5200);
      }
    }
    toast(title, body, dur) {
      const wrap = this.$("toasts");
      while (wrap.children.length >= 3) wrap.removeChild(wrap.firstChild);
      const t = document.createElement("div");
      t.className = "toast";
      t.innerHTML = "<h3>" + title + "</h3><p>" + body + "</p>";
      wrap.appendChild(t);
      requestAnimationFrame(() => t.classList.add("in"));
      setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 400); }, dur || 3600);
    }

    /* ---------- tick ---------- */
    tick() {
      const g = this.game;
      if (g.toasts.length) {
        for (const m of g.toasts) {
          this.toast(m.title, m.body, 5000);
          if (m.kind === "project") this.applyTheme();
          if ((m.kind === "project" || m.kind === "part") && this.view === "build") this.renderBuild();
        }
        g.toasts.length = 0;
      }

      const lum = g.state.lumens;
      const shown = Math.floor(lum);
      if (shown !== this._lastLumens) {
        this.lumensEl.textContent = fmt(lum);
        if (this.treeLumensEl) this.treeLumensEl.textContent = fmt(lum);
        this._lastLumens = shown;
      }
      const b = C.biome(g.state.biome);
      this.lumenNameEl.textContent = b.lumen;
      this.lumenNameEl.style.color = b.accent;
      this.rateEl.textContent = fmt(g.idleRate);
      this.biomeEl.textContent = b.name;
      this.coresEl.textContent = fmt(g.state.cores);

      // jauges de session de récolte
      const s = g.session, ss = g.surgeState;
      this.barEnergy.style.width = Math.max(0, (g.state.energy / g.energyMax) * 100) + "%";
      if (s.harvesting) {
        this.barStorage.style.width = Math.min(100, (s.storage / g.storageMax) * 100) + "%";
        this.barTimer.style.width = Math.max(0, (s.timer / g.sessionTime) * 100) + "%";
        this.storeTxt.textContent = "SOUTE · " + s.storage + "/" + g.storageMax + " · ×" + g.combo.mult.toFixed(1) + " combo";
        this.harvestBtn.classList.add("active");
        this.harvestLabel.textContent = "Récolte · " + Math.ceil(s.timer) + "s";
      } else {
        this.barStorage.style.width = "0%";
        this.barTimer.style.width = "100%";
        const ready = g.state.energy >= 1;
        this.storeTxt.textContent = ready ? "SOUTE · prêt à récolter" : "SOUTE · recharge en cours…";
        this.harvestBtn.classList.remove("active");
        this.harvestLabel.textContent = "Lancer la récolte";
      }
      // badge combo (visible en récolte active & mult > 1.05)
      if (s.harvesting && g.combo.mult > 1.05) {
        this.comboEl.classList.add("show");
        this.comboTxt.textContent = "×" + g.combo.mult.toFixed(1);
      } else {
        this.comboEl.classList.remove("show");
      }
      const surgeReady = s.harvesting && ss.cd <= 0 && g.state.energy >= ss.cost;
      this.surgeBtn.classList.toggle("cd", !surgeReady);
      this.surgeCdFill.style.height = s.harvesting && ss.cd > 0 ? (ss.cd / ss.cdMax * 100) + "%" : "0%";

      // progression de la pièce en cours si le panneau est ouvert
      if (this.view === "build") {
        const p = g.currentProject(), ps = g.projectState(p);
        if (ps.building) {
          const part = p.parts[ps.pi], t = g.partTime(part);
          const fill = this.$("part-fill"), rem = this.$("part-remain");
          if (fill) fill.style.width = Math.min(100, (ps.p / t) * 100).toFixed(1) + "%";
          if (rem) rem.textContent = fmtTime(t - ps.p);
          else this.renderBuild(); // on vient de lancer une construction
        } else if (this.$("fund-btn")) {
          const part = p.parts[ps.pi];
          const afford = part && g.state.lumens >= part.cost;
          const fund = this.$("fund-btn");
          fund.classList.toggle("ok", afford); fund.classList.toggle("no", !afford);
        }
      }
    }
  }

  AFK.UI = UI;
})();
