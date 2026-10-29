# Atelier de récolte — étape 1

Ouvrir `/lab/` depuis le même serveur que le jeu (`python3 -m http.server`).
Cette page indépendante ne charge pas le moteur économique, ne lit/écrit aucune sauvegarde, n'enregistre pas de service worker et n'envoie aucune télémétrie.

## Protocole

1. Jouer 15 secondes avec les réglages initiaux, noter le ressenti.
2. Changer un seul paramètre et rejouer avec la même graine et la même taille.
3. Comparer d'abord l'écart, ensuite l'attraction, puis le renouvellement.
4. Utiliser « Autre terrain » pour vérifier qu'une préférence ne dépend pas d'un placement chanceux.
5. Copier les résultats (JSON : paramètres, graine, taille, captures, première capture, distance et ressenti).

Les modes de réapparition sont fixe, renouvelé, mixte (50 % de relocation tentée). Un placement par rejet impose une distance minimale entre ancrages ; si aucune position ne convient, le point conserve son ancrage. Le nombre réel est affiché : on ne viole pas la distance pour atteindre le nombre cible.

La population suit l'aire disponible / (2 × écart²), plafonnée à 160. Sous 360 unités sur le plus petit côté, écart, portée et vitesse sont mis à l'échelle ensemble. Ce sont des hypothèses d'essai, pas un équilibrage validé. La grille décorative a sa physique séparée ; la variante avec ressort n'est pas une reproduction fidèle de la version actuelle.

L'essai utilise un pas de simulation de 1/120 s et un PRNG initialisé. Une interruption de visibilité ou un redimensionnement annule l'essai sans le comptabiliser. Une page très lente peut durer plus de 15 secondes murales : le compteur représente le temps simulé.

## Vérification

`node --test tests/harvest-lab.test.cjs`

Tests de déterminisme, placement (600 combinaisons taille/graine/écart), réapparition, captures 30/60/120 Hz, durée des pôles et cooldown Surge. Ces tests de correction ne remplacent ni une recette iPhone ni les futures simulations d'équilibrage en gros volume.

## Prochaines étapes

- Retour humain sur les variantes, notamment tactile et masquage par le doigt.
- Vérifier la préférence sur plusieurs tailles et graines.
- Retenir la physique avant d'intégrer énergie, combos, soute et drones.
- Simuler ensuite ces systèmes séparément puis ensemble, avec distributions et cas extrêmes.
