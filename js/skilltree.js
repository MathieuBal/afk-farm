/* AFK Farm — arbre de compétences façon PoE, généré de façon déterministe.
 * 6 branches THÉMATIQUES nommées et colorées, chacune avec son keystone-repère,
 * + forks et liens croisés. Nœuds payés en Lumens (coût exponentiel). */
(function () {
  const AFK = (window.AFK = window.AFK || {});
  const { mulberry32, hashStr } = AFK.util;

  const ARMS = 7;
  const NODES_PER_ARM = 84;
  const RING_GAP = 78;
  const FORK_EVERY = 3;
  const NOTABLE_EVERY = 6;
  const KEYSTONE_RING = 8;      // chaque branche a son keystone-repère ici
  const KEYSTONE_EVERY = 26;    // keystones aléatoires plus profonds
  const CROSS_EVERY = 4;

  // Identité des 6 branches : nom, couleur, keystone, et pool thématique de
  // nœuds mineurs (cohérence : une branche a une vraie spécialité).
  const BRANCHES = [
    { name: "Affinité",    color: "#34e0ce", key: "nova",       pool: ["value", "value", "luck"] },
    { name: "Réacteur",    color: "#f6c75e", key: "perpetual",  pool: ["energy", "regen", "efficiency"] },
    { name: "Logistique",  color: "#56d6ff", key: "stockpile",  pool: ["storage", "build", "density"] },
    { name: "Chronologie", color: "#b79cff", key: "overdrive",  pool: ["time", "time", "efficiency"] },
    { name: "Essaim",      color: "#5be5a0", key: "swarm",      pool: ["drone_power", "drone_power", "luck"] },
    { name: "Aimantation", color: "#ff9e5b", key: "overload",   pool: ["strength", "radius", "value"] },
    { name: "Réseau",      color: "#f472b6", key: "hypergrid",  pool: ["gridpoint", "gridpoint", "repopfast"] },
  ];
  function branch(arm) { return BRANCHES[((arm % ARMS) + ARMS) % ARMS]; }

  const TYPES = {
    value:       { label: "Affinité",       icon: "✦",  apply: (s) => (s.value += 0.10) },
    radius:      { label: "Portée",         icon: "🧲", apply: (s) => (s.radius += 0.04) },
    strength:    { label: "Force",          icon: "💪", apply: (s) => (s.strength += 0.10) },
    density:     { label: "Conductivité",   icon: "✺",  apply: (s) => (s.density += 0.5) },
    luck:        { label: "Polarité",       icon: "🎲", apply: (s) => (s.luck += 1) },
    drone_power: { label: "Servomoteur",    icon: "🛰️", apply: (s) => (s.dronePower += 0.15) },
    build:       { label: "Ingénierie",     icon: "🔧", apply: (s) => (s.build += 0.12) },
    energy:      { label: "Capacité",       icon: "⚡", apply: (s) => (s.energy += 25) },
    regen:       { label: "Régénération",   icon: "🔋", apply: (s) => (s.regen += 1.5) },
    efficiency:  { label: "Efficience",     icon: "♻️", apply: (s) => (s.efficiency += 0.15) },
    time:        { label: "Chronométrie",   icon: "⏱️", apply: (s) => (s.time += 2) },
    storage:     { label: "Soute",          icon: "📦", apply: (s) => (s.storage += 15) },
    gridpoint:   { label: "Maillage",       icon: "🕸️", apply: (s) => (s.lumenPoints += 1) },
    repopfast:   { label: "Résonateur",     icon: "🔆", apply: (s) => (s.repop += 1) },
    // notables
    value_n:     { label: "Cœur d'ambre",   icon: "💠", notable: true, apply: (s) => (s.value += 0.55) },
    dronebay:    { label: "Baie de drones", icon: "🚀", notable: true, apply: (s) => { s.drones += 1; s.dronePower += 0.3; } },
    magnitude:   { label: "Magnétar",       icon: "🌀", notable: true, apply: (s) => { s.radius += 0.15; s.strength += 0.20; } },
    fortune:     { label: "Étoile chanceuse", icon: "🍀", notable: true, apply: (s) => (s.luck += 4) },
    refinery:    { label: "Raffinerie",     icon: "⚗️", notable: true, apply: (s) => { s.value += 0.30; s.build += 0.30; } },
    battery:     { label: "Réacteur",       icon: "🔌", notable: true, apply: (s) => { s.energy += 70; s.regen += 2; } },
    warehouse:   { label: "Entrepôt",       icon: "🏭", notable: true, apply: (s) => (s.storage += 50) },
    chrono:      { label: "Dilatateur",     icon: "🕰️", notable: true, apply: (s) => (s.time += 8) },
    resonance:   { label: "Résonance",      icon: "〰️", notable: true, apply: (s) => (s.comboCap += 1) },
    // keystones : effet de spécialité + multiplicateur de revenu global (gmult)
    // — c'est la source du « snowball mesuré » (rares et chers).
    overload:    { label: "Surcharge",      icon: "💥", keystone: true, gmult: 1.08, apply: (s) => { s.value += 1.0; s.radius -= 0.35; } },
    swarm:       { label: "Essaim",         icon: "🐝", keystone: true, gmult: 1.08, apply: (s) => { s.drones += 2; s.dronePower += 0.6; } },
    nova:        { label: "Nova",           icon: "🌟", keystone: true, gmult: 1.08, apply: (s) => { s.value += 0.30; s.density += 1; } },
    perpetual:   { label: "Perpétuel",      icon: "♾️", keystone: true, gmult: 1.08, apply: (s) => { s.regen += 7; s.efficiency += 0.5; } },
    stockpile:   { label: "Cale béante",    icon: "🛢️", keystone: true, gmult: 1.08, apply: (s) => { s.storage += 100; s.build += 0.35; } },
    overdrive:   { label: "Surrégime",      icon: "🏁", keystone: true, gmult: 1.08, apply: (s) => { s.time += 6; s.energy += 60; } },
    hypergrid:   { label: "Hypergrille",    icon: "🌐", keystone: true, gmult: 1.08, apply: (s) => { s.lumenPoints += 4; s.repop += 2; } },
  };

  const DESC = {
    core: "Cœur de l’arbre : point de départ commun à toutes les branches.",
    value: "+10 % valeur de récolte",
    radius: "+4 % portée d'attraction",
    strength: "+10 % force d'attraction",
    density: "+1 point-Lumen sur la grille",
    luck: "+1 polarité (grains plus rares)",
    drone_power: "+15 % puissance des drones",
    build: "+12 % vitesse de construction",
    energy: "+25 énergie maximale",
    regen: "+1,5 énergie / s",
    efficiency: "+15 % efficience (moins d'énergie consommée)",
    time: "+2 s de durée de session",
    storage: "+15 capacité de soute",
    gridpoint: "+1 point-Lumen sur la grille",
    repopfast: "Réduit le délai de repop : 2,4 s ÷ (1 + 0,06 par point), plancher 0,6 s",
    value_n: "+55 % valeur de récolte",
    dronebay: "+1 drone et +30 % de puissance",
    magnitude: "+15 % portée et +20 % force",
    fortune: "+4 polarité",
    refinery: "+30 % valeur et +30 % construction",
    battery: "+70 énergie max et +2 régénération",
    warehouse: "+50 capacité de soute",
    chrono: "+8 s de durée de session",
    resonance: "+1 au plafond de combo (multiplicateur max plus élevé)",
    overload: "KEYSTONE — +8 % au bonus global des keystones, +100 % valeur, mais −35 % portée",
    swarm: "KEYSTONE — +8 % au bonus global des keystones, +2 drones et +60 % puissance",
    nova: "KEYSTONE — +8 % au bonus global des keystones, +30 % valeur et +2 points-Lumens",
    perpetual: "KEYSTONE — +8 % au bonus global des keystones, +7 régénération et +50 % efficience",
    stockpile: "KEYSTONE — +8 % au bonus global des keystones, +100 soute et +35 % construction",
    overdrive: "KEYSTONE — +8 % au bonus global des keystones, +6 s de session et +60 énergie max",
    hypergrid: "KEYSTONE — +8 % au bonus global des keystones, +4 points-Lumens et +2 résonateurs",
  };
  function effectText(node) { return DESC[node.type] || ""; }

  const MINOR = ["value", "radius", "strength", "density", "luck", "drone_power", "build", "energy", "regen", "efficiency", "time", "storage", "gridpoint", "repopfast"];
  const NOTABLES = ["value_n", "dronebay", "magnitude", "fortune", "refinery", "battery", "warehouse", "chrono", "resonance"];
  const KEYSTONES = ["overload", "swarm", "nova", "perpetual", "stockpile", "overdrive", "hypergrid"];

  function pick(rng, arr) { return arr[(rng() * arr.length) | 0]; }

  function makeNode(id, x, y, ring, arm) {
    const rng = mulberry32(hashStr(id));
    const br = branch(arm);
    let type;
    if (ring === KEYSTONE_RING) {
      type = br.key;                                  // keystone-repère de la branche
    } else if (ring > 0 && ring % KEYSTONE_EVERY === 0) {
      type = pick(rng, KEYSTONES);
    } else if (ring > 0 && ring % NOTABLE_EVERY === 0) {
      type = pick(rng, NOTABLES);
    } else {
      // cohérence : surtout le pool thématique de la branche, un peu de variété
      type = rng() < 0.8 ? pick(rng, br.pool) : pick(rng, MINOR);
    }
    const def = TYPES[type];
    return {
      id, x, y, ring, arm, type,
      label: def.label, icon: def.icon, branch: br.name, bcol: br.color,
      notable: !!def.notable, keystone: !!def.keystone,
      costMult: def.keystone ? 8 : def.notable ? 3 : ({radius:1.4,density:2,gridpoint:2,time:1.5}[type] || 1),
      links: [],
    };
  }

  function build() {
    const byId = new Map();
    const list = [];
    function add(n) { byId.set(n.id, n); list.push(n); return n; }
    function link(a, b) {
      const na = byId.get(a), nb = byId.get(b);
      if (na && nb) {
        if (!na.links.includes(b)) na.links.push(b);
        if (!nb.links.includes(a)) nb.links.push(a);
      }
    }

    const core = makeNode("core", 0, 0, 0, 0);
    core.type = "core"; core.label = "Cœur magnétique"; core.icon = "✷";
    core.notable = false; core.keystone = false; core.costMult = 0;
    core.branch = "Origine"; core.bcol = "#cfe0ff";
    add(core);

    const branchLabels = [];
    for (let a = 0; a < ARMS; a++) {
      const base = (a / ARMS) * Math.PI * 2 - Math.PI / 2;
      const br = branch(a);
      branchLabels.push({ name: br.name, color: br.color, x: Math.cos(base) * RING_GAP * 2.4, y: Math.sin(base) * RING_GAP * 2.4 });
      let prev = "core";
      for (let i = 0; i < NODES_PER_ARM; i++) {
        const ring = i + 1;
        const rng = mulberry32(hashStr("pos" + a + "_" + i));
        const wob = (rng() - 0.5) * 0.18;
        const ang = base + wob + Math.sin(i * 0.5) * 0.05;
        const rad = ring * RING_GAP;
        const id = "a" + a + "_" + i;
        const n = makeNode(id, Math.cos(ang) * rad, Math.sin(ang) * rad, ring, a);
        add(n);
        link(prev, id);
        prev = id;

        if (i > 0 && i % FORK_EVERY === 0) {
          const side = (rng() < 0.5 ? 1 : -1);
          const fid = id + "f";
          const fang = ang + side * 0.34;
          const frad = rad + RING_GAP * 0.46;
          const fn = makeNode(fid, Math.cos(fang) * frad, Math.sin(fang) * frad, ring, a);
          if (i % NOTABLE_EVERY !== 0 && ring !== KEYSTONE_RING) {
            fn.type = pick(rng, NOTABLES);
            const d = TYPES[fn.type];
            fn.label = d.label; fn.icon = d.icon; fn.notable = true; fn.keystone = false; fn.costMult = 3;
          }
          add(fn);
          link(id, fid);
        }


      }
    }

    // Connect only after all arms exist (the old single pass missed six joins).
    for(let a=0;a<ARMS;a++)for(let i=CROSS_EVERY;i<NODES_PER_ARM;i+=CROSS_EVERY)
      link('a'+a+'_'+i,'a'+((a+1)%ARMS)+'_'+i);
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    for (const n of list) {
      if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
    }
    return { byId, list, branchLabels, bounds: { minX, minY, maxX, maxY } };
  }

  function aggregate(tree, allocated) {
    const s = { value: 0, radius: 0, strength: 0, density: 0, luck: 0, dronePower: 0, build: 0, drones: 0,
      energy: 0, regen: 0, efficiency: 0, time: 0, storage: 0, comboCap: 0, keyMult: 1, count: 0,
      lumenPoints: 0, repop: 0 };
    for (const id in allocated) {
      if (id === "core") continue;
      const n = tree.byId.get(id);
      if (!n) continue;
      const def = TYPES[n.type];
      if (def && def.apply) def.apply(s);
      if (def && def.gmult) s.keyMult += def.gmult - 1;   // keystones = snowball multiplicatif
      s.count += 1;
    }
    return s;
  }

  function canAllocate(tree, allocated, id) {
    if (allocated[id]) return false;
    const n = tree.byId.get(id);
    if (!n) return false;
    if (n.id === "core") return false;
    for (const l of n.links) if (allocated[l]) return true;
    return false;
  }

  AFK.tree = { build, aggregate, canAllocate, effectText, branch, TYPES, BRANCHES };
})();
