/* AFK Farm — configuration : raretés des unités et arbre d'améliorations */
(function () {
  const AFK = (window.AFK = window.AFK || {});

  /* Unités à récolter. Le poids module la fréquence d'apparition. */
  const RARITIES = [
    { key: "common",    name: "Commun",      value: 1,   color: "#e2e8f0", glow: "#9fb4ff", weight: 70, r: 5.5 },
    { key: "rare",      name: "Rare",        value: 7,   color: "#38bdf8", glow: "#38bdf8", weight: 22, r: 6.5 },
    { key: "epic",      name: "Épique",      value: 35,  color: "#a855f7", glow: "#c084fc", weight: 6,  r: 7.5 },
    { key: "legendary", name: "Légendaire",  value: 220, color: "#fbbf24", glow: "#fde68a", weight: 2,  r: 9 },
  ];

  /*
   * Améliorations. `effect(level)` renvoie la valeur dérivée affichée + utilisée
   * par le jeu. `cost(level)` = baseCost * growth^level.
   */
  const UPGRADES = [
    {
      id: "radius",
      icon: "🧲",
      name: "Champ magnétique",
      desc: "Élargit le rayon d'attraction du pôle.",
      baseCost: 15,
      growth: 1.16,
      max: Infinity,
      effect: (lvl) => 130 + lvl * 20,
      label: (lvl) => "Rayon " + Math.round(130 + lvl * 20) + " px",
    },
    {
      id: "strength",
      icon: "⚡",
      name: "Force magnétique",
      desc: "Aspire les unités plus vite et de plus loin.",
      baseCost: 25,
      growth: 1.19,
      max: Infinity,
      effect: (lvl) => 0.55 + lvl * 0.22,
      label: (lvl) => "Force ×" + (1 + lvl * 0.4).toFixed(1),
    },
    {
      id: "density",
      icon: "✦",
      name: "Densité du champ",
      desc: "Davantage d'unités flottent sur le terrain.",
      baseCost: 40,
      growth: 1.22,
      max: Infinity,
      effect: (lvl) => 26 + lvl * 6,
      label: (lvl) => Math.round(26 + lvl * 6) + " unités max",
    },
    {
      id: "refine",
      icon: "💎",
      name: "Raffinage",
      desc: "Chaque unité récoltée vaut davantage de Lumens.",
      baseCost: 60,
      growth: 1.28,
      max: Infinity,
      effect: (lvl) => 1 + lvl * 0.5,
      label: (lvl) => "Valeur ×" + (1 + lvl * 0.5).toFixed(1),
    },
    {
      id: "drones",
      icon: "🛰️",
      name: "Drone autonome",
      desc: "Un pôle qui chasse et récolte tout seul (AFK).",
      baseCost: 220,
      growth: 1.55,
      max: 12,
      effect: (lvl) => lvl,
      label: (lvl) => lvl + " drone" + (lvl > 1 ? "s" : "") + " actif" + (lvl > 1 ? "s" : ""),
    },
    {
      id: "luck",
      icon: "🎲",
      name: "Polarité rare",
      desc: "Augmente les chances d'unités rares et précieuses.",
      baseCost: 180,
      growth: 1.45,
      max: 25,
      effect: (lvl) => lvl,
      label: (lvl) => "+" + (lvl * 18) + "% de rareté",
    },
  ];

  function cost(up, level) {
    return Math.floor(up.baseCost * Math.pow(up.growth, level));
  }

  AFK.config = { RARITIES, UPGRADES, cost };
})();
