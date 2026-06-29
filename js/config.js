/* AFK Farm — configuration de données : raretés, biomes, projets, prestige. */
(function () {
  const AFK = (window.AFK = window.AFK || {});

  const CONST = {
    DRONE_EFF: 1.5,          // captures/s estimées par drone (HUD + offline)
    DRONE_RATE: 1.5,         // grains/s absorbés par drone (récolte en ligne)
    OFFLINE_CAP_BASE: 8 * 3600,
    COLLECT_DIST: 13,
    BIOME_MULT: 15,          // multiplicateur de revenu par biome
    TREE_BASE_COST: 40,      // coût de base d'un nœud d'arbre
    TREE_GROWTH: 1.135,      // croissance par nœud alloué
    PRESTIGE_DIV: 5e3,       // diviseur pour le calcul des Cores
    CORE_MULT: 0.10,         // +10% revenu global par Core
    // session de récolte active (réglée pour un rythme fluide : le minuteur
    // limite la 1re session, l'énergie permet ~2 sessions enchaînées)
    SESSION: {
      ENERGY_MAX: 140,       // énergie de base
      ENERGY_REGEN: 10,      // régénération /s hors récolte
      ENERGY_DRAIN: 5,       // consommation /s en récolte
      TIME: 15,              // durée de session de base (s)
      STORAGE: 200,          // capacité de soute de base (grains)
      ABSORB: 16,            // débit de récolte de base (grains/s)
    },
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
   * Chaque projet est un ouvrage en PLUSIEURS PIÈCES à réparer une par une.
   * Chaque pièce a son coût et son temps (en heures de base) qui avance en
   * temps réel, même hors-ligne. Le projet terminé débloque le biome (index+1)
   * et un multiplicateur global permanent. */
  const PROJECTS = [
    { id: "ship", icon: "🚀", name: "Vaisseau de récolte", desc: "Une épave à remettre en état, pièce par pièce.", mult: 1.6, parts: [
      { name: "Coque",          icon: "🛡️", cost: 350,   time: 180 },
      { name: "Réacteur",       icon: "⚙️", cost: 1100,  time: 1200 },
      { name: "Aimant de proue", icon: "🧲", cost: 2400,  time: 2100 },
      { name: "Cockpit",        icon: "🎛️", cost: 1800,  time: 2400 },
      { name: "Boucliers",      icon: "✨", cost: 3200,  time: 2700 },
    ]},
    { id: "station", icon: "🛰️", name: "Station orbitale", desc: "Une raffinerie modulaire à assembler.", mult: 1.8, parts: [
      { name: "Anneau central",  icon: "⭕", cost: 2e4,  time: 1800 },
      { name: "Panneaux solaires", icon: "🔆", cost: 5e4, time: 3000 },
      { name: "Raffinerie",      icon: "⚗️", cost: 9e4,  time: 4200 },
      { name: "Quartiers",       icon: "🏠", cost: 7e4,  time: 3600 },
      { name: "Tour de contrôle", icon: "📡", cost: 1.4e5, time: 5400 },
    ]},
    { id: "cruiser", icon: "🛸", name: "Croiseur magnétique", desc: "Un vaisseau de classe lourde à reconstruire.", mult: 2.2, parts: [
      { name: "Carlingue",       icon: "🔩", cost: 4e5, time: 3600 },
      { name: "Propulseurs",     icon: "🚀", cost: 9e5, time: 5400 },
      { name: "Bobines magnétiques", icon: "🌀", cost: 1.6e6, time: 7200 },
      { name: "Soute géante",    icon: "📦", cost: 1.2e6, time: 6000 },
      { name: "Noyau de classe lourde", icon: "💠", cost: 2.5e6, time: 9000 },
    ]},
    { id: "base", icon: "🏙️", name: "Base planétaire", desc: "Un avant-poste à bâtir au sol.", mult: 2.6, parts: [
      { name: "Fondations",      icon: "🧱", cost: 6e6, time: 5400 },
      { name: "Dôme",            icon: "🛖", cost: 1.4e7, time: 8000 },
      { name: "Réseau d'extraction", icon: "⛏️", cost: 2.2e7, time: 10800 },
      { name: "Centrale",        icon: "🏭", cost: 3e7, time: 12600 },
    ]},
    { id: "planet", icon: "🪐", name: "Planète colonisée", desc: "Réveiller le noyau magnétique d'un monde.", mult: 3.2, parts: [
      { name: "Atmosphère",      icon: "🌫️", cost: 1.2e8, time: 9000 },
      { name: "Océans",          icon: "🌊", cost: 2.6e8, time: 12600 },
      { name: "Cités",           icon: "🌆", cost: 4e8, time: 16200 },
      { name: "Noyau magnétique", icon: "🧲", cost: 6e8, time: 21600 },
    ]},
    { id: "system", icon: "🌌", name: "Système stellaire", desc: "Tisser un réseau à l'échelle des étoiles.", mult: 4, parts: [
      { name: "Relais stellaires", icon: "✴️", cost: 2.5e9, time: 14400 },
      { name: "Sphère de Dyson",  icon: "🔆", cost: 6e9, time: 21600 },
      { name: "Portail",          icon: "🌀", cost: 1.2e10, time: 28800 },
    ]},
  ];

  function project(i) {
    if (i < PROJECTS.length) return PROJECTS[i];
    // procédural au-delà : coût ×16, temps ×1.4 par palier
    const last = PROJECTS[PROJECTS.length - 1];
    const k = i - PROJECTS.length + 1;
    const cm = Math.pow(16, k), tm = Math.pow(1.4, k);
    return {
      id: "deep" + i, icon: "✴️", name: "Nexus cosmique " + k,
      desc: "Extension du réseau magnétique galactique.", mult: 4 + k * 0.6,
      parts: last.parts.map((p, j) => ({
        name: p.name, icon: p.icon, cost: p.cost * cm, time: Math.min(p.time * tm, 6 * 3600),
      })),
    };
  }

  function projectCost(p) { return p.parts.reduce((a, b) => a + b.cost, 0); }
  function projectTotalTime(p) { return p.parts.reduce((a, b) => a + b.time, 0); }

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
    biome, biomeMult, project, projectCost, projectTotalTime, perkCost,
  };
})();
