# Handoff canonique Barbook

```yaml
checkpoint_utc: "2026-10-16T14:12:14.282966+00:00"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "EN_COURS"
feature: "L2 — tests PostgreSQL/HTTP publiés ; corrections de la première CI en cours"
branch: "test/critical-integration-flows"
base_branch: "main"
remote_head_sha: "9e63d94adcfe0c7a6cdbcd0871d0c5129013f388"
local_head_sha: "9e63d94adcfe0c7a6cdbcd0871d0c5129013f388"
worktree: "propre sur la branche sécurité ; mise à jour de checkpoint sur docs/project-pilotage"
pr: "#20 pilotage, #21 création, #22 sécurité : ouvertes, checks observés success ; aucun merge"
tests: "L1 CI verte ; L2 local 124 unitaires + 10 sécurité/lint/build/Prisma/tsc passés ; CI migrations/drift verts, tests natifs 32 passés/3 échoués ; navigateur non exécuté"
migrations: "3 migrations de main appliquées uniquement sur PostgreSQL CI jetable, run 38913055230, service détruit ; état base propriétaire/VPS inconnu"
changes_pushed: "pilotage d3bf513 et 874ccbe ; correctif e925cbb ; sécurité ab756e6, SHA complets ci-dessous"
unpushed_changes: "aucun applicatif ; mise à jour du présent journal sur sa branche de pilotage"
decisions_validated: "L0–L2 ; suspension dossiers ; choix techniques ordinaires documentés ; aucun merge/production"
decisions_pending: "D1–D8 ; reprise L3 après checkpoint L2"
next_atomic_step: "corriger la course Ingredient par reprise bornée de transaction, ajouter CHECK garniture via migration additive, corriger la fixture ; tests et push puis revue entière"
risks_and_blockers: "CI L2 rouge : 32 succès/3 échecs natifs ; aucune PR L2 autorisée tant que corrigée et entièrement revue ; PostgreSQL local indisponible"
production_effect: "aucun"
```

## Branches et références de reprise

- Main vérifié : `3f9dfdbd3115380960296db3c7025715d48db55c` ; aucun merge effectué.
- Pilotage canonique : `docs/project-pilotage`, [PR #20](https://github.com/Alexdmt0110/Barbook/pull/20). Lire le SHA courant de cette branche : le présent fichier ne peut pas contenir le SHA du commit qui le porte.
- Correctif création : `fix/cocktail-creation-boundaries`, commit `e925cbbe99e2ff3b93d26e32c3d41509726fb0a3`, 9 fichiers (règles/service/DTO backend et tests, contrat/test frontend, guide de création). Aucun changement non poussé sur cette branche.
- Sécurité : `hardening/dependency-security`, [PR #22](https://github.com/Alexdmt0110/Barbook/pull/22), commit `ab756e690ee5817f2689c834afe4fdd1b3daf694`, 8 fichiers : manifestes/locks frontend/backend, workflow d’audit, test de compatibilité, guide et relevé. Audits à zéro ; CI complète verte.
- L2 : `test/critical-integration-flows`, commit `9e63d94adcfe0c7a6cdbcd0871d0c5129013f388`, 16 fichiers, aucune PR. Run [38913055230](https://github.com/Alexdmt0110/Barbook/actions/runs/38913055230) en échec, corrections prévues dans review-log.md.
- Dossiers : `feature/cocktail-folder-management` à `46321485d1d28351da7e0b555411199f40fa801a`, SUSPENDUE_POUR_REMEDIATION_DU_SOCLE. Commits `420357d2b0f7375c2121f9d62551607ef0cb561e`, `c5a87663cb3cd38815a661dcb89073034235ae55`, `46321485d1d28351da7e0b555411199f40fa801a` intacts.

## Environnement et limites

Accès GitHub réel rétabli : compte Alexdmt0110, création branche, objets commit, publication non forcée et relecture des refs réussies. Clone de travail ordinaire ; publication via API Git avec parent attendu. Le clone bare miroir de l'audit reste réservé à la lecture : aucun push miroir.

Node 24.19.0/npm 11.9.0, npm ci réussi frontend/backend. Les vérifications applicatives ci-dessus sont locales et réelles. Aucun PostgreSQL ni navigateur de l'application testé à ce stade. La compilation produit backend/dist/src/main.js ; le script start:prod cible actuellement dist/main : vérifier ce défaut de démarrage dans L2 avant toute qualification déployable.

## Protocole de reprise

Lire les consignes privées fournies et ce journal, vérifier branches/commits/PR/CI et changements locaux avant d'écrire. Un seul responsable par branche/tranche ; la demande d'Alex reprend ici WORK, sans relais concurrent annoncé. Pour un transfert Work ↔ Chat classique, arrêter l'écrivain précédent, synchroniser, puis faire confirmer la passation par Alex. Toute divergence : diagnostic, sans force push ni duplication de commits.

L0 → L1 → L2 uniquement. Les branches indépendantes partent de main tant que leurs merges ne sont pas validés. Après les merges autorisés, requalifier l'ensemble sur main ; ne pas recopier des correctifs entre branches. Après L2, présenter checkpoint et stratégie L3, sans commencer L3. D1–D8 restent ouvertes pour les phases concernées.

Git : 4 branches nouvelles publiées, PR #20/#21/#22 ouvertes et vertes, L2 sans PR en correction CI, aucun merge. VM : aucune intervention. SQL : 3 migrations uniquement sur CI jetable ; aucun seed/reset/base propriétaire/VPS. Infra : aucun changement de production.
