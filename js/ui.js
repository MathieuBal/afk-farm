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

      this.bindNav();
      this.applyTheme();
      this.maybeOffline();
    }

    applyTheme() {
      const b = C.biome(this.game.state.biome);
      document.documentElement.style.setProperty("--accent", b.accent);
      document.documentElement.style.setProperty("--c1", b.c1);
      document.documentElement.style.setProperty("--c2", b.c2);
      this.treeUI.setTheme(b.accent);
    }

    bindNav() {
      const set = (v) => () => this.setView(v);
      this.$("nav-field").addEventListener("click", set("field"));
      this.$("nav-tree").addEventListener("click", set("tree"));
      this.$("nav-build").addEventListener("click", set("build"));
      this.$("nav-prestige").addEventListener("click", set("prestige"));
      this.$("tree-close").addEventListener("click", set("field"));
      this.$("sheet-close").addEventListener("click", set("field"));
      this.$("reset-btn").addEventListener("click", () => {
        if (confirm("Tout réinitialiser (prestige inclus) ?")) { this.game.reset(); this.applyTheme(); this.setView("field"); }
      });
    }

    setView(v) {
      this.view = v;
      const sheet = this.$("sheet");
      const treeHdr = this.$("tree-header");
      // états
      this.treeUI[v === "tree" ? "show" : "hide"]();
      treeHdr.classList.toggle("hidden", v !== "tree");
      if (v === "tree") this.treeUI.centerOnFrontier();

      const isSheet = v === "build" || v === "prestige";
      sheet.classList.toggle("open", isSheet);
      if (v === "build") this.renderBuild();
      if (v === "prestige") this.renderPrestige();

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
      const t = g.projectTime(p);
      const pct = ps.building ? Math.min(100, (ps.p / t) * 100) : 0;
      const remain = ps.building ? t - ps.p : t;
      const afford = g.state.lumens >= p.cost;

      el.innerHTML =
        '<p class="sheet-intro">Répare et construis ta flotte. Chaque ouvrage débloque un biome plus riche et un bonus permanent. La construction avance en temps réel, <b>même hors-ligne</b>.</p>' +
        '<div class="project-card">' +
          '<div class="pj-head"><span class="pj-icon">' + p.icon + '</span>' +
            '<div><div class="pj-name">' + p.name + '</div><div class="pj-desc">' + p.desc + '</div></div></div>' +
          '<div class="pj-stats">Bonus permanent <b>×' + p.mult.toFixed(1) + '</b> · Biome <b>' + C.biome(done + 1).name + '</b> · Durée <b>' + fmtTime(t) + '</b></div>' +
          (ps.building
            ? '<div class="pj-bar"><div class="pj-fill" id="pj-fill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
              '<div class="pj-remain" id="pj-remain">Construction… ' + fmtTime(remain) + ' restant</div>'
            : '<button class="pj-btn ' + (afford ? "ok" : "no") + '" id="fund-btn">Financer · ✦ ' + fmt(p.cost) + '</button>') +
        '</div>' +
        '<div class="pj-meta">' + done + ' ouvrage' + (done > 1 ? "s" : "") + ' terminé' + (done > 1 ? "s" : "") +
          ' · Vitesse de construction ×' + g.buildSpeed.toFixed(2) + ' (améliore-la dans l\'arbre 🔧)</div>';

      const fund = this.$("fund-btn");
      if (fund) fund.addEventListener("click", () => { if (g.fundProject()) this.renderBuild(); });
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
      // toasts du moteur
      if (g.toasts.length) {
        for (const m of g.toasts) { this.toast(m.title, m.body, 5000); if (m.kind === "project") this.applyTheme(); }
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

      // progression du projet en cours si le panneau est ouvert
      if (this.view === "build") {
        const p = g.currentProject(), ps = g.projectState(p);
        if (ps.building) {
          const t = g.projectTime(p);
          const fill = this.$("pj-fill"), rem = this.$("pj-remain");
          if (fill) fill.style.width = Math.min(100, (ps.p / t) * 100).toFixed(1) + "%";
          if (rem) rem.textContent = "Construction… " + fmtTime(t - ps.p) + " restant";
        } else if (this.$("fund-btn")) {
          // rafraîchit l'état finançable
          const fund = this.$("fund-btn");
          fund.classList.toggle("ok", g.state.lumens >= p.cost);
          fund.classList.toggle("no", g.state.lumens < p.cost);
        }
      }
    }
  }

  AFK.UI = UI;
})();
