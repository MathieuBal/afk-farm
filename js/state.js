/* AFK Farm — état global, sauvegarde et utilitaires partagés */
(function () {
  const AFK = (window.AFK = window.AFK || {});

  const SAVE_KEY = "afk-farm-save-v1";

  function defaultState() {
    return {
      lumens: 0,
      totalCollected: 0,
      levels: { radius: 0, strength: 0, density: 0, refine: 0, drones: 0, luck: 0 },
      lastSave: Date.now(),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultState();
      const data = JSON.parse(raw);
      const base = defaultState();
      return {
        lumens: Number(data.lumens) || 0,
        totalCollected: Number(data.totalCollected) || 0,
        levels: Object.assign(base.levels, data.levels || {}),
        lastSave: Number(data.lastSave) || Date.now(),
      };
    } catch (e) {
      return defaultState();
    }
  }

  function save(state) {
    state.lastSave = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      /* quota / private mode — on ignore */
    }
  }

  function wipe() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {}
  }

  /* Formatage compact : 1234 -> 1.23k, 2_500_000 -> 2.50M */
  function fmt(n) {
    if (!isFinite(n)) return "∞";
    if (n < 1000) return Math.floor(n).toString();
    const units = ["k", "M", "B", "T", "q", "Q", "s", "S"];
    let i = -1;
    while (n >= 1000 && i < units.length - 1) {
      n /= 1000;
      i++;
    }
    const dec = n < 10 ? 2 : n < 100 ? 1 : 0;
    return n.toFixed(dec) + units[i];
  }

  AFK.state = { defaultState, load, save, wipe, fmt, SAVE_KEY };
})();
