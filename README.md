# 🧲 AFK Farm — Récolte magnétique

Un jeu **idle / incrémental** mobile-first, jouable au doigt comme à la souris,
inspiré de l'effet **Champ magnétique** du projet
[Sensoria](https://github.com/MathieuBal/Sensoria) : des milliers de grains
dessinent les lignes de champ et sont attirés vers les pôles. Ici, ce principe
devient le cœur d'une boucle de jeu profonde et entièrement corrélée.

> 100 % vanilla (Canvas 2D), aucun build. **PWA installable**, jouable
> hors-ligne, déployée sur **GitHub Pages**.

## Le concept

Ton pointeur (doigt / souris) est un **pôle magnétique** qui :

1. **courbe le champ de grains** en arrière-plan — la signature visuelle de Sensoria ;
2. **aspire et récolte des unités** flottantes, converties en **Lumens ✦**.

Tout ce que tu gagnes alimente quatre systèmes interconnectés.

## Les systèmes (tout est corrélé)

### 🧲 Récolte
Balaie l'écran pour aimanter les unités (4 raretés : Commun → Légendaire).
**Double-tap** = pose un pôle magnétique temporaire qui récolte tout seul
(max 6, clin d'œil à Sensoria).

### 🌳 Arbre de compétences (façon PoE, quasi-illimité)
Plus de 600 nœuds générés de façon déterministe sur 6 branches radiales avec
forks et liens croisés, **pannable et zoomable**. Les nœuds se paient en Lumens
(coût exponentiel) et fournissent portée, force, densité, polarité (chance),
ingénierie (vitesse de construction), **baies de drones** (la flotte AFK) et des
multiplicateurs notables/keystones.

### 🛠️ Chantier (le cœur AFK profond)
Répare et construis une flotte de plus en plus grandiose :
**Vaisseau → Station → Croiseur → Base planétaire → Planète → Système → …**
Chaque ouvrage a un **temps de construction** (15 s au départ, **améliorable**
via l'arbre) qui avance **en temps réel, même hors-ligne**. Le terminer débloque
le **biome** suivant et un **multiplicateur permanent**.

### 🌌 Prestige (Singularité)
Réinitialise Lumens, projets et arbre pour gagner des **◆ Cores** qui boostent
**tout** en permanence, plus 4 améliorations permanentes (Mémoire magnétique,
Flotte permanente, Aimant résiduel, Distorsion temporelle).

### 🌠 Biomes & paliers de Lumens
6 biomes, chacun avec son **fond animé**, sa **couleur** et son **palier de
monnaie** (Lumens → Photons → Plasma → Quanta → Tachyons → Singulons), pour un
revenu **×15** par palier :

Ceinture d'astéroïdes · Nébuleuse Pourpre · Amas Stellaire · Horizon du Trou Noir
· Bras Galactique · Singularité.

### La formule
```
revenu = valeur_unité × biome × arbre × projets × (prestige + perks)
```

## AFK & sauvegarde
- Les **drones** récoltent en continu, même fenêtre fermée.
- Les **projets** se construisent hors-ligne.
- **Sauvegarde automatique** (localStorage) + **gains hors-ligne** plafonnés
  (8 h de base, extensible par prestige).

## Lancer / déployer
- **Local** : sers le dossier (`python3 -m http.server`) puis ouvre la page.
- **GitHub Pages** : le workflow `.github/workflows/deploy-pages.yml` publie le
  site automatiquement. Active *Pages → Source : GitHub Actions* dans les
  réglages du dépôt.
- **Installer** : depuis le navigateur mobile, « Ajouter à l'écran d'accueil ».

## Architecture
```
index.html · manifest.webmanifest · sw.js · icon.svg
css/style.css
js/
  state.js     — sauvegarde, migration, formats, PRNG déterministe
  config.js    — raretés, biomes, projets, perks de prestige
  skilltree.js — génération de l'arbre + agrégation des effets
  field.js     — champ de grains magnétique (physique façon Sensoria)
  game.js      — moteur : économie corrélée, unités, drones, projets, prestige
  tree-ui.js   — vue de l'arbre (canvas pan/zoom/tap)
  ui.js        — HUD, navigation, panneaux Chantier & Prestige, toasts
  main.js      — canvas, fonds de biome, entrées, boucle, PWA
```

Physique en *Structure of Arrays* (ressort de rappel, attraction en 1/distance
plafonnée, amortissement exponentiel), 100 % tactile.
