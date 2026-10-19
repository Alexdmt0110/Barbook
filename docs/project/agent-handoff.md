# Handoff canonique Barbook

```yaml
checkpoint_utc: "2026-10-19T07:02:16.494753+00:00"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "AUCUN"
handoff_status: "PRET_A_PASSER"
feature: "L0–L2 développés et proposés en PR ; EN_ATTENTE_VALIDATION des merges et de L3"
branch: "test/critical-integration-flows"
base_branch: "main"
remote_head_sha: "e5cc3532d633009f0e4665bd13927f0f9a996534"
local_head_sha: "e5cc3532d633009f0e4665bd13927f0f9a996534"
worktree: "code propre ; checkpoint documentaire publié puis synchronisé avant arrêt"
pr: "#20/#21/#22/#23 ouvertes ; contrôles applicables verts ; aucun merge"
tests: "voir commandes/environnements ci-dessous ; L2 126 unitaires, 10 garde-fous, 36 PostgreSQL/HTTP et 4 Chromium verts ; frontend 109 tests ; audits relancés zéro le 19 octobre"
migrations: "4 migrations uniquement sur PostgreSQL 16 CI jetable ; aucune base propriétaire/VPS touchée ; état réel inconnu"
changes_pushed: "L0 sur docs/project-pilotage ; L1 e925cbb et ab756e6 ; L2 cinq commits jusqu'à e5cc353, détails ci-dessous"
unpushed_changes: "aucune modification applicative ; journal et backlog de ce checkpoint à relire sur la ref distante courante"
decisions_validated: "phase A comme base ; L0–L2 ; choix techniques ordinaires ; suspension de la branche dossiers"
decisions_pending: "merges et actualisation des branches ; nouveaux checks requis ; autorisation L3 ; D1–D8 toujours ouvertes ; aucune production autorisée"
next_atomic_step: "attendre validation du propriétaire sur les PR/merges et le plan L3 ; aucune nouvelle écriture applicative avant cet accord"
risks_and_blockers: "branches indépendantes non combinées ; données/VPS inconnus ; prévalidation migration réelle et qualification OPS requises ; pas de BLOCKER/P1 restant identifié dans le diff L2"
production_effect: "aucun"
```

## Point de reprise sûr

Lire [checkpoint-l0-l2.md](checkpoint-l0-l2.md) pour les résultats, limites et la proposition B3a–B3d ; [review-log.md](review-log.md) pour les revues préventives, échecs réellement observés, corrections et Review Gates. La phase A historique et ses 66 fiches restent la base, sans autorisation générale.

| Référence distante | SHA vérifié | État au 19 octobre |
| --- | --- | --- |
| main | `3f9dfdbd3115380960296db3c7025715d48db55c` | inchangé, aucun merge exécuté |
| docs/project-pilotage | lire la ref courante ; un fichier ne peut contenir son propre SHA de commit | [PR #20](https://github.com/Alexdmt0110/Barbook/pull/20), pilotage canonique et Quality verts |
| fix/cocktail-creation-boundaries | `e925cbbe99e2ff3b93d26e32c3d41509726fb0a3` | [PR #21](https://github.com/Alexdmt0110/Barbook/pull/21), Quality verts |
| hardening/dependency-security | `ab756e690ee5817f2689c834afe4fdd1b3daf694` | [PR #22](https://github.com/Alexdmt0110/Barbook/pull/22), Quality et audits verts |
| test/critical-integration-flows | `e5cc3532d633009f0e4665bd13927f0f9a996534` | [PR #23](https://github.com/Alexdmt0110/Barbook/pull/23), Quality/PostgreSQL/Browser verts |
| feature/cocktail-folder-management | `46321485d1d28351da7e0b555411199f40fa801a` | SUSPENDUE_POUR_REMEDIATION_DU_SOCLE, trois commits intacts |

Branche dossiers : `420357d2b0f7375c2121f9d62551607ef0cb561e` (ADR), `c5a87663cb3cd38815a661dcb89073034235ae55` (EXPAND), `46321485d1d28351da7e0b555411199f40fa801a` (dual-write). Aucun rebase, suppression ou duplication autorisé.

Commits L2 publiés, vérifiés et présents dans la vraie PR :

1. `9e63d94adcfe0c7a6cdbcd0871d0c5129013f388` — PostgreSQL et contrats HTTP.
2. `bae6a3cb6622db221ca1e13bbc7dcc981ba2675f` — course Ingredient et CHECK garniture.
3. `688aeacbdbc0de57183408f24d0f9431eb3ce31b` — parcours navigateur et workflow.
4. `634dc3d96776a0e4e08881033c6d515b8e49d91e` — sélection visuelle du dossier et attente returnUrl correcte.
5. `e5cc3532d633009f0e4665bd13927f0f9a996534` — sélecteur de navigation accessible non ambigu.

## Commandes et preuves réelles

Local, Node 24.19.0/npm 11.9.0 : backend `npm run verify`, `npm run test:integration:safety`, `npx tsc --noEmit --incremental false` ; frontend `npm run verify` ; E2E `npm ci`, `npm run typecheck`, `npm run audit:security`, `npm run test:list` avec les variables de fixture. Résultats L2 : 126 unitaires backend et 10 garde-fous, 109 tests frontend, lint/build/Prisma/types verts, quatre essais détectés. Les vérifications antérieures des branches L1 figurent dans le checkpoint détaillé ; leurs comptes de tests diffèrent car elles partent du même main et ne sont pas combinées.

CI, Node 24/PostgreSQL 16 jetable : `npm ci`, `npm run verify`, garde-fous/tsc, `npm run test:integration:prepare`, `npm run test:e2e`, démarrage compilé et `/api`. Second job : installations frontend/backend/E2E, typage/audit, build/préparation DB, `npx playwright install --with-deps chromium`, `npm test` dans e2e. Migrations fraîches/réappliquées/statut/drift verts, 3 suites/36 tests réels PostgreSQL/HTTP, quatre parcours Chromium desktop/mobile verts.

Runs vérifiés avec head exact : [avant PR 38917878420](https://github.com/Alexdmt0110/Barbook/actions/runs/38917878420), [PR Integration 39212891892](https://github.com/Alexdmt0110/Barbook/actions/runs/39212891892), [PR Quality 39212891925](https://github.com/Alexdmt0110/Barbook/actions/runs/39212891925). La vraie PR #23 comporte 27 fichiers ; leurs blobs ont tous été comparés aux fichiers relus/testés (incluant le blob de base du fichier supprimé), cinq commits, aucune discussion/review bloquante observée.

Le 19 octobre, `npm run audit:security` dans backend/frontend de la branche #22 (complet puis omit=dev) et dans le paquet E2E de #23 a donné cinq résultats zéro. Aucun avis ignoré. Cela ne qualifie pas encore l'image finale ou la combinaison des branches.

Non exécutés : PostgreSQL et navigateur locaux dans Work, Safari/iOS/Firefox/appareil physique, qualification exhaustive d'accessibilité, base propriétaire/VPS, sauvegarde/restauration et déploiement/rollback de production. Aucun test absent n'est annoncé passé.

## Échecs corrigés et limites actuelles

Le premier run natif 38913055230 avait 32 succès/3 échecs : course Ingredient (fausse erreur 409), absence de CHECK garniture TOP_UP et fixture de rollback trop longue. Corrections réelles, puis 36 natifs verts. Les premiers parcours navigateur ont confirmé un décalage DOM de sélection ; deux assertions DOM ont échoué avant correction puis passé. Les autres échecs étaient des attentes de test incorrectes (returnUrl et lien de navigation ambigu), corrigées en conservant les assertions métier. Aucun retry, skip ou contrôle désactivé.

L'empaquetage produit désormais `dist/main.js`, conforme à `start:prod`, sans embarquer fixtures/seed dans le serveur compilé. Les reprises de transaction sont bornées à trois tentatives au total ; les ABV individuels 40/47 restent préservés. Le défaut de sélection ne signifie pas que la gestion multi-dossiers L3 est achevée.

Les correctifs New/null sont exclusivement dans #21 ; inventorier tout slug historique `new` d'une base existante avant usage. La migration additive `20261016141503_garnish_unit_integrity` a été appliquée uniquement aux services CI jetables. Elle refuse les garnitures historiques TOP_UP sans les corriger ; inventorier/réconcilier explicitement avant toute application réelle autorisée. Les tests SQL de rollback/retry ne valident pas la récupération des métadonnées d'un migrate deploy échoué sur une base réelle.

La dépréciation pg a été tracée dans PgTransaction de @prisma/adapter-pg et l'interpréteur Prisma ; aucun filtre. Requalifier avant pg 9. Les P1 préexistants de mise en production et les autres dettes de l'audit ne sont pas déclarés fermés.

## Reprise et autorisations

Accès propriétaire push/admin relu le 19 octobre ; branche/commit/push avaient été prouvés après autorisation de phase B, nouvelle PR publiée à la reprise. Publication par API Git avec parent attendu et sans force, puis relecture du SHA/message/fichiers/empreintes. Le transport Git CLI ne dispose pas d'identifiants ; le miroir bare de l'audit reste réservé à la lecture, jamais de push miroir.

Un seul écrivain. WORK s'arrête à ce checkpoint ; aucun outil ne doit poursuivre les écritures applicatives après la fin de réponse. Un passage à CHAT_CLASSIQUE exige qu'Alex désigne le nouveau responsable après arrêt de WORK. Avant toute écriture : lire les sources normatives privées, ce journal et GitHub ; comparer refs, commits, PR, CI, migrations et travail local. Toute divergence : préserver et diagnostiquer, pas de force push ni copie de commits.

Pour une reprise en lecture :

```sh
git fetch origin
git status --short
git show origin/docs/project-pilotage:docs/project/agent-handoff.md
```

Prochaine action unique : validation du propriétaire des PR/merges et de la stratégie L3 décrite dans checkpoint-l0-l2.md. Après accord de merges, actualiser/revoir/requalifier chaque branche, puis l'ensemble intégré, dont New/null par HTTP. Proposer séparément les nouveaux checks requis. L3 attend son autorisation ; après intégration du socle, conserver ses trois commits, tester les deux ordres d'upgrade EXPAND/contrainte et traiter la fenêtre des anciens écrivains avant bascule. CONTRACT, production, décisions D1–D8 et coûts restent hors autorisation implicite.

Git : toutes les modifications utiles publiées et contrôlées ; PR #20–#23 ouvertes, aucun merge. VM : aucune intervention. SQL : uniquement CI jetable ; aucun reset/seed/migration propriétaire/VPS. Infra : workflows CI seulement, aucun changement serveur.
