# Handoff canonique Barbook

```yaml
checkpoint_utc: "2026-10-16"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "EN_COURS"
feature: "L0/L1 en PR ; L2 PostgreSQL vert, qualification navigateur en CI"
branch: "test/critical-integration-flows"
base_branch: "main"
remote_head_sha: "688aeacbdbc0de57183408f24d0f9431eb3ce31b"
local_head_sha: "688aeacbdbc0de57183408f24d0f9431eb3ce31b"
worktree: "L2 propre ; checkpoint documentaire sur docs/project-pilotage"
pr: "#20 pilotage, #21 création, #22 sécurité ouvertes ; L2 sans PR avant Review Gate complet"
tests: "L1 vert ; L2 126 unitaires + 10 garde-fous + 36 tests PostgreSQL/HTTP natifs verts au commit bae6a3c ; navigateur typé, 4 essais détectés, audit zéro, exécution en cours"
migrations: "4 migrations appliquées/réappliquées/status/drift verts uniquement sur PostgreSQL CI jetable ; aucune base propriétaire/VPS touchée"
changes_pushed: "L0/L1 et trois commits L2 ; SHA complets et preuves ci-dessous"
unpushed_changes: "aucun applicatif ; seul ce checkpoint documentaire en préparation"
decisions_validated: "L0–L2 et décisions techniques ordinaires dans ce périmètre ; aucun merge/production"
decisions_pending: "D1–D8 ; merges ; reprise L3 après checkpoint final L2"
next_atomic_step: "lire le run navigateur 38916754084, corriger tout échec puis reprendre la revue entière contre main avant PR L2"
risks_and_blockers: "résultat navigateur encore inconnu ; PostgreSQL et navigateur non exécutés localement ; ensemble des branches non mergé/non qualifié ensemble"
production_effect: "aucun"
```

## Références exactes

| Branche | SHA applicatif / preuve | État |
| --- | --- | --- |
| main | `3f9dfdbd3115380960296db3c7025715d48db55c` | inchangé, aucun merge effectué |
| docs/project-pilotage | lire la ref distante ; ce fichier ne peut contenir son propre SHA | [PR #20](https://github.com/Alexdmt0110/Barbook/pull/20), journal canonique |
| fix/cocktail-creation-boundaries | `e925cbbe99e2ff3b93d26e32c3d41509726fb0a3` | [PR #21](https://github.com/Alexdmt0110/Barbook/pull/21), CI verte |
| hardening/dependency-security | `ab756e690ee5817f2689c834afe4fdd1b3daf694` | [PR #22](https://github.com/Alexdmt0110/Barbook/pull/22), CI et audits verts |
| test/critical-integration-flows | `688aeacbdbc0de57183408f24d0f9431eb3ce31b` | CI navigateur en cours, aucune PR |
| feature/cocktail-folder-management | `46321485d1d28351da7e0b555411199f40fa801a` | SUSPENDUE_POUR_REMEDIATION_DU_SOCLE, intacte |

Les trois commits dossiers préservés sont `420357d2b0f7375c2121f9d62551607ef0cb561e`, `c5a87663cb3cd38815a661dcb89073034235ae55`, `46321485d1d28351da7e0b555411199f40fa801a`. Ne pas les réécrire, dupliquer ou supprimer.

## Preuves déjà obtenues et prochain contrôle

L1 création : backend 18 suites/139 tests, frontend 17 fichiers/110 tests, lint/build/Prisma verts. Régression reproduite avant correction. Aucun changement de migration. Les éventuels anciens slugs `new` d'une base réelle restent à inventorier.

L1 sécurité : backend 124 tests et compatibilité NYC, frontend 109 tests, lint/build et quatre audits complets/production à zéro le 16 octobre 2026. Aucun avis ignoré ou contrôle désactivé. Les PR indépendantes sont basées sur le même main ; ces nombres ne s'additionnent pas en une exécution combinée.

L2 initial `9e63d94adcfe0c7a6cdbcd0871d0c5129013f388`, run [38913055230](https://github.com/Alexdmt0110/Barbook/actions/runs/38913055230) : migrations vertes, 32 tests natifs passés/3 échoués. Deux anomalies confirmées et une fixture invalide corrigées dans `bae6a3cb6622db221ca1e13bbc7dcc981ba2675f` : reprise bornée des courses Ingredient, CHECK garniture TOP_UP, marqueur de test raccourci sans réduire les assertions.

Run correctif [38914620367](https://github.com/Alexdmt0110/Barbook/actions/runs/38914620367) entièrement vert : 126 unitaires, 10 garde-fous, 3 suites/36 tests réels PostgreSQL/HTTP, quatre migrations fraîches et seconde application sans migration restante, statut à jour, aucun drift, démarrage compilé `dist/main.js` et `/api` vérifiés. Le défaut initial d'empaquetage `dist/src/main.js` est corrigé par la limitation du build aux sources serveur.

Le commit navigateur `688aeacbdbc0de57183408f24d0f9431eb3ce31b` est publié et ses huit blobs distants vérifiés. Installation reproductible, typage, audit zéro et détection des quatre essais réussis localement. Run [38916754084](https://github.com/Alexdmt0110/Barbook/actions/runs/38916754084) en cours : ne pas annoncer les parcours navigateur opérationnels avant lecture des résultats. La CI doit aussi tracer l'origine de la dépréciation pg observée ; ne pas la supprimer sans diagnostic.

## Environnement, migrations et périmètre

Accès rétabli avec le compte propriétaire Alexdmt0110 : branche/commit/publication non forcée réels puis relecture des SHA, messages et empreintes des blobs. Le transport Git CLI ne dispose pas d'identifiants ; utiliser les API Git avec parent attendu, puis fetch et synchronisation locale en avance rapide. Le miroir bare de l'audit reste en lecture seule, jamais de push miroir.

Local : Node 24.19.0/npm 11.9.0. Pas de PostgreSQL/Docker utilisable ni de preuve navigateur locale ; les exécutions natives sont celles de GitHub Actions (Node 24, PostgreSQL 16 jetable). Aucun accès VM, seed/reset de propriétaire ou déploiement. Les bases réelles, sauvegardes et images de production ne sont pas qualifiées.

La nouvelle migration additive `20261016141503_garnish_unit_integrity` n'altère aucune ligne : elle refuse les données historiques TOP_UP invalides et ajoute un CHECK conforme à l'API. Prévalidation et éventuelle réconciliation à décider avant toute application autorisée sur une base réelle. Les migrations antérieures sont inchangées. Les deux ordres d'upgrade avec l'EXPAND dossiers restent à qualifier en L3 sans renommer l'ancienne migration.

## Protocole Work ↔ Chat classique

Un seul écrivain actif par tranche/branche. Pour reprendre : lire les sources normatives privées, ce journal, roadmap, décisions et review-log ; vérifier refs, commits, PR, CI, worktrees et éventuels changements locaux. Si transfert vers Chat classique, arrêter WORK puis annoncer le nouveau responsable avec Alex et publier le checkpoint du nouveau détenteur. Aucun travail concurrent annoncé ici. Toute divergence exige un diagnostic ; jamais de force push ou copie de commits pour la masquer.

Les merges et la production ne sont pas autorisés. Après merges explicitement approuvés de L0/L1/L2, requalifier leur combinaison sur main. Puis présenter la reprise L3, sans commencer les dossiers avant autorisation. D1–D8 restent ouvertes pour les phases concernées. Les nouveaux checks d'intégration et d'audit ne sont pas encore ajoutés au ruleset obligatoire de main : proposer leur activation après validation des workflows.
