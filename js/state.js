/* AFK Farm — état global, sauvegarde, migration et utilitaires partagés */
(function () {
  const AFK = (window.AFK = window.AFK || {});

  const SAVE_KEY = "afk-farm-save-v3";
  const OLD_KEYS = ["afk-farm-save-v1", "afk-farm-save-v2"];

  function defaultState() {
    return {
      v: 3,
      lumens: 0,
      totalRun: 0,        // Lumens gagnés depuis le dernier prestige
      totalEver: 0,       // Lumens gagnés depuis toujours
      collected: 0,       // unités récoltées
      biome: 0,           // index du biome courant
      cores: 0,           // monnaie de prestige
      prestiges: 0,
      bestBiome: 0,
      energy: 120,        // énergie de récolte courante
      nodes: { "core": 1 },   // nœuds d'arbre alloués (id -> 1)
      perks: {},          // perks de prestige (id -> niveau)
      projects: {},       // état des projets : id -> {pi, p, building}
      projectIndex: 0,    // projet courant dans la chaîne
      lastSave: Date.now(),
    };
  }

  function migrate(data) {
    const base = defaultState();
    if (!data || typeof data !== "object") return base;
    // fusion superficielle prudente
    for (const k in base) {
      if (data[k] === undefined) continue;
      if (typeof base[k] === "object" && base[k] !== null && !Array.isArray(base[k])) {
        base[k] = Object.assign(base[k], data[k]);
      } else {
        base[k] = data[k];
      }
    }
    base.nodes = base.nodes || { core: 1 };
    base.nodes.core = 1;
    return base;
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) {}
    return defaultState();
  }

  function save(state) {
    state.lastSave = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function wipe() {
    try {
      localStorage.removeItem(SAVE_KEY);
      for (const k of OLD_KEYS) localStorage.removeItem(k);
    } catch (e) {}
  }

  /* Formatage compact : 1234 -> 1.23k ; 2.5e6 -> 2.50M ; puis notation aaa/bbb */
  const SUFFIX = ["", "k", "M", "B", "T", "q", "Q", "s", "S", "O", "N", "d"];
  function fmt(n) {
    if (!isFinite(n)) return "∞";
    if (n < 0) return "-" + fmt(-n);
    if (n < 1000) return n < 10 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toString();
    let i = 0;
    while (n >= 1000 && i < SUFFIX.length - 1) { n /= 1000; i++; }
    if (i >= SUFFIX.length - 1 && n >= 1000) {
      // au-delà : notation scientifique compacte
      return n.toExponential(2).replace("e+", "e");
    }
    const dec = n < 10 ? 2 : n < 100 ? 1 : 0;
    return n.toFixed(dec) + SUFFIX[i];
  }

  function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    if (s < 60) return s + "s";
    if (s < 3600) return Math.floor(s / 60) + "m " + (s % 60) + "s";
    const h = Math.floor(s / 3600);
    return h + "h " + Math.floor((s % 3600) / 60) + "m";
  }

  /* PRNG déterministe (mulberry32) + hash de chaîne */
  function hashStr(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  AFK.state = { defaultState, load, save, wipe, fmt, fmtTime, SAVE_KEY, migrate };
  AFK.util = { hashStr, mulberry32, clamp };
})();
