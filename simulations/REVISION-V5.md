# Révision immersive, arbre et chantier

## Proportions du terrain

Pendant la session, menus, HUD secondaire et bordure sont masqués ; jauges compactes, valeur en soute, combo, Surge et Encaisser restent accessibles. La surface logique reste égale à 364×347, son rapport largeur/hauteur suit la zone visible. Toutes les longueurs et vitesses utilisent une même échelle uniforme. Cela conserve densité et population, sans étirer les formes. La géométrie modifie néanmoins les trajectoires possibles : égalité de surface ne prouve pas égalité de difficulté humaine. Les ancrages trop proches après changement de format sont replacés, en conservant rareté et cooldown.

## Arbre : règles appliquées

- Coûts : 50 × 1,16^(profondeur−1) × coefficient du type × (1 + achats/80), au lieu d’une exponentielle sur tous les achats. Notables ×3, keystones ×8 ; portée ×1,4, population ×2, durée ×1,5.
- Portée mineure +4 %, population +1, temps +2 s, soute +15. Conductivité n’accélère plus simultanément le repop.
- Repop : 2,4/(1+0,06×résonateurs), plancher 0,6 s avant modificateurs de biome.
- Nova : +30 % valeur, +2 points ; Hypergrille : +4 points, +2 résonateurs. Chaque keystone ajoute 8 % au bonus commun ; ces bonus ne se multiplient plus entre eux.
- Tous les liens transversaux sont construits après les sept branches. Les identifiants et allocations restent inchangés. Le respec existant rembourse toujours les dépenses enregistrées.
- Navigation : pincement autour du milieu des doigts avec translation, passage à un doigt sans saut ni sélection fantôme, annulation propre. Cibles tactiles d’au moins 48 px de diamètre, zoom +/−, retour au centre, accès à la prochaine compétence disponible d’une branche.

## Comparaison avant / après

1240 sessions synthétiques : 20 graines par effet isolé, avant/après, sur la géométrie de référence. Un seul achat évalué sans coût de chemin, balayage sinusoïdal sans pouvoirs, batterie pleine. Pas de preuve de dominance globale ; les compétences de recharge, soute ou chantier ne peuvent pas être jugées avec le seul revenu de la première session.

| Compétence | Revenu avant / base | Revenu après / base |
|---|---:|---:|
| baseline | 1.00 | 1.00 |
| value | 1.11 | 1.11 |
| radius | 1.26 | 1.01 |
| strength | 1.11 | 1.11 |
| density | 1.79 | 1.31 |
| luck | 1.16 | 1.16 |
| drone_power | 1.01 | 1.01 |
| build | 1.01 | 1.01 |
| energy | 1.01 | 1.01 |
| regen | 1.01 | 1.01 |
| efficiency | 1.01 | 1.01 |
| time | 1.44 | 1.29 |
| storage | 1.01 | 1.01 |
| gridpoint | 1.75 | 1.31 |
| repopfast | 1.11 | 1.07 |
| value_n | 1.56 | 1.56 |
| dronebay | 1.41 | 1.41 |
| magnitude | 1.88 | 1.74 |
| fortune | 1.31 | 1.31 |
| refinery | 1.31 | 1.31 |
| battery | 1.01 | 1.01 |
| warehouse | 1.01 | 1.01 |
| chrono | 1.75 | 1.75 |
| resonance | 1.01 | 1.01 |
| overload | 1.53 | 1.38 |
| swarm | 1.87 | 1.71 |
| nova | 8.40 | 2.46 |
| perpetual | 1.17 | 1.09 |
| stockpile | 1.17 | 1.09 |
| overdrive | 2.41 | 1.77 |
| hypergrid | 10.36 | 2.05 |

Les fichiers JSON et le script progression.cjs conservent les mesures. La référence avant correspond au code de production c368c1d85d1cf184492526d6948857c77a66da71. Les différences de rareté rencontrées influencent les résultats ; 20 graines et une trajectoire ne suffisent pas à déclarer tous les builds équilibrés.

## Chantier

- Vue SVG du vaisseau ou de la structure, modules planifiés/installés/en assemblage ; pas de moteur 3D ni de téléchargement externe.
- Chaque pièce offre un bonus immédiat : soute, énergie, valeur ou vitesse de construction. Les pièces déjà terminées en bénéficient aussi, calculées sans mutation de sauvegarde.
- Coefficient de prix initial 2,5 → 1,4 (première coque 750 → 420). Rampe par biome 3,2 et durées conservées : aucune réduction exponentielle supplémentaire des projets avancés.
- Les Cores investis continuent de compter dans le bonus global : acheter Mémoire ne détruit plus plus de revenu qu’il n’en apporte.

## Validation et limites

24 tests Node réussis avant publication : moteur, collecte, sauvegarde, soute, drones, terrain, gestes de l’arbre et progression. Les simulations immersive.cjs comparent 160 sessions sur quatre formats ; elles ne reproduisent pas un doigt humain. Les anciennes mesures d’égalité stricte concernaient un terrain au ratio fixe, désormais remplacé pendant la session.

Suite : retours iPhone sur la zone agrandie et les gestes ; campagnes multi-sessions et parcours d’achats pour ajuster énergie, stockage, drones et projets avancés. Ce lot corrige les écarts manifestes et introduit une progression de chantier visible ; il ne certifie pas toute la progression jusqu’au prestige.
