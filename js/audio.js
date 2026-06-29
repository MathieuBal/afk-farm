/* AFK Farm — audio synthétisé (Web Audio), façon Lootchest. Aucun fichier. */
(function () {
  const AFK = (window.AFK = window.AFK || {});
  const KEY = "afk-audio";

  let ctx = null, master = null;
  let enabled = (localStorage.getItem(KEY) || "1") === "1";

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }

  function tone(freq, dur, opt) {
    if (!enabled || !ctx) return;
    opt = opt || {};
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opt.type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slide), t + dur);
    const vol = opt.vol == null ? 0.25 : opt.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function arp(freqs, step, opt) {
    if (!enabled || !ctx) return;
    freqs.forEach((f, i) => setTimeout(() => tone(f, opt && opt.dur || 0.14, opt), i * step));
  }

  const PENT = [523.25, 587.33, 659.25, 783.99, 880.0]; // do ré mi sol la

  const api = {
    init,
    isEnabled: () => enabled,
    toggle() {
      enabled = !enabled;
      localStorage.setItem(KEY, enabled ? "1" : "0");
      if (enabled) { init(); api.tap(); }
      return enabled;
    },
    collect(rarity) {
      // hauteur selon la rareté (0..3)
      const base = [659, 784, 988, 1319][rarity] || 659;
      tone(base, 0.09, { type: "triangle", vol: 0.12 + rarity * 0.04 });
    },
    combo(level) {
      const f = 600 + Math.min(level, 40) * 22;
      tone(f, 0.06, { type: "square", vol: 0.06 });
    },
    bank(big) {
      arp([523, 659, 784, big ? 1047 : 880], 55, { type: "triangle", vol: 0.2, dur: 0.18 });
    },
    buy() { tone(880, 0.05, { type: "square", vol: 0.12, slide: 1320 }); },
    tap() { tone(440, 0.04, { type: "sine", vol: 0.08 }); },
    error() { tone(200, 0.12, { type: "sawtooth", vol: 0.12, slide: 120 }); },
    surge() {
      tone(180, 0.4, { type: "sawtooth", vol: 0.18, slide: 900 });
      tone(360, 0.4, { type: "sine", vol: 0.12, slide: 1400 });
    },
    part() { arp([523, 784], 70, { type: "triangle", vol: 0.18, dur: 0.2 }); },
    project() { arp([523, 659, 784, 1047, 1319], 80, { type: "triangle", vol: 0.24, dur: 0.26 }); },
    prestige() { arp([1319, 1047, 784, 659, 523, 659, 880, 1319], 90, { type: "sine", vol: 0.24, dur: 0.3 }); },
    achievement() { arp([784, 988, 1319], 70, { type: "triangle", vol: 0.2, dur: 0.22 }); },
  };

  AFK.audio = api;
})();
