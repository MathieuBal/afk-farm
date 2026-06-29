# 🧲 AFK Farm — Récolte magnétique

Un petit jeu **idle / incrémental** jouable au doigt comme à la souris, inspiré
de l'effet **Champ magnétique** du projet [Sensoria](https://github.com/MathieuBal/Sensoria) :
des milliers de grains dessinent les lignes de champ et sont attirés vers les
pôles. Ici, ce principe devient le cœur d'une boucle de jeu.

## Le concept

Ton pointeur (doigt ou souris) est un **pôle magnétique** qui :

1. **courbe le champ de grains** en arrière-plan — la signature visuelle de Sensoria ;
2. **aspire et récolte des unités** qui flottent sur le terrain.

Chaque unité récoltée rapporte des **Lumens ✦**, la monnaie qui sert à acheter
des améliorations. Plus tu progresses, plus la récolte s'automatise : c'est un
vrai jeu **AFK**.

## Comment jouer

- **Déplace** ton doigt / ta souris : les unités proches sont aimantées vers toi
  et récoltées au contact.
- **Double-tap (ou double-clic)** : pose un **pôle magnétique** temporaire qui
  récolte tout seul à cet endroit (max 6, clin d'œil à Sensoria).
- Ouvre **🛠️ Améliorations** pour dépenser tes Lumens.

## Améliorations

| Amélioration | Effet |
|---|---|
| 🧲 **Champ magnétique** | Élargit le rayon d'attraction |
| ⚡ **Force magnétique** | Aspire les unités plus vite et de plus loin |
| ✦ **Densité du champ** | Plus d'unités sur le terrain |
| 💎 **Raffinage** | Chaque unité vaut plus de Lumens |
| 🛰️ **Drone autonome** | Un pôle qui chasse et récolte tout seul (AFK) |
| 🎲 **Polarité rare** | Plus d'unités rares et précieuses |

Les unités existent en 4 raretés — Commun, Rare, Épique, Légendaire — de valeur
croissante.

## AFK & sauvegarde

- Les **drones** récoltent en continu, même quand tu ne touches à rien.
- La progression est **sauvegardée automatiquement** (localStorage).
- À ton retour, tes drones t'offrent les **gains hors-ligne** accumulés
  (plafonnés à 8 h).

## Technique

100 % vanilla, aucun build : ouvre simplement `index.html` (ou sers le dossier).

```
index.html
css/style.css
js/
  state.js   — état, sauvegarde, formatage
  config.js  — raretés + arbre d'améliorations
  field.js   — champ de grains magnétique (physique façon Sensoria)
  game.js    — unités, drones, récolte, achats, hors-ligne
  ui.js      — HUD + boutique
  main.js    — canvas, entrées, boucle de rendu
```

Rendu **Canvas 2D**, physique en *Structure of Arrays* (ressort de rappel,
attraction en 1/distance plafonnée, amortissement exponentiel), 100 % tactile.
