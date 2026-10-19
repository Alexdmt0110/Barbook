# Checkpoint L0–L2 — 19 octobre 2026

Les lots autorisés sont développés, testés et proposés dans quatre PR. **Aucun merge ni déploiement effectué.** Les corrections sont sur leurs branches ; main reste à `3f9dfdbd3115380960296db3c7025715d48db55c`. Le catalogue complet et D1–D8 restent soumis aux autorisations de leurs phases.

## Livraison proposée

| Lot / PR | Résultat vérifié | SHA de code |
| --- | --- | --- |
| L0 / [#20](https://github.com/Alexdmt0110/Barbook/pull/20) | Pilotage canonique, 66 fiches conservées, autorisations partielles explicites, décisions et handoff ; accès branche/commit/push réels et contrôlés | lire la ref docs/project-pilotage, qui porte ce document |
| L1 création / [#21](https://github.com/Alexdmt0110/Barbook/pull/21) | `New` produit `new-cocktail` sans modifier son nom ; `mainAlcoholName:null` traité comme absence ; régressions et contrat alignés | `e925cbbe99e2ff3b93d26e32c3d41509726fb0a3` |
| L1 sécurité / [#22](https://github.com/Alexdmt0110/Barbook/pull/22) | Remédiations compatibles Angular/Nest/transitives et Jest 30 ; override NYC limité et testé ; audits CI sans exception | `ab756e690ee5817f2689c834afe4fdd1b3daf694` |
| L2 / [#23](https://github.com/Alexdmt0110/Barbook/pull/23) | PostgreSQL réel, HTTP, migrations et quatre parcours navigateur ; défauts révélés corrigés ; démarrage compilé exercé | `e5cc3532d633009f0e4665bd13927f0f9a996534` |

Les contrôles applicables de ces quatre PR ont été relus verts le 19 octobre. Les Review Gates et les contrôles des vrais diffs figurent dans [review-log.md](review-log.md). Un contrôle vert sur une branche indépendante ne qualifie pas encore la combinaison des PR.

## Preuves et limites de portée

| Branche | Résultats réellement exécutés |
| --- | --- |
| Création L1 | Backend 18 suites/139 tests ; frontend 17 fichiers/110 tests ; lint/build/Prisma validate ; régressions reproduites avant correction |
| Sécurité L1 | Backend 124 unitaires et compatibilité NYC ; frontend 109 tests ; lint/build, npm ci et arbres de dépendances contrôlés ; quatre audits complet/production à zéro |
| L2 | Backend 18 suites/126 unitaires, 10 garde-fous ; frontend 17 fichiers/109 tests et lint/build ; typage E2E ; 3 suites/36 tests PostgreSQL/HTTP ; quatre essais Chromium |

Les cinq audits (backend/frontend complet et production sur #22, paquet E2E sur #23) ont été réexécutés à zéro le 19 octobre. Ce relevé ne vaut pas audit d'une image finale de production.

Preuve L2 avant PR : [run 38917878420](https://github.com/Alexdmt0110/Barbook/actions/runs/38917878420). Preuves sur la PR réelle : [Integration 39212891892](https://github.com/Alexdmt0110/Barbook/actions/runs/39212891892) et [Quality 39212891925](https://github.com/Alexdmt0110/Barbook/actions/runs/39212891925), checks verts observés. Les nombres des branches ne doivent pas être additionnés en un résultat combiné.

Les essais natifs vérifient les FK composites même en SQL direct, CHECK/unicités/cascades, refus inter-workspaces, précision Decimal et ABV, vraie auth/JWT/DTO, rollback d'inscription/création/classement et concurrence. Quatre migrations sont appliquées sur une base fraîche, réappliquées sans changement, statut à jour et drift absent. Les upgrades historiques et leur rollback DDL sont testés ; le serveur compilé répond sur `/api`.

Les parcours Chromium vérifient inscription, création CL→ML, échappement du nom, dossier/tag, filtres combinés, rechargement, reconnexion et expiration réelle du token. Ils tournent en 1365×900 et 390×844 tactile, sans mock HTTP ni retry. Ce n'est ni Safari/iOS, ni un appareil physique, ni une certification d'accessibilité. PostgreSQL et le navigateur n'ont pas été exécutés localement dans Work : ces preuves sont celles de GitHub Actions, sur données synthétiques.

## Constats traités et nouveaux constats

| Constat | Résultat proposé | Limite avant clôture complète |
| --- | --- | --- |
| A001 / slug réservé | correction et régressions #21 | inventorier tout slug historique `new` avant usage d'une base réelle ; aucune donnée réécrite |
| A002 / null | correction DTO/service/contrat #21 | requalifier le cas HTTP après combinaison des branches |
| A003 / preuves manquantes | CI PostgreSQL/HTTP/navigateur #23 | nouveaux checks à rendre requis après validation ; qualification combinée et production distinctes |
| A004 / dépendances | audits zéro et compatibilité #22 | résultat daté ; surveillance continue, pas de promesse de sécurité absolue |
| A017 / faux conflit de nom | deux recettes distinctes partageant un ingrédient nouveau réussissent ; retry borné, ABV individuels conservés #23 | contention persistante : 503 après trois tentatives |
| A025 / empaquetage | défaut de démarrage `dist/src/main.js` vs `dist/main.js` corrigé ; smoke compilé vert #23 | environnement réel non qualifié |
| A026 / garniture TOP_UP | CHECK conforme à l'API, refus des données historiques invalides sans réparation #23 | nouvelle migration additive uniquement appliquée en CI ; prévalidation réelle indispensable |
| A027 / sélection dossier | valeur DOM et signal alignés au chargement et après création ; échecs DOM reproduits puis verts #23 | le modèle actuel reste un dossier facultatif, avant L3 |

A025–A027 complètent les 24 constats historiques sans modifier l'archive de phase A. Les autres constats restent à traiter dans leurs lots et décisions ; ils ne sont ni tous corrigés ni acceptés comme dette par silence.

## Points de vigilance avant intégration et production

1. Les branches #21/#22/#23 partent du même main. Après chaque merge explicitement approuvé, actualiser la suivante sans réécrire son historique, traiter tout conflit puis reprendre son Review Gate et sa CI sur la base actualisée. Rejouer l'ensemble sur main, incluant New/null par HTTP et les parcours navigateur.
2. Proposer ensuite au propriétaire de rendre requis `PostgreSQL Integration`, `Browser Integration`, `Dependency Audit (backend)` et `Dependency Audit (frontend)`, en conservant les deux Quality checks. Aucun ruleset modifié ici.
3. La migration `20261016141503_garnish_unit_integrity` refuse les garnitures historiques TOP_UP et ne modifie aucune ligne. Inventorier la base visée et décider d'une réconciliation avant application autorisée. Les tests de rollback/retry SQL ne qualifient pas le traitement des métadonnées Prisma après un échec de migrate deploy sur une base réelle : procédure de récupération à établir avant cette opération.
4. L'avertissement pg a été tracé dans `PgTransaction` de l'adaptateur Prisma et son interpréteur. Aucun filtre ajouté ; requalifier cette chaîne avant pg 9. Aucun défaut de corruption n'est déduit de cette seule dépréciation.
5. Pas d'accès VPS, pas de seed/reset propriétaire, pas d'installation Docker serveur, de changement Nginx/DNS/firewall/certificat, de déploiement ou de sauvegarde/restauration exercée. La disponibilité, le rollback de livraison et les images finales restent à qualifier dans les lots OPS approuvés.

## Reprise recommandée de L3 — proposition à approuver

La branche `feature/cocktail-folder-management` reste intacte à `46321485d1d28351da7e0b555411199f40fa801a`. Ses trois commits existants sont conservés : ADR `420357d2`, EXPAND `c5a87663`, dual-write `46321485`. Aucun nouveau chantier dossiers n'a été commencé.

| Bloc proposé | Travail | Critères de sortie |
| --- | --- | --- |
| Pré-reprise | Après merges autorisés L0–L2 et CI combinée verte, fusionner main dans la branche dossiers existante avec accord de merge, sans rebase/force push ni duplication | trois commits historiques présents ; diff et CI de la branche entière relus |
| B3a / données et contrats | Requalifier EXPAND, backfill, dual-write et anciennes écritures ; répéter une réconciliation avant bascule des lectures ; définir `folders[]`/`folderIds[]` et compatibilité client | installations fraîches et upgrades dans les deux ordres : contrainte d'octobre→EXPAND de septembre, ou EXPAND→contrainte ; aucun fichier de migration partagé renommé ; FK composites et atomicité prouvées |
| B3b / fiche et navigation | Multi-sélection des dossiers, onglet Dossiers, liste/ouverture/création, états vide/chargement/erreur et filtres | vrais parcours API/DB/navigateur, clavier et mobile ; clients frontend/backend compatibles |
| B3c / gestion | Ajouts/retraits depuis un dossier, renommage et suppression sans perte de recettes ; distinguer modification locale d'un lien et remplacement complet | idempotence, isolation, conflits concurrents et politique de saisie périmée explicités ; pas d'effacement involontaire des autres appartenances |
| B3d / CONTRACT séparé | Étudier le retrait de `Cocktail.folderId` seulement après disparition des anciens lecteurs/écrivains | audit des usages, backfill vérifié, sauvegarde/restauration et compatibilité prouvées ; accord destructif spécifique obligatoire |

La fenêtre entre EXPAND et activation de tous les écrivains compatibles doit être traitée avant de déclarer les nouvelles lectures fiables. Le dual-write initial à un dossier ne doit pas effacer des appartenances multiples créées par un autre chemin. Les anciennes FK Restrict sont à gérer explicitement avant suppression d'un dossier. Les tests L2 constituent le socle, pas une preuve de la feature L3 encore partielle.

## Décisions attendues et arrêt

- Validation des quatre PR et des merges, avec requalification à chaque intégration : recommandation #20, #21, #22 puis #23 ; stratégie merge commit, sans réécriture.
- Validation distincte de l'activation des nouveaux checks requis après intégration de leurs workflows.
- Autorisation du lot L3 selon le découpage ci-dessus ; alternative : rester sur le modèle actuel à un dossier tant que la suite n'est pas approuvée.
- D1–D8 restent ouvertes ; présenter audience/session/production au moment où leurs lots l'exigent. Les choix de session ou d'hébergement futurs ne bloquent pas les correctifs déjà proposés.

État de fin : **PRET_A_PASSER**, aucune écriture applicative en cours. Le prochain acte est la validation du propriétaire ; aucune nouvelle feature, aucun merge et aucune production ne sont préautorisés par ce checkpoint.
