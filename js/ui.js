/* AFK Farm — interface : HUD, boutique d'améliorations et toast hors-ligne. */
(function () {
  const AFK = (window.AFK = window.AFK || {});
  const { UPGRADES, cost } = AFK.config;
  const fmt = AFK.state.fmt;

  class UI {
    constructor(game) {
      this.game = game;
      this.lumensEl = document.getElementById("lumens-count");
      this.rateEl = document.getElementById("rate-count");
      this.listEl = document.getElementById("shop-list");
      this.collectedEl = document.getElementById("stat-collected");
      this.shopEl = document.getElementById("shop");
      this.toggleEl = document.getElementById("shop-toggle");
      this.rows = {};
      this._lastLumens = -1;

      this.buildShop();
      this.bindControls();
      this.maybeShowOffline();
    }

    buildShop() {
      this.listEl.innerHTML = "";
      for (const up of UPGRADES) {
        const row = document.createElement("div");
        row.className = "up";
        row.innerHTML =
          '<div class="icon">' + up.icon + "</div>" +
          '<div class="body">' +
            '<div class="name">' + up.name + ' <span class="lvl"></span></div>' +
            '<div class="desc">' + up.desc + "</div>" +
            '<div class="effect"></div>' +
          "</div>" +
          '<div class="cost"></div>';
        row.addEventListener("click", () => this.tryBuy(up.id));
        this.listEl.appendChild(row);
        this.rows[up.id] = {
          root: row,
          lvl: row.querySelector(".lvl"),
          effect: row.querySelector(".effect"),
          cost: row.querySelector(".cost"),
        };
      }
      this.refreshShop();
    }

    tryBuy(id) {
      if (this.game.buy(id)) {
        this.refreshShop();
        this.flashLumens();
      }
    }

    bindControls() {
      this.toggleEl.addEventListener("click", () => this.shopEl.classList.toggle("closed"));
      document.getElementById("shop-close").addEventListener("click", () =>
        this.shopEl.classList.add("closed")
      );
      document.getElementById("reset-btn").addEventListener("click", () => {
        if (confirm("Réinitialiser toute la progression ?")) {
          this.game.reset();
          this.refreshShop();
        }
      });
    }

    refreshShop() {
      const g = this.game;
      for (const up of UPGRADES) {
        const lvl = g.state.levels[up.id];
        const r = this.rows[up.id];
        const maxed = lvl >= up.max;
        const c = cost(up, lvl);
        r.lvl.textContent = "Niv " + lvl;
        r.effect.textContent = up.label(lvl);
        r.root.classList.toggle("maxed", maxed);
        if (maxed) {
          r.cost.innerHTML = "MAX";
          r.root.classList.remove("affordable", "locked");
        } else {
          r.cost.innerHTML = '<span class="spark">✦</span> ' + fmt(c);
          const can = g.state.lumens >= c;
          r.root.classList.toggle("affordable", can);
          r.root.classList.toggle("locked", !can);
        }
      }
    }

    flashLumens() {
      this.lumensEl.style.transform = "scale(1.12)";
      setTimeout(() => (this.lumensEl.style.transform = "scale(1)"), 110);
    }

    maybeShowOffline() {
      const g = this.game;
      if (g.offlineGain && g.offlineGain >= 1) {
        const el = document.getElementById("toast");
        const mins = Math.round(g.offlineSeconds / 60);
        const dur = mins >= 60 ? Math.floor(mins / 60) + " h " + (mins % 60) + " min" : mins + " min";
        el.innerHTML =
          "<h3>De retour 👋</h3>" +
          "<p>Tes drones ont récolté pendant <b>" + dur + "</b></p>" +
          '<p class="big">+' + fmt(g.offlineGain) + " ✦</p>";
        el.classList.remove("hidden");
        setTimeout(() => el.classList.add("hidden"), 4600);
      }
    }

    tick() {
      const g = this.game;
      const lum = Math.floor(g.state.lumens);
      if (lum !== this._lastLumens) {
        this.lumensEl.textContent = fmt(lum);
        this._lastLumens = lum;
        if (!this.shopEl.classList.contains("closed")) this.refreshShop();
      }
      this.rateEl.textContent = fmt(g.idleRate);
      this.collectedEl.textContent = fmt(g.state.totalCollected) + " unités récoltées";
    }
  }

  AFK.UI = UI;
})();
