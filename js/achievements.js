/* AFK Farm — succès : objectifs de rétention. Chaque succès débloqué accorde
 * un bonus de revenu global permanent (+2%), donc tout reste corrélé. */
(function () {
  const AFK = (window.AFK = window.AFK || {});

  const LIST = [
    { id: "first",   icon: "🧲", name: "Premier aimant",     desc: "Récolte ta première unité.",        check: (g) => g.state.collected >= 1 },
    { id: "c1k",     icon: "✦",  name: "Glaneur",            desc: "Récolte 1 000 unités.",             check: (g) => g.state.collected >= 1000 },
    { id: "c100k",   icon: "✺",  name: "Moissonneur",        desc: "Récolte 100 000 unités.",           check: (g) => g.state.collected >= 1e5 },
    { id: "l1k",     icon: "💰", name: "Premier pactole",    desc: "Cumule 1 000 ✦ au total.",          check: (g) => g.state.totalEver >= 1e3 },
    { id: "l1m",     icon: "💎", name: "Millionnaire",       desc: "Cumule 1 M ✦ au total.",            check: (g) => g.state.totalEver >= 1e6 },
    { id: "l1b",     icon: "🏆", name: "Milliardaire",       desc: "Cumule 1 Md ✦ au total.",           check: (g) => g.state.totalEver >= 1e9 },
    { id: "l1t",     icon: "👑", name: "Magnat magnétique",  desc: "Cumule 1 000 Md ✦ au total.",       check: (g) => g.state.totalEver >= 1e12 },
    { id: "b1",      icon: "🌫️", name: "Explorateur",        desc: "Atteins la Nébuleuse Pourpre.",     check: (g) => g.state.bestBiome >= 1 },
    { id: "b3",      icon: "🕳️", name: "Plongeur d'horizon", desc: "Atteins l'Horizon du Trou Noir.",   check: (g) => g.state.bestBiome >= 3 },
    { id: "b5",      icon: "🌌", name: "Singularité",        desc: "Atteins le biome Singularité.",     check: (g) => g.state.bestBiome >= 5 },
    { id: "n25",     icon: "🌳", name: "Ramification",       desc: "Alloue 25 nœuds d'arbre.",          check: (g) => g.allocatedCount() >= 25 },
    { id: "n100",    icon: "🕸️", name: "Réseau dense",       desc: "Alloue 100 nœuds d'arbre.",         check: (g) => g.allocatedCount() >= 100 },
    { id: "n300",    icon: "♾️", name: "Arbre-monde",        desc: "Alloue 300 nœuds d'arbre.",         check: (g) => g.allocatedCount() >= 300 },
    { id: "d1",      icon: "🛰️", name: "Première flotte",    desc: "Déploie un premier drone.",         check: (g) => g.droneCount >= 1 },
    { id: "d10",     icon: "🐝", name: "Essaim",             desc: "Déploie 10 drones.",                check: (g) => g.droneCount >= 10 },
    { id: "p1",      icon: "🌀", name: "Renaissance",        desc: "Réalise un premier prestige.",      check: (g) => g.state.prestiges >= 1 },
    { id: "p5",      icon: "✨", name: "Cycliste cosmique",  desc: "Réalise 5 prestiges.",              check: (g) => g.state.prestiges >= 5 },
    { id: "s1",      icon: "💥", name: "Décharge",           desc: "Déclenche un premier Surge.",       check: (g) => g.stats.surges >= 1 },
    { id: "s100",    icon: "⚡", name: "Surchargé",          desc: "Déclenche 100 Surges.",             check: (g) => g.stats.surges >= 100 },
    { id: "combo25", icon: "🔥", name: "Enchaîneur",         desc: "Atteins un combo ×25.",             check: (g) => g.stats.comboMax >= 25 },
    { id: "combo50", icon: "🌟", name: "Maître du flux",     desc: "Atteins un combo ×50.",             check: (g) => g.stats.comboMax >= 50 },
    { id: "sess50",  icon: "📦", name: "Habitué",            desc: "Termine 50 sessions de récolte.",   check: (g) => g.stats.sessions >= 50 },
  ];

  const BONUS = 0.02; // +2% revenu global par succès

  function unlockedCount(state) {
    let n = 0;
    for (const a of LIST) if (state.achievements[a.id]) n++;
    return n;
  }

  // vérifie et débloque ; renvoie la liste des nouveaux succès
  function check(game) {
    const got = [];
    for (const a of LIST) {
      if (game.state.achievements[a.id]) continue;
      try { if (a.check(game)) { game.state.achievements[a.id] = 1; got.push(a); } } catch (e) {}
    }
    return got;
  }

  AFK.achievements = { LIST, BONUS, unlockedCount, check };
})();
