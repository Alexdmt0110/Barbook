# Handoff canonique Barbook

```yaml
checkpoint_utc: "2026-10-19T07:07:44.205363+00:00"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "EN_COURS"
feature: "Intégration autorisée L0–L2 puis reprise L3 B3a–B3c"
branch: "fix/cocktail-creation-boundaries"
base_branch: "main"
remote_head_sha: "85e23e471445abd2f595bd1bbea233527f7b2650"
local_head_sha: "85e23e471445abd2f595bd1bbea233527f7b2650"
worktree: "propre avant ce mise à jour du journal sur #21 ; aucun applicatif non poussé"
pr: "#20 mergée ; #21 actualisée sur main et CI en cours ; #22/#23 en attente d’actualisation"
tests: "preuves de L0–L2 dans checkpoint-l0-l2.md ; nouvelle CI requise après chaque changement de base"
migrations: "4 migrations uniquement en CI jetable ; aucune instance propriétaire/VPS utilisée"
changes_pushed: "voir les SHA des quatre branches dans checkpoint-l0-l2.md ; lire la ref courante pour le présent journal"
unpushed_changes: "uniquement le présent checkpoint avant publication ; aucun applicatif"
decisions_validated: "Alex : je valide, après demande explicite de validation des merges #20–#23 et de la reprise L3 ; WORK reprend seul"
decisions_pending: "nouveaux checks requis à valider séparément ; D1–D8 ; CONTRACT et production non autorisés"
next_atomic_step: "attendre la CI du head actualisé de #21, relire sa PR puis merger #21 avec SHA attendu ; vérifier main avant #22"
risks_and_blockers: "qualification combinée à faire ; états des bases réelles inconnus ; aucun transfert concurrent signalé"
production_effect: "aucun"
```

## Reprise vérifiée le 19 octobre

Main `3f9dfdbd3115380960296db3c7025715d48db55c`. PR #20 head `d6fd283bcca5d733a3915cdc5e4c52ce4441e620`, #21 `e925cbbe99e2ff3b93d26e32c3d41509726fb0a3`, #22 `ab756e690ee5817f2689c834afe4fdd1b3daf694`, #23 `e5cc3532d633009f0e4665bd13927f0f9a996534` : ouvertes, mergeables et vertes avant la présente mise à jour. Accès push/admin confirmé. Aucun changement distant inattendu, aucun écrivain concurrent annoncé.

Branche dossiers toujours `46321485d1d28351da7e0b555411199f40fa801a`. Les trois commits `420357d2b0f7375c2121f9d62551607ef0cb561e`, `c5a87663cb3cd38815a661dcb89073034235ae55`, `46321485d1d28351da7e0b555411199f40fa801a` doivent rester dans l'historique, sans réécriture ni duplication. L3 est maintenant autorisé selon B3a–B3c, après intégration et qualification du socle. CONTRACT reste une opération distincte non autorisée.

## Protocole d'intégration

Ordre approuvé : #20 → #21 → #22 → #23. Merge commits, pas de squash/rebase. Après chaque merge : lire mergedAt/SHA/main et les checks push sur main ; actualiser la branche suivante par une fusion de main avec deux parents, sans force, puis revoir son diff complet contre la nouvelle base et attendre ses checks. En cas de conflit, diagnostic et résolution ciblée, tests et nouveau checkpoint avant merge. Après #23, requalifier tous les contrôles ensemble et les cas New/null via HTTP.

GitHub fait foi. Publication par API avec parent attendu, ref non forcée et relecture des SHA/messages/fichiers/blobs ; clone ordinaire pour diffs/tests. Ne jamais pousser le miroir bare de l'audit. Les sources normatives privées, le checkpoint historique L0–L2, le backlog et review-log restent à lire à toute reprise. Le présent fichier remplace le statut PRET_A_PASSER précédent ; le checkpoint-l0-l2.md est la photographie de la livraison avant validation.

## Tests et limites inchangées

L2 natif CI : 126 unitaires backend, 10 garde-fous, 36 PostgreSQL/HTTP, quatre parcours Chromium ; frontend 109 tests. L1 création 139 backend/110 frontend, sécurité 124 backend + compatibilité NYC/109 frontend ; les nombres de branches indépendantes ne s'additionnent pas. Cinq audits relancés à zéro le 19 octobre. Ces résultats ne prouvent pas encore leur combinaison.

PostgreSQL/Docker et navigateur non exécutés localement dans Work ; preuves natives dans Actions avec PostgreSQL 16 jetable, Node 24. Pas de base propriétaire, seed/reset réel, VM, DNS/Nginx/firewall/certificat, déploiement, restauration ou image finale qualifiée. La nouvelle contrainte TOP_UP requiert une prévalidation avant toute application réelle autorisée ; la reprise de métadonnées Prisma après échec migrate deploy réel reste à qualifier en OPS. Avertissement pg tracé dans l'adaptateur Prisma, non filtré, requalification avant pg 9.

Les nouveaux checks requis ne sont pas activés par l'approbation des merges/L3. D1–D8 ne sont pas fermées. Un transfert WORK ↔ CHAT_CLASSIQUE nécessite arrêt de l'ancien écrivain, désignation explicite par Alex et comparaison des références ; en cas de divergence préserver, diagnostiquer, jamais forcer.

Git : checkpoint à publier puis merges autorisés avec CI. VM : aucune intervention. SQL : uniquement bases CI jetables. Infra : aucun changement de production.


## Checkpoint intégration #20 et actualisation #21

PR #20 effectivement mergée le 19 octobre à 07:09:14Z, main 75fea4888cd2644fb633832c6393d631b6290b93, Backend/Frontend Quality success sur ce main. #21 actualisée par merge commit 85e23e471445abd2f595bd1bbea233527f7b2650, parents e925cbbe99e2ff3b93d26e32c3d41509726fb0a3 et 75fea4888cd2644fb633832c6393d631b6290b93. Les 13 fichiers intégrés depuis main sont uniquement le pilotage ; le diff applicatif complet de neuf fichiers est strictement identique au diff revu avant validation. Pas de conflit ni de migration. CI de #21 à attendre avant merge, puis CI de main. Aucun changement VPS/SQL propriétaire.
