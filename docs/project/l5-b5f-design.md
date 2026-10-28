# B5f — Design Review de qualification finale L5

26 octobre 2026. Base : main 7a9464bfdb68fddaa6d070687404fe9b8bafda96, merge B5e #37. Développement limité à la qualification et à la documentation du cycle personnel déjà intégré ; aucune nouvelle fonction métier.

## Écart de preuve et choix
Les tests réels couvrent suppression contre édition/classement/suppression de dossier dans les deux ordres, deux restaurations simultanées, échéance pendant attente et rollback injecté. Compléter explicitement restauration contre ces trois opérations dans les deux ordres : six cas HTTP/PostgreSQL, avec observation des attentes de verrou, sans synchronisation temporelle supposée.

Réutiliser la suite de cycle, son verrou Workspace et ses snapshots, sans nouvelle abstraction ni modification applicative. Les intentions d'édition/classement capturées avant suppression doivent échouer : 404 si exécutées avant restauration, 409 après. Une suppression de dossier utilise son aperçu courant incluant les recettes retenues : exécutée avant restauration elle invalide organizationVersion ; exécutée après elle rencontre un jeton obsolète. Vérifier contenu, versions, état et liens, pas seulement les codes HTTP. Transactions et fixtures restent sur base jetable gardée.

Alternative rejetée : simuler les courses avec des mocks ou modifier les versions directement. Les tests existants de migration restent utiles pour les contraintes, mais ne prouvent pas l'ordre réel des services HTTP.

## Qualification et responsabilités
Revalider les dix critères L5-01 à L5-10 contre les tests et le code réellement intégrés. Matrice unique de clôture avec preuves, limitations et conditions OPS ; synchroniser roadmap, backlog et reprise. Ne pas qualifier l'archivage, les workspaces partagés ou les médias par extension.

Exécuter lint/typage/unitaires pertinents, puis les six jobs natifs : backend, frontend, deux audits, PostgreSQL/HTTP et Chromium desktop/mobile. Migration initiale/redeploy/drift et huit historiques restent inchangés. Aucun seuil, assertion, quota, retry ou timeout réduit. Revue entière du diff, historique, discussions et dépendances ; D8 seulement si aucun BLOCKER/P1 et six contrôles réussis au dernier HEAD. Puis merge commit, parents/arbre/main et six contrôles post-merge vérifiés.

## Risques, limites et suite
La validation de L5 est une qualification technique du carnet personnel, pas une autorisation de mise en service. Expiration à 30 jours ne prouve aucun effacement. Retour binaire uniquement compatible avec les états ABV/corbeille ; sauvegarde restaurable, D7, staging et VPS restent à valider séparément. Aucun schéma, migration nouvelle, dépendance, infrastructure ou coût.

Après BB0 qualifié : BB1 collaboration privée Alex/Maël prioritaire, puis batchs indépendants et inventaire manuel BB-INVENTAIRE-01. Préparation OPS documentaire conservée. Aucun arbitrage métier nouveau identifié pour B5f.
