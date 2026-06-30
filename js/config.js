/* AFK Farm — configuration de données : raretés, biomes, projets, prestige. */
(function () {
  const AFK = (window.AFK = window.AFK || {});

  const CONST = {
    DRONE_EFF: 0.5,          // lumens/s estimés par drone (récolte auto)
    LUMEN_COUNT: 40,         // nombre de points-Lumens ancrés dans la grille
    REPOP_BASE: 2600,        // délai de repop d'un lumen récolté (ms)
    OFFLINE_CAP_BASE: 8 * 3600,
    COLLECT_DIST: 14,
    BIOME_MULT: 12,          // multiplicateur de revenu par biome
    TREE_BASE_COST: 25,      // coût de base d'un nœud d'arbre
    TREE_GROWTH: 1.12,       // croissance par nœud alloué
    PRESTIGE_DIV: 1e4,       // diviseur pour le calcul des Cores
    CORE_MULT: 0.10,         // +10% revenu global par Core
    // session de récolte active (réglée pour un rythme fluide : le minuteur
    // limite la 1re session, l'énergie permet ~2 sessions enchaînées)
    SESSION: {
      ENERGY_MAX: 140,       // énergie de base
      ENERGY_REGEN: 10,      // régénération /s hors récolte
      ENERGY_DRAIN: 5,       // consommation /s en récolte
      TIME: 15,              // durée de session de base (s)
      STORAGE: 120,          // capacité de soute (nombre de lumens récoltés)
    },
  };

  /* Unités à récolter. La valeur est multipliée par le revenu global. */
  const RARITIES = [
    { key: "common",    name: "Commun",     value: 1,   color: "#8aa0c8", glow: "#aab8e0", weight: 70, r: 5 },
    { key: "rare",      name: "Rare",       value: 5,   color: "#56d6ff", glow: "#8fe3ff", weight: 22, r: 6 },
    { key: "epic",      name: "Épique",     value: 22,  color: "#b98cff", glow: "#d3b6ff", weight: 6,  r: 7 },
    { key: "legendary", name: "Légendaire", value: 90,  color: "#ffcf6b", glow: "#ffe19a", weight: 2,  r: 8.5 },
  ];

  /* Biomes : couleurs d'accent (recolore tout l'UI), fond animé, palier, et un
   * MODIFICATEUR de mécanique propre (au-delà du simple recolor + ×12). */
  const BIOMES = [
    { name: "Ceinture d'astéroïdes", lumen: "Lumens",    accent: "#34e0ce", accent2: "#7cf5e4", soft: "rgba(52,224,206,.16)",  bg0: "#070a14", bg1: "#0b0f1e", style: "belt",
      tag: "Champ stable — terrain d'apprentissage.", mod: {} },
    { name: "Nébuleuse Pourpre",     lumen: "Photons",   accent: "#c77dff", accent2: "#e6b8ff", soft: "rgba(199,125,255,.16)", bg0: "#0c0814", bg1: "#150b22", style: "nebula",
      tag: "Brume dense — grille élargie (+18 points), mais repop plus lent.", mod: { lumenBonus: 18, repopMult: 1.3 } },
    { name: "Amas Stellaire",        lumen: "Plasma",    accent: "#5b9dff", accent2: "#a8c8ff", soft: "rgba(91,157,255,.16)",  bg0: "#070b18", bg1: "#0a1230", style: "cluster",
      tag: "Rareté accrue — bien plus de Lumens précieux.", mod: { luckBonus: 4 } },
    { name: "Horizon du Trou Noir",  lumen: "Quanta",    accent: "#ff9e5b", accent2: "#ffce9e", soft: "rgba(255,158,91,.15)",  bg0: "#100a08", bg1: "#1c1109", style: "blackhole",
      tag: "Gravité intense — aimant ×1,5, mais soute réduite (−30 %).", mod: { pullMult: 1.5, storageMult: 0.7 } },
    { name: "Bras Galactique",       lumen: "Tachyons",  accent: "#5be5a0", accent2: "#a8f5cf", soft: "rgba(91,229,160,.15)",  bg0: "#06120e", bg1: "#0a1f17", style: "galaxy",
      tag: "Royaume des drones — puissance des drones ×1,6.", mod: { dronePowerMult: 1.6 } },
    { name: "Singularité",           lumen: "Singulons", accent: "#d9c7ff", accent2: "#ffffff", soft: "rgba(217,199,255,.18)", bg0: "#0a0a12", bg1: "#12121f", style: "singularity",
      tag: "Tout amplifié — plafond de combo +2, mais énergie consommée plus vite.", mod: { comboCapBonus: 2, energyDrainMult: 1.4 } },
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
      { name: "Coque",          icon: "🛡️", cost: 300,   time: 90 },
      { name: "Réacteur",       icon: "⚙️", cost: 900,   time: 360 },
      { name: "Aimant de proue", icon: "🧲", cost: 2000,  time: 540 },
      { name: "Cockpit",        icon: "🎛️", cost: 1600,  time: 720 },
      { name: "Boucliers",      icon: "✨", cost: 2800,  time: 900 },
    ]},
    { id: "station", icon: "🛰️", name: "Station orbitale", desc: "Une raffinerie modulaire à assembler.", mult: 1.8, parts: [
      { name: "Anneau central",  icon: "⭕", cost: 2e4,  time: 900 },
      { name: "Panneaux solaires", icon: "🔆", cost: 5e4, time: 1500 },
      { name: "Raffinerie",      icon: "⚗️", cost: 9e4,  time: 2400 },
      { name: "Quartiers",       icon: "🏠", cost: 7e4,  time: 2100 },
      { name: "Tour de contrôle", icon: "📡", cost: 1.4e5, time: 3000 },
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

  // Les coûts de projet suivent la courbe de revenu (qui compounde plus vite
  // que le ×12 du biome à cause du snowball de l'arbre). Rampe conservatrice :
  // financer un projet ≈ quelques sessions à chaque biome, jamais un mur.
  const COST_RAMP = 3.2;     // facteur de coût supplémentaire par biome
  const COST_BASE = 2.5;     // tension d'épargne de base
  function costScale(i) { return COST_BASE * Math.pow(COST_RAMP, i); }

  function project(i) {
    let base, name, icon, desc, mult, tm = 1;
    if (i < PROJECTS.length) {
      base = PROJECTS[i]; name = base.name; icon = base.icon; desc = base.desc; mult = base.mult;
    } else {
      base = PROJECTS[PROJECTS.length - 1];
      const k = i - PROJECTS.length + 1;
      name = "Nexus cosmique " + k; icon = "✴️";
      desc = "Extension du réseau magnétique galactique."; mult = 4 + k * 0.6;
      tm = Math.pow(1.4, k);
    }
    const cs = costScale(i);
    return {
      id: i < PROJECTS.length ? PROJECTS[i].id : "deep" + i, icon, name, desc, mult,
      parts: base.parts.map((p) => ({
        name: p.name, icon: p.icon,
        cost: Math.round(p.cost * cs),
        time: Math.min(Math.round(p.time * tm), 6 * 3600),
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
