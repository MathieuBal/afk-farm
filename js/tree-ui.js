/* AFK Farm — vue de l'arbre de compétences : canvas dédié, pan + zoom + tap. */
(function () {
  const AFK = (window.AFK = window.AFK || {});
  const fmt = AFK.state.fmt;

  class TreeUI {
    constructor(game) {
      this.game = game;
      this.canvas = document.getElementById("tree-canvas");
      this.ctx = this.canvas.getContext("2d");
      this.cam = { x: 0, y: 0, zoom: 0.8 };
      this.open = false;
      this.dpr = 1;
      this.pointers = new Map();
      this.dragging = false;
      this.moved = 0;
      this.last = null;
      this.pinchDist = 0;
      this.flash = null;       // {id, t, ok}
      this.theme = "#22d3ee";
      this.selected = null;
      this.info = document.getElementById("node-info");
      this.bind();
      this.bindInfo();
    }

    bindInfo() {
      const btn = document.getElementById("node-alloc");
      if (btn) btn.addEventListener("click", () => this.allocSelected());
    }
    showInfo() {
      const n = this.selected;
      if (!n) { this.hideInfo(); return; }
      this.info.classList.remove("hidden");
      this.info.querySelector(".ni-icon").textContent = n.icon;
      const tag = n.keystone ? " · Keystone" : n.notable ? " · Notable" : "";
      this.info.querySelector(".ni-name").textContent = n.label + tag;
      this.info.querySelector(".ni-desc").textContent = AFK.tree.effectText(n);
      this.updateInfo();
    }
    hideInfo() { this.selected = null; if (this.info) this.info.classList.add("hidden"); }
    updateInfo() {
      const n = this.selected, g = this.game;
      if (!n) return;
      const btn = document.getElementById("node-alloc");
      if (n.id === "core" || g.state.nodes[n.id]) { btn.textContent = "✓ Déjà alloué"; btn.className = "ni-btn done"; btn.disabled = true; return; }
      const can = AFK.tree.canAllocate(g.tree, g.state.nodes, n.id);
      const cost = g.nodeCost(n);
      const afford = g.state.lumens >= cost;
      if (!can) { btn.textContent = "🔒 Relie d'abord un nœud voisin"; btn.className = "ni-btn locked"; btn.disabled = true; }
      else { btn.textContent = "Allouer · ✦ " + AFK.state.fmt(cost); btn.className = "ni-btn " + (afford ? "ok" : "no"); btn.disabled = !afford; }
    }
    allocSelected() {
      const n = this.selected;
      if (!n) return;
      const ok = this.game.allocate(n.id);
      this.flash = { id: n.id, t: 600, ok };
      if (ok && navigator.vibrate) navigator.vibrate(8);
      else if (!ok && AFK.audio) AFK.audio.error && AFK.audio.error();
      this.showInfo();
    }

    setTheme(c) { this.theme = c; }

    show() {
      this.open = true;
      this.canvas.style.display = "block";
      this.resize();
    }
    hide() { this.open = false; this.canvas.style.display = "none"; this.hideInfo(); }

    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth, h = window.innerHeight;
      this.W = w; this.H = h;
      this.canvas.width = Math.floor(w * this.dpr);
      this.canvas.height = Math.floor(h * this.dpr);
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    w2s(wx, wy) {
      return [(wx - this.cam.x) * this.cam.zoom + this.W / 2, (wy - this.cam.y) * this.cam.zoom + this.H / 2];
    }
    s2w(sx, sy) {
      return [(sx - this.W / 2) / this.cam.zoom + this.cam.x, (sy - this.H / 2) / this.cam.zoom + this.cam.y];
    }

    bind() {
      const cv = this.canvas;
      cv.addEventListener("pointerdown", (e) => {
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        this.last = { x: e.clientX, y: e.clientY };
        this.moved = 0;
        this.dragging = false;
        cv.setPointerCapture(e.pointerId);
      });
      cv.addEventListener("pointermove", (e) => {
        if (!this.pointers.has(e.pointerId)) return;
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pointers.size >= 2) { this.handlePinch(); return; }
        if (this.last) {
          const dx = e.clientX - this.last.x, dy = e.clientY - this.last.y;
          this.moved += Math.abs(dx) + Math.abs(dy);
          if (this.moved > 8) this.dragging = true;
          if (this.dragging) { this.cam.x -= dx / this.cam.zoom; this.cam.y -= dy / this.cam.zoom; }
          this.last = { x: e.clientX, y: e.clientY };
        }
      });
      const end = (e) => {
        if (!this.dragging && this.pointers.size === 1) this.tap(e.clientX, e.clientY);
        this.pointers.delete(e.pointerId);
        if (this.pointers.size < 2) this.pinchDist = 0;
        if (this.pointers.size === 0) { this.last = null; this.dragging = false; }
      };
      cv.addEventListener("pointerup", end);
      cv.addEventListener("pointercancel", (e) => this.pointers.delete(e.pointerId));
      cv.addEventListener("wheel", (e) => {
        e.preventDefault();
        const [wx, wy] = this.s2w(e.clientX, e.clientY);
        this.cam.zoom = AFK.util.clamp(this.cam.zoom * (e.deltaY < 0 ? 1.12 : 0.89), 0.35, 2.4);
        const [nx, ny] = this.s2w(e.clientX, e.clientY);
        this.cam.x += wx - nx; this.cam.y += wy - ny;
      }, { passive: false });
    }

    handlePinch() {
      const pts = [...this.pointers.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.pinchDist) {
        const mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
        const [wx, wy] = this.s2w(mx, my);
        this.cam.zoom = AFK.util.clamp(this.cam.zoom * (d / this.pinchDist), 0.35, 2.4);
        const [nx, ny] = this.s2w(mx, my);
        this.cam.x += wx - nx; this.cam.y += wy - ny;
      }
      this.pinchDist = d;
      this.dragging = true;
    }

    tap(sx, sy) {
      const [wx, wy] = this.s2w(sx, sy);
      let hit = null, hd = Infinity;
      for (const n of this.game.tree.list) {
        const r = n.keystone ? 30 : n.notable ? 22 : 16;
        const dx = n.x - wx, dy = n.y - wy, d = Math.hypot(dx, dy);
        if (d < r + 9 && d < hd) { hd = d; hit = n; }
      }
      this.selected = hit;
      if (hit) { this.showInfo(); if (AFK.audio) AFK.audio.tap && AFK.audio.tap(); }
      else this.hideInfo();
    }

    centerOnFrontier() {
      // recentre la caméra sur le barycentre des nœuds alloués
      const g = this.game;
      let sx = 0, sy = 0, n = 0;
      for (const id in g.state.nodes) {
        const node = g.tree.byId.get(id);
        if (node) { sx += node.x; sy += node.y; n++; }
      }
      if (n) { this.cam.x = sx / n; this.cam.y = sy / n; }
    }

    draw() {
      if (!this.open) return;
      const ctx = this.ctx, g = this.game;
      ctx.clearRect(0, 0, this.W, this.H);
      ctx.fillStyle = "rgba(4,5,12,0.96)";
      ctx.fillRect(0, 0, this.W, this.H);

      const nodes = g.state.nodes;
      const z = this.cam.zoom;
      const margin = 60;
      const vis = (x, y) => x > -margin && x < this.W + margin && y > -margin && y < this.H + margin;

      // liens
      ctx.lineWidth = Math.max(1, 2.2 * z);
      for (const n of g.tree.list) {
        const [ax, ay] = this.w2s(n.x, n.y);
        for (const lid of n.links) {
          if (lid < n.id) continue; // une fois par paire
          const m = g.tree.byId.get(lid);
          if (!m) continue;
          const [bx, by] = this.w2s(m.x, m.y);
          if (!vis(ax, ay) && !vis(bx, by)) continue;
          const both = nodes[n.id] && nodes[lid];
          ctx.strokeStyle = both ? this.theme : "rgba(120,140,200,0.13)";
          ctx.globalAlpha = both ? 0.9 : 1;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // nœuds
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const n of g.tree.list) {
        const [x, y] = this.w2s(n.x, n.y);
        const baseR = (n.id === "core" ? 24 : n.keystone ? 28 : n.notable ? 20 : 14);
        const r = baseR * z;
        if (!vis(x, y)) continue;
        const alloc = !!nodes[n.id];
        const can = AFK.tree.canAllocate(g.tree, nodes, n.id);
        const cost = n.id === "core" ? 0 : g.nodeCost(n);
        const afford = g.state.lumens >= cost;

        // halo
        if (alloc || (can && afford)) {
          ctx.beginPath();
          ctx.fillStyle = alloc ? this.theme : "rgba(255,255,255,0.10)";
          ctx.globalAlpha = alloc ? 0.22 : 0.5;
          ctx.arc(x, y, r * 1.7, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        if (alloc) { ctx.fillStyle = "rgba(20,28,52,0.95)"; ctx.fill(); ctx.lineWidth = 2.4 * z; ctx.strokeStyle = this.theme; ctx.stroke(); }
        else if (can) { ctx.fillStyle = "rgba(16,20,38,0.92)"; ctx.fill(); ctx.lineWidth = 2 * z; ctx.strokeStyle = afford ? "rgba(255,255,255,0.7)" : "rgba(120,130,170,0.5)"; ctx.stroke(); }
        else { ctx.fillStyle = "rgba(12,15,28,0.85)"; ctx.fill(); ctx.lineWidth = 1.4 * z; ctx.strokeStyle = "rgba(90,100,140,0.4)"; ctx.stroke(); }

        // flash de feedback
        if (this.flash && this.flash.id === n.id) {
          ctx.beginPath(); ctx.arc(x, y, r * (1 + (1 - this.flash.t / 600)), 0, Math.PI * 2);
          ctx.strokeStyle = this.flash.ok ? "rgba(110,231,183,0.9)" : "rgba(248,113,113,0.9)";
          ctx.lineWidth = 3 * z; ctx.stroke();
        }

        if (z > 0.5) {
          ctx.globalAlpha = alloc || can ? 1 : 0.5;
          ctx.font = (r * 1.1) + "px sans-serif";
          ctx.fillText(n.icon, x, y + r * 0.05);
          ctx.globalAlpha = 1;
        }
        // coût sous les nœuds allouables
        if (can && z > 0.6) {
          ctx.font = "700 " + (11 * Math.min(z, 1.4)) + "px 'Segoe UI',sans-serif";
          ctx.fillStyle = afford ? "#fbbf24" : "#7a86b0";
          ctx.fillText("✦ " + fmt(cost), x, y + r + 11 * Math.min(z, 1.4));
        }
        // nom des notables/keystones
        if ((n.notable || n.keystone) && z > 0.9) {
          ctx.font = "600 " + (11 * Math.min(z, 1.3)) + "px 'Segoe UI',sans-serif";
          ctx.fillStyle = "rgba(220,228,255,0.85)";
          ctx.fillText(n.label, x, y - r - 9 * Math.min(z, 1.3));
        }
      }

      // surbrillance du nœud sélectionné
      if (this.selected) {
        const [x, y] = this.w2s(this.selected.x, this.selected.y);
        const baseR = (this.selected.keystone ? 28 : this.selected.notable ? 20 : 14) * this.cam.zoom;
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(x, y, baseR + 6, 0, Math.PI * 2); ctx.stroke();
        this.updateInfo();
      }

      if (this.flash) { this.flash.t -= 16; if (this.flash.t <= 0) this.flash = null; }
    }
  }

  AFK.TreeUI = TreeUI;
})();
