/* AFK Farm — arbre de compétences façon PoE, généré de façon déterministe.
 * 6 branches radiales + forks + liens croisés. Les nœuds sont payés en Lumens
 * (coût exponentiel selon le nombre de nœuds alloués). Effectivement illimité. */
(function () {
  const AFK = (window.AFK = window.AFK || {});
  const { mulberry32, hashStr } = AFK.util;

  const ARMS = 6;
  const NODES_PER_ARM = 84;     // 6 × 84 + forks ≈ 600 nœuds
  const RING_GAP = 78;          // espacement radial (px en espace-arbre)
  const FORK_EVERY = 3;
  const NOTABLE_EVERY = 6;
  const KEYSTONE_EVERY = 24;
  const CROSS_EVERY = 4;

  // Définition des effets par type de nœud.
  const TYPES = {
    value:       { label: "Affinité",      icon: "✦", apply: (s) => (s.value += 0.10) },
    radius:      { label: "Portée",        icon: "🧲", apply: (s) => (s.radius += 0.08) },
    strength:    { label: "Force",         icon: "💪", apply: (s) => (s.strength += 0.10) },
    density:     { label: "Densité",       icon: "✺", apply: (s) => (s.density += 3) },
    luck:        { label: "Polarité",      icon: "🎲", apply: (s) => (s.luck += 1) },
    drone_power: { label: "Servomoteur",   icon: "🛰️", apply: (s) => (s.dronePower += 0.15) },
    build:       { label: "Ingénierie",    icon: "🔧", apply: (s) => (s.build += 0.12) },
    energy:      { label: "Capacité",      icon: "⚡", apply: (s) => (s.energy += 25) },
    regen:       { label: "Régénération",  icon: "🔋", apply: (s) => (s.regen += 1.5) },
    efficiency:  { label: "Efficience",    icon: "♻️", apply: (s) => (s.efficiency += 0.15) },
    time:        { label: "Chronométrie",  icon: "⏱️", apply: (s) => (s.time += 3) },
    storage:     { label: "Soute",         icon: "📦", apply: (s) => (s.storage += 25) },
    // notables
    value_n:     { label: "Cœur d'ambre",  icon: "💠", notable: true, apply: (s) => (s.value += 0.55) },
    dronebay:    { label: "Baie de drones", icon: "🚀", notable: true, apply: (s) => { s.drones += 1; s.dronePower += 0.3; } },
    magnitude:   { label: "Magnétar",      icon: "🌀", notable: true, apply: (s) => { s.radius += 0.30; s.strength += 0.30; } },
    fortune:     { label: "Étoile chanceuse", icon: "🍀", notable: true, apply: (s) => (s.luck += 4) },
    refinery:    { label: "Raffinerie",    icon: "⚗️", notable: true, apply: (s) => { s.value += 0.30; s.build += 0.30; } },
    battery:     { label: "Réacteur",      icon: "🔌", notable: true, apply: (s) => { s.energy += 70; s.regen += 2; } },
    warehouse:   { label: "Entrepôt",      icon: "🏭", notable: true, apply: (s) => (s.storage += 80) },
    chrono:      { label: "Dilatateur",    icon: "🕰️", notable: true, apply: (s) => (s.time += 8) },
    // keystones
    overload:    { label: "Surcharge",     icon: "💥", keystone: true, apply: (s) => { s.value += 2.0; s.radius -= 0.35; } },
    swarm:       { label: "Essaim",        icon: "🐝", keystone: true, apply: (s) => { s.drones += 2; s.dronePower += 0.6; } },
    nova:        { label: "Nova",          icon: "🌟", keystone: true, apply: (s) => { s.value += 1.2; s.density += 12; } },
    perpetual:   { label: "Perpétuel",     icon: "♾️", keystone: true, apply: (s) => { s.regen += 7; s.efficiency += 0.5; } },
  };

  // descriptions lisibles (affichées avant d'allouer)
  const DESC = {
    core: "Point de départ de l'arbre.",
    value: "+10 % valeur de récolte",
    radius: "+8 % portée d'attraction",
    strength: "+10 % force d'attraction",
    density: "+3 grains chargés sur la grille",
    luck: "+1 polarité (grains plus rares)",
    drone_power: "+15 % puissance des drones",
    build: "+12 % vitesse de construction",
    energy: "+25 énergie maximale",
    regen: "+1,5 énergie / s",
    efficiency: "+15 % efficience (moins d'énergie consommée)",
    time: "+3 s de durée de session",
    storage: "+25 capacité de soute",
    value_n: "+55 % valeur de récolte",
    dronebay: "+1 drone et +30 % de puissance",
    magnitude: "+30 % portée et +30 % force",
    fortune: "+4 polarité",
    refinery: "+30 % valeur et +30 % construction",
    battery: "+70 énergie max et +2 régénération",
    warehouse: "+80 capacité de soute",
    chrono: "+8 s de durée de session",
    overload: "+200 % valeur, mais −35 % portée",
    swarm: "+2 drones et +60 % de puissance",
    nova: "+120 % valeur et +12 grains chargés",
    perpetual: "+7 régénération et +50 % efficience",
  };
  function effectText(node) { return DESC[node.type] || ""; }

  const MINOR = ["value", "radius", "strength", "density", "luck", "drone_power", "build", "energy", "regen", "efficiency", "time", "storage"];
  const NOTABLES = ["value_n", "dronebay", "magnitude", "fortune", "refinery", "battery", "warehouse", "chrono"];
  const KEYSTONES = ["overload", "swarm", "nova", "perpetual"];
  // chaque branche se spécialise (couvre aussi la session : énergie, soute, temps)
  const ARM_BIAS = ["value", "energy", "storage", "time", "drone_power", "strength"];

  function pick(rng, arr) { return arr[(rng() * arr.length) | 0]; }

  function makeNode(id, x, y, ring, arm) {
    const rng = mulberry32(hashStr(id));
    let type;
    if (ring > 0 && ring % KEYSTONE_EVERY === 0 && arm % 2 === 0) {
      type = pick(rng, KEYSTONES);
    } else if (ring > 0 && ring % NOTABLE_EVERY === 0) {
      type = pick(rng, NOTABLES);
    } else {
      // distribution des mineurs orientée par la branche pour donner une identité
      const armBias = ARM_BIAS[arm % ARM_BIAS.length];
      type = rng() < 0.45 ? armBias : pick(rng, MINOR);
    }
    const def = TYPES[type];
    return {
      id, x, y, ring, arm, type,
      label: def.label, icon: def.icon,
      notable: !!def.notable, keystone: !!def.keystone,
      costMult: def.keystone ? 28 : def.notable ? 6 : 1,
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
    add(core);

    for (let a = 0; a < ARMS; a++) {
      const base = (a / ARMS) * Math.PI * 2 - Math.PI / 2;
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

        // forks : petite branche latérale (souvent notable)
        if (i > 0 && i % FORK_EVERY === 0) {
          const side = (rng() < 0.5 ? 1 : -1);
          const fid = id + "f";
          const fang = ang + side * 0.34;
          const frad = rad + RING_GAP * 0.46;
          const fn = makeNode(fid, Math.cos(fang) * frad, Math.sin(fang) * frad, ring, a);
          if (i % NOTABLE_EVERY !== 0) {
            fn.type = pick(rng, NOTABLES);
            const d = TYPES[fn.type];
            fn.label = d.label; fn.icon = d.icon; fn.notable = true; fn.costMult = 6;
          }
          add(fn);
          link(id, fid);
        }

        // liens croisés entre branches adjacentes
        if (i > 0 && i % CROSS_EVERY === 0) {
          const nextArm = (a + 1) % ARMS;
          link(id, "a" + nextArm + "_" + i);
        }
      }
    }

    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    for (const n of list) {
      if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
    }
    return { byId, list, bounds: { minX, minY, maxX, maxY } };
  }

  // Agrège les effets des nœuds alloués vers un objet de stats.
  function aggregate(tree, allocated) {
    const s = { value: 0, radius: 0, strength: 0, density: 0, luck: 0, dronePower: 0, build: 0, drones: 0,
      energy: 0, regen: 0, efficiency: 0, time: 0, storage: 0 };
    for (const id in allocated) {
      if (id === "core") continue;
      const n = tree.byId.get(id);
      if (!n) continue;
      const def = TYPES[n.type];
      if (def && def.apply) def.apply(s);
    }
    return s;
  }

  // Un nœud est allouable si un voisin (ou le cœur) est déjà alloué.
  function canAllocate(tree, allocated, id) {
    if (allocated[id]) return false;
    const n = tree.byId.get(id);
    if (!n) return false;
    if (n.id === "core") return false;
    for (const l of n.links) if (allocated[l]) return true;
    return false;
  }

  AFK.tree = { build, aggregate, canAllocate, effectText, TYPES };
})();
