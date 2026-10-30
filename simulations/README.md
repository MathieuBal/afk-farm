# Récolte — première campagne de simulation

## Résultat et décision proposée

6 000 sessions synthétiques de 15 secondes : 4 tailles × 3 trajectoires × 2 usages des pouvoirs × 250 graines. Le feeling validé est conservé. Les écarts entre formats et entre stratégies empêchent de choisir une soute optimale à ce stade. Aucune modification du jeu principal.

Référence : espacement 72, portée 120, vitesse 210, repop mixte 2,4 s, aspiration libre. La grille élastique est purement visuelle et n’intervient pas dans les simulations.

## Résultats de récolte sans limites économiques

| Terrain | Trajectoire | Pouvoirs | Moyenne | P10–P90 | Population moyenne |
|---|---|---|---:|---:|---:|
| 320×300 | Immobile | Aucun | 14.4 | 10–18 | 13.0 |
| 320×300 | Immobile | Pôles + Surge | 37.0 | 34–40 | 13.0 |
| 320×300 | Balayage | Aucun | 24.2 | 22–26 | 13.0 |
| 320×300 | Balayage | Pôles + Surge | 58.1 | 56–60 | 13.0 |
| 320×300 | Ciblage automatique | Aucun | 62.0 | 60–64 | 13.0 |
| 320×300 | Ciblage automatique | Pôles + Surge | 65.8 | 64–67 | 13.0 |
| 364×347 | Immobile | Aucun | 14.1 | 9–18 | 13.0 |
| 364×347 | Immobile | Pôles + Surge | 37.0 | 34–40 | 13.0 |
| 364×347 | Balayage | Aucun | 24.2 | 22–27 | 13.0 |
| 364×347 | Balayage | Pôles + Surge | 57.8 | 55–60 | 13.0 |
| 364×347 | Ciblage automatique | Aucun | 61.5 | 59–64 | 13.0 |
| 364×347 | Ciblage automatique | Pôles + Surge | 65.4 | 64–67 | 13.0 |
| 768×500 | Immobile | Aucun | 12.0 | 7–16 | 37.0 |
| 768×500 | Immobile | Pôles + Surge | 54.2 | 50–59 | 37.0 |
| 768×500 | Balayage | Aucun | 22.6 | 19–27 | 37.0 |
| 768×500 | Balayage | Pôles + Surge | 101.8 | 97–106 | 37.0 |
| 768×500 | Ciblage automatique | Aucun | 86.1 | 83–89 | 37.0 |
| 768×500 | Ciblage automatique | Pôles + Surge | 129.7 | 124–136 | 37.0 |
| 1200×700 | Immobile | Aucun | 10.7 | 6–15 | 81.0 |
| 1200×700 | Immobile | Pôles + Surge | 51.9 | 47–57 | 81.0 |
| 1200×700 | Balayage | Aucun | 21.7 | 18–26 | 81.0 |
| 1200×700 | Balayage | Pôles + Surge | 125.9 | 120–132 | 81.0 |
| 1200×700 | Ciblage automatique | Aucun | 90.5 | 87–94 | 81.0 |
| 1200×700 | Ciblage automatique | Pôles + Surge | 152.9 | 141–163 | 81.0 |

P10–P90 décrit les variations entre graines pour un robot donné, pas une plage prédictive des performances humaines.

## Soute : projection sur les mêmes traces

Avec une batterie pleine de 140, fraction des essais terminés avant 15 s par une soute de 120 :

| Terrain | Trajectoire | Pouvoirs | Soute pleine |
|---|---|---|---:|
| 364×347 | Immobile | pointer | 0.0 % |
| 364×347 | Immobile | support | 0.0 % |
| 364×347 | Balayage | pointer | 0.0 % |
| 364×347 | Balayage | support | 0.0 % |
| 364×347 | Ciblage automatique | pointer | 0.0 % |
| 364×347 | Ciblage automatique | support | 0.0 % |
| 1200×700 | Immobile | pointer | 0.0 % |
| 1200×700 | Immobile | support | 0.0 % |
| 1200×700 | Balayage | pointer | 0.0 % |
| 1200×700 | Balayage | support | 89.6 % |
| 1200×700 | Ciblage automatique | pointer | 0.0 % |
| 1200×700 | Ciblage automatique | support | 100.0 % |

Sur 364×347, la soute de 60 coupe 15,2 % des balayages avec pouvoirs et 100 % des ciblages automatiques avec pouvoirs. Ce n’est donc pas une amélioration universelle de descendre de 120 à 60. Les capacités 40, 60, 80 et 120 sont toutes disponibles dans le JSON.

## Énergie : lecture des règles actuelles

- Capacité configurée 140, consommation 5/s, régénération hors récolte 10/s. La sauvegarde neuve initialise 120 ; le délai avant la première récolte peut déjà en régénérer.
- Une session de 15 s consomme 75, ou 125 avec deux Surges de 25. Batterie pleine : elle finit dans les deux cas si la soute ne coupe pas avant.
- À 120 au départ et avec deux Surges, l’énergie termine la session vers 14 s. Le laboratoire ne facturait pas ce coût : ses scores ne sont pas directement ceux du jeu complet.
- Sans pouvoir et sans attente, 140 permettent 15 s puis 13 s de récolte. Reconstituer le coût de 75 demande 7,5 s hors récolte ; avec deux Surges, 125 demandent 12,5 s.

Ces calculs concernent les statistiques de base, sans améliorations ni biomes. Les projections de soute et d’énergie tronquent une trace, elles ne simulent pas la réaction d’un joueur à une jauge presque vide.

## Méthode et limites

- Exécution : `node simulations/harvest.cjs 250`, depuis la racine. Moteur réel de `/lab/`, à 60 appels/s avec sous-pas internes à 120 Hz ; empreinte SHA-256 enregistrée dans les résultats.
- Graines 1 à 250 appariées entre scénarios. Taille du terrain jouable en pixels CSS, pas résolution physique de l’appareil. Même règle de mise à l’échelle que le laboratoire.
- Immobile : pointeur au centre. Balayage : sinusoïdes sur 80 % de la largeur/hauteur, vitesse plafonnée à 480 × facteur d’échelle unités/s. Ciblage : poursuit le Lumen actif le plus proche, sans temps de réaction ni occultation par le doigt. Ce dernier est un stress test, pas un joueur moyen ni une borne optimale.
- Pouvoirs : six pôles à la position du pointeur à 0, 2, 4, 6, 8, 10 s ; Surges à 0 et 12 + 1/60 s. Le décalage évite l’arrondi flottant du cooldown. Chaque déclenchement est vérifié. Les pôles immobiles se superposent : aucune recherche de placement optimal.
- Mesures : captures, première capture, plus longue absence de capture, valeur brute de rareté, projection de combo (fenêtre 1,6 s, +0,12, plafond 5). Les valeurs économiques excluent multiplicateurs d’arbre, projets, prestige, succès et chance ; elles ne prédisent pas la progression complète.
- Les événements d’une image sont datés en fin d’image : précision temporelle 1/60 s. Les limites de session excluent les captures à la frontière de fin. Les fréquences de remplissage mesurent les fins strictement antérieures.
- Aucun drone, aucune chaîne d’améliorations ni cycle de prestige ici. Le moteur historique de `js/field.js` est différent ; ces résultats évaluent la future intégration du feeling, pas le comportement actuel de ce moteur.
- L’essai humain préféré donnait 42 captures ; gestes et usage des pouvoirs n’étaient pas enregistrés. On ne peut pas calibrer un modèle de joueur à partir du seul score.

## Suite recommandée

1. Comparer une surface logique commune aux appareils avec un budget de population plafonné ; préserver la sensation validée sur le terrain 364×347. Les grands écrans peuvent offrir plus d’espace sans donner autant de rendement supplémentaire aux pôles.
2. Rejouer les mêmes graines et trajectoires, puis faire valider le rendu. Ne pas réduire le rayon ou la vitesse validés uniquement pour compenser un problème de population.
3. Réexaminer soute et énergie après cette comparaison. Conserver provisoirement 120 / 140 / 5 / 10 ; il ne s’agit pas d’un équilibrage final.
4. Simuler ensuite les améliorations et drones à partir des règles effectivement intégrées, en particulier la cohérence entre récolte visible et revenu hors ligne.
