# Intégration du feeling et égalité entre formats

- Terrain logique commun de 364 × 347, ajusté uniformément entre le HUD et les commandes. Aucun gain de population lié à la taille physique de l’écran. Les coordonnées d’entrée sont converties dans ce repère.
- Base : 13 Lumens, correspondant au terrain de référence, espacement 72 avec le facteur 347/360 du laboratoire ; portée 120 et vitesse 210 avec le même facteur. Réapparition mixte à 2,4 s et délai visible de 0,3 s.
- Moteur partagé avec le laboratoire : mode de collecte manuelle pour laisser le moteur économique attribuer les captures aux drones ou à la soute. Physique de récolte indépendante de la grille élastique.
- Le jeu s’exécute par pas de 1/120 s. Les redimensionnements ne réinitialisent plus les Lumens et leurs délais.
- Les améliorations conservent leurs effets sur portée, puissance, population, délai, énergie et soute. Une population accrue réduit l’espacement de placement selon la racine du ratio, identiquement sur tous les appareils. Les placements existants sont conservés.
- Soute 120, batterie maximale 140, consommation 5/s, régénération 10/s et coût Surge 25 conservés : pas de durcissement prématuré. Sauvegarde v3 et clé de stockage inchangées.
- Cache PWA versionné ; nettoyage limité aux caches AFK Farm.

## Vérification

`node --test tests/*.test.cjs`

Tests du moteur et de la grille, entrées tactiles simulées, intégration au vrai moteur économique : équivalence téléphone/ordinateur sur 20 graines avec pouvoirs, encaissement, consommation de Surge, sauvegarde existante, conservation du champ après resize, amélioration de densité, délai de réapparition, soute pleine et drones au repos.

La vérification visuelle et gestuelle sur iPhone reste nécessaire. Les trajectoires automatisées démontrent l’égalité du calcul entre formats, pas une difficulté humaine identique. Les simulations précédentes décrivent le laboratoire avant cette intégration ; elles ne constituent pas une validation de l’ensemble de l’arbre ou du prestige.
