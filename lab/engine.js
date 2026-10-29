/* Pure, seeded harvest experiment. No economy, storage or DOM dependencies. */
(function (root) {
  const defaults = { spacing: 72, radius: 120, speed: 210, respawn: 2.6, mode: 'mixed', physics: 'flow', seed: 42 };
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  class Experiment {
    constructor(width, height, options) {
      this.width = width; this.height = height; this.options = { ...defaults, ...options };
      this.random = rng(this.options.seed); this.time = 0; this.captures = 0; this.firstCapture = null; this.distance = 0; this.lastPointer = null;
      this.nodes = []; this.events = []; this.poles = []; this.surgeUntil = 0; this.surgeReady = 0;
      // Similar local density across devices; explicit ceiling keeps the lab inexpensive.
      this.target = Math.min(160, Math.max(1, Math.floor(width * height / (this.options.spacing ** 2 * 2))));
      for (let i = 0; i < this.target; i++) { const p = this.position(); if (!p) break; this.nodes.push({ ...p, ax: p.x, ay: p.y, vx: 0, vy: 0, cooldown: 0, age: 1, rarity: this.rarity() }); }
    }
    rarity() { const r = this.random(); return r < .70 ? 0 : r < .92 ? 1 : r < .98 ? 2 : 3; }
    position(except) {
      const margin = 14;
      for (let k = 0; k < 600; k++) {
        const p = { x: margin + this.random() * Math.max(0, this.width - margin * 2), y: margin + this.random() * Math.max(0, this.height - margin * 2) };
        if (this.nodes.every(n => n === except || Math.hypot(n.ax - p.x, n.ay - p.y) >= this.options.spacing)) return p;
      }
      return null; // Never violate separation to satisfy a requested count.
    }
    addPole(x, y) { if (this.poles.length === 6) this.poles.shift(); this.poles.push({ x, y, until: this.time + 11 }); }
    surge() { if (this.time < this.surgeReady) return false; this.surgeUntil = this.time + 3; this.surgeReady = this.time + 12; return true; }
    sources(pointer) {
      const out = this.poles.map(p => ({ ...p, radius: this.options.radius, speed: this.options.speed * .8 }));
      if (pointer.active) out.unshift({ ...pointer, radius: this.options.radius * (this.time < this.surgeUntil ? 2.4 : 1), speed: this.options.speed * (this.time < this.surgeUntil ? 2.4 : 1) });
      return out;
    }
    step(dt, pointer) {
      this.events = [];
      if (!Number.isFinite(dt) || dt <= 0) return;
      if (pointer.active) { if (this.lastPointer) this.distance += Math.hypot(pointer.x - this.lastPointer.x, pointer.y - this.lastPointer.y); this.lastPointer = { ...pointer }; } else this.lastPointer = null;
      // Fixed upper substep for comparable 30/60/120 Hz physics.
      let remaining = Math.min(dt, .25);
      while (remaining > 1e-8) { const h = Math.min(remaining, 1 / 120); this.integrate(h, pointer); remaining -= h; }
    }
    integrate(dt, pointer) {
      this.time += dt; this.poles = this.poles.filter(p => p.until > this.time);
      const sources = this.sources(pointer);
      for (const n of this.nodes) {
        if (n.cooldown > 0) {
          n.cooldown -= dt;
          if (n.cooldown <= 0) {
            if (this.options.mode === 'new' || (this.options.mode === 'mixed' && this.random() < .5)) { const p = this.position(n); if (p) { n.ax = p.x; n.ay = p.y; } }
            n.x = n.ax; n.y = n.ay; n.vx = n.vy = 0; n.rarity = this.rarity(); n.age = 0;
          }
          continue;
        }
        n.age += dt;
        if (n.age < .3) continue; // Visible appearance before a new capture.
        let target = null, best = Infinity;
        for (const s of sources) { const d = Math.hypot(s.x - n.x, s.y - n.y); if (d < s.radius && d < best) { best = d; target = s; } }
        if (target && best <= 12) {
          this.captures++; if (this.firstCapture === null) this.firstCapture = this.time;
          this.events.push({ x: n.x, y: n.y, rarity: n.rarity }); n.cooldown = this.options.respawn; n.vx = n.vy = 0; continue;
        }
        const flow = this.options.physics === 'flow';
        if (target) {
          const speed = target.speed * (.18 + .82 * (1 - best / target.radius));
          const alpha = 1 - Math.exp(-dt * 12);
          n.vx += ((target.x - n.x) / best * speed - n.vx) * alpha;
          n.vy += ((target.y - n.y) / best * speed - n.vy) * alpha;
        } else { const damping = Math.exp(-dt * 8); n.vx *= damping; n.vy *= damping; }
        // Spring variant is a comparison, not an exact replay of the original engine.
        if (!flow || !target) { n.vx += (n.ax - n.x) * dt * (flow ? 2 : 12); n.vy += (n.ay - n.y) * dt * (flow ? 2 : 12); }
        n.x = Math.max(8, Math.min(this.width - 8, n.x + n.vx * dt));
        n.y = Math.max(8, Math.min(this.height - 8, n.y + n.vy * dt));
      }
    }
  }
  root.HarvestLab = { Experiment, defaults };
  if (typeof module !== 'undefined') module.exports = root.HarvestLab;
})(typeof globalThis !== 'undefined' ? globalThis : window);
