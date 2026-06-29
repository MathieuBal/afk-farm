# 🧲 AFK Farm — Récolte magnétique

Un jeu **idle / incrémental** mobile-first, jouable au doigt comme à la souris,
inspiré de l'effet **Champ magnétique** du projet
[Sensoria](https://github.com/MathieuBal/Sensoria) : des milliers de grains
dessinent les lignes de champ et sont attirés vers les pôles. Ici, ce principe
devient le cœur d'une boucle de jeu profonde et entièrement corrélée.

> 100 % vanilla (Canvas 2D), aucun build. **PWA installable**, jouable
> hors-ligne, déployée sur **GitHub Pages**.

## Le concept

Ton pointeur (doigt / souris) est un **pôle magnétique** qui **courbe la grille
de grains** — la signature de Sensoria. Mais ici la grille **est** la ressource :
certains grains se **chargent** (par rareté) et, quand tu les aimantes jusqu'à
toi, ils sont **récoltés** en **Lumens ✦**. Pas deux systèmes séparés : on
récolte directement la grille magnétique.

Tout ce que tu gagnes alimente quatre systèmes interconnectés.

## Les systèmes (tout est corrélé)

### 🧲 Récolte (session active)
Lance une **session de récolte** puis balaie l'écran pour aimanter les unités
(4 raretés : Commun → Légendaire) vers ta **soute**. La session est limitée par
**3 jauges**, toutes améliorables dans l'arbre :
- ⚡ **Énergie** : se vide pendant la récolte ; à zéro, la récolte s'arrête.
- 📦 **Stockage** : se remplit des unités ; soute pleine → la récolte s'arrête.
- ⏱️ **Temps** : minuteur de session ; écoulé → la récolte s'arrête.

À la fin, la soute est **encaissée** en Lumens. **Double-tap** = pôle magnétique
temporaire (max 6, clin d'œil à Sensoria). Les **drones** récoltent en parallèle,
même hors session (l'AFK passif).

Deux couches de skill viennent récompenser la récolte active :
- 🔥 **Combo** : des captures rapides et enchaînées font monter un multiplicateur
  (jusqu'à ×5) appliqué à la valeur encaissée.
- 💥 **Surge** : une décharge magnétique (coût en énergie + recharge) qui double
  la portée et la force pendant quelques secondes.

### 🌳 Arbre de compétences (façon PoE, quasi-illimité)
Plus de 600 nœuds générés de façon déterministe sur 6 branches radiales avec
forks et liens croisés, **pannable et zoomable**. **Tape un nœud pour voir son
effet exact et son coût avant de l'allouer.** Les nœuds se paient en Lumens
(coût exponentiel) et fournissent portée, force, densité, polarité, énergie,
soute, durée de session, **baies de drones** (la flotte AFK) et des
multiplicateurs notables/keystones.

### 🛠️ Chantier (le cœur AFK profond)
Répare et construis une flotte de plus en plus grandiose :
**Vaisseau → Station → Croiseur → Base planétaire → Planète → Système → …**
Chaque ouvrage se répare **pièce par pièce** (coque, réacteur, aimant…), et
chaque pièce prend du temps (**plusieurs heures** de base, réductible via
l'Ingénierie de l'arbre) qui avance **en temps réel, même hors-ligne**. L'ouvrage
complet débloque le **biome** suivant et un **multiplicateur permanent**.

### 🌌 Prestige (Singularité)
Réinitialise Lumens, projets et arbre pour gagner des **◆ Cores** qui boostent
**tout** en permanence, plus 4 améliorations permanentes (Mémoire magnétique,
Flotte permanente, Aimant résiduel, Distorsion temporelle).

### 👤 Profil, succès & son
22 **succès** à débloquer (chacun **+2 % de revenu global** permanent, donc
corrélé), des **statistiques** détaillées, et des **effets sonores synthétisés**
(Web Audio, aucun fichier) avec interrupteur. Accessible via le bouton 👤.

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
- **GitHub Pages** : voir le guide pas-à-pas **[DEPLOY.md](DEPLOY.md)**. En bref :
  *Settings → Pages → Deploy from a branch → `main` / `/(root)`*. L'adresse est
  toujours `https://mathieubal.github.io/afk-farm/` (le `/` final compte).
- **Installer (PWA)** : depuis le navigateur mobile, « Ajouter à l'écran
  d'accueil » — plein écran + hors-ligne.

## Architecture
```
index.html · manifest.webmanifest · sw.js · icon.svg
css/style.css
js/
  state.js        — sauvegarde, migration, formats, PRNG déterministe
  config.js       — raretés, biomes, projets multi-pièces, perks de prestige
  audio.js        — effets sonores synthétisés (Web Audio)
  achievements.js — succès + bonus corrélé
  skilltree.js    — génération de l'arbre + agrégation des effets
  field.js        — champ de grains magnétique (physique façon Sensoria)
  game.js         — moteur : économie, session, combo, surge, drones, projets, prestige
  tree-ui.js      — vue de l'arbre (canvas pan/zoom/tap)
  ui.js           — HUD, navigation, panneaux Chantier / Prestige / Profil
  main.js         — canvas, fonds de biome, juice, entrées, boucle, PWA
```

Physique en *Structure of Arrays* (ressort de rappel, attraction en 1/distance
plafonnée, amortissement exponentiel), 100 % tactile.
