/* AFK Farm — configuration de données : raretés, biomes, projets, prestige. */
(function () {
  const AFK = (window.AFK = window.AFK || {});

  const CONST = {
    DRONE_EFF: 0.8,          // captures/s estimées par drone (HUD + offline)
    OFFLINE_CAP_BASE: 8 * 3600,
    COLLECT_DIST: 16,
    BIOME_MULT: 15,          // multiplicateur de revenu par biome
    TREE_BASE_COST: 40,      // coût de base d'un nœud d'arbre
    TREE_GROWTH: 1.135,      // croissance par nœud alloué
    PRESTIGE_DIV: 5e3,       // diviseur pour le calcul des Cores
    CORE_MULT: 0.10,         // +10% revenu global par Core
  };

  /* Unités à récolter. La valeur est multipliée par le revenu global. */
  const RARITIES = [
    { key: "common",    name: "Commun",     value: 1,    color: "#e2e8f0", glow: "#9fb4ff", weight: 70, r: 5.5 },
    { key: "rare",      name: "Rare",       value: 9,    color: "#38bdf8", glow: "#38bdf8", weight: 22, r: 6.5 },
    { key: "epic",      name: "Épique",     value: 60,   color: "#a855f7", glow: "#c084fc", weight: 6,  r: 7.5 },
    { key: "legendary", name: "Légendaire", value: 520,  color: "#fbbf24", glow: "#fde68a", weight: 2,  r: 9 },
  ];

  /* Biomes : fonds, thème de couleur, palier de Lumens, multiplicateur. */
  const BIOMES = [
    { name: "Ceinture d'astéroïdes", lumen: "Lumens",    c1: "#22d3ee", c2: "#3b82f6", accent: "#22d3ee", style: "belt" },
    { name: "Nébuleuse Pourpre",     lumen: "Photons",   c1: "#d946ef", c2: "#8b5cf6", accent: "#d946ef", style: "nebula" },
    { name: "Amas Stellaire",        lumen: "Plasma",    c1: "#fbbf24", c2: "#f97316", accent: "#fbbf24", style: "cluster" },
    { name: "Horizon du Trou Noir",  lumen: "Quanta",    c1: "#fb923c", c2: "#7c3aed", accent: "#fb923c", style: "blackhole" },
    { name: "Bras Galactique",       lumen: "Tachyons",  c1: "#34d399", c2: "#14b8a6", accent: "#34d399", style: "galaxy" },
    { name: "Singularité",           lumen: "Singulons", c1: "#f8fafc", c2: "#a78bfa", accent: "#c4b5fd", style: "singularity" },
  ];

  function biome(i) {
    if (i < BIOMES.length) return BIOMES[i];
    // au-delà : on reste en Singularité (procédural)
    const b = Object.assign({}, BIOMES[BIOMES.length - 1]);
    b.name = "Singularité +" + (i - BIOMES.length + 1);
    return b;
  }
  function biomeMult(i) {
    return Math.pow(CONST.BIOME_MULT, i);
  }

  /* Chaîne de réparation / construction (le cœur AFK).
   * Chaque projet débloque le biome (index+1), accorde un multiplicateur
   * global permanent, puis révèle le suivant. Le temps avance en temps réel,
   * même hors-ligne. */
  const PROJECTS = [
    { id: "ship",    icon: "🚀", name: "Vaisseau de récolte", desc: "Aimant de proue : double la portée du salvage.", cost: 600,    time: 15,  mult: 1.6 },
    { id: "station", icon: "🛰️", name: "Station orbitale",     desc: "Raffinerie en orbite : flux de Lumens continu.",  cost: 9e3,    time: 45,  mult: 1.8 },
    { id: "cruiser", icon: "🛸", name: "Croiseur magnétique",  desc: "Champ de classe lourde : aimante des nappes entières.", cost: 1.5e5, time: 120, mult: 2.2 },
    { id: "base",    icon: "🏙️", name: "Base planétaire",      desc: "Ancrage gravitationnel : récolte planétaire.",    cost: 2.5e6,  time: 300, mult: 2.6 },
    { id: "planet",  icon: "🪐", name: "Planète colonisée",    desc: "Noyau magnétique : un monde entier travaille pour toi.", cost: 5e7, time: 720, mult: 3.2 },
    { id: "system",  icon: "🌌", name: "Système stellaire",    desc: "Réseau d'étoiles : moisson à l'échelle stellaire.", cost: 1e9, time: 1800, mult: 4 },
  ];

  function project(i) {
    if (i < PROJECTS.length) return PROJECTS[i];
    // procédural au-delà : coût ×18, temps ×1.6, mult croissant
    const last = PROJECTS[PROJECTS.length - 1];
    const k = i - PROJECTS.length + 1;
    return {
      id: "deep" + i,
      icon: "✴️",
      name: "Nexus cosmique " + k,
      desc: "Extension du réseau magnétique galactique.",
      cost: last.cost * Math.pow(18, k),
      time: Math.min(last.time * Math.pow(1.6, k), 6 * 3600),
      mult: 4 + k * 0.5,
    };
  }

  /* Perks de prestige, achetés avec des Cores (coût exponentiel). */
  const PERKS = [
    { id: "memory",  icon: "🧠", name: "Mémoire magnétique", desc: "+8% revenu global permanent / niveau.", base: 1,  growth: 1.6, max: Infinity, val: (l) => l * 0.08 },
    { id: "fleet",   icon: "🛰️", name: "Flotte permanente",  desc: "Commence chaque cycle avec +1 drone / niveau.", base: 3,  growth: 2.2, max: 10,      val: (l) => l },
    { id: "residue", icon: "🧲", name: "Aimant résiduel",    desc: "Conserve 5% des Lumens au prestige / niveau.", base: 4,  growth: 2.5, max: 10,      val: (l) => l * 0.05 },
    { id: "warp",    icon: "⏩", name: "Distorsion temporelle", desc: "+2 h de plafond hors-ligne / niveau.",     base: 2,  growth: 1.8, max: 12,      val: (l) => l * 2 * 3600 },
  ];

  function perkCost(perk, level) {
    return Math.ceil(perk.base * Math.pow(perk.growth, level));
  }

  AFK.config = {
    CONST, RARITIES, BIOMES, PROJECTS, PERKS,
    biome, biomeMult, project, perkCost,
  };
})();
