# Handoff canonique Barbook

```yaml
checkpoint_utc: "2026-10-19T08:43:44.739540+00:00"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "EN_COURS"
feature: "L3 B3a–B3c développé et qualifié — Review Gate favorable à une PR"
branch: "feature/cocktail-folder-management"
base_branch: "main"
remote_head_sha: "b0bb7574e373a2876b93cf67abf22f671ae7fca3"
local_head_sha: "b0bb7574e373a2876b93cf67abf22f671ae7fca3"
worktree: "code propre ; consolidation documentaire décrite ci-dessous à publier"
pr: "#20–#23 mergées ; aucune PR L3 encore ouverte"
tests: "verify backend 151+NYC, frontend 131,10 garde-fous ;61 natifs et 4 Chromium réels en CI ; lint/build/Prisma/tsc verts ; audits zéro"
migrations: "6 migrations en CI jetable seulement ; aucune base propriétaire/VPS migrée ; CONTRACT absent"
changes_pushed: "trois commits initiaux, merge69e54dc et blocs L3 jusqu’à b0bb757 ; SHA/message/blobs/arbre vérifiés"
unpushed_changes: "consolidation docs/project et maintenance/ADR seulement, contenu du présent checkpoint"
decisions_validated: "merges #20–#23 et développement L3 B3a–B3c ; WORK seul pendant cette exécution"
decisions_pending: "merge L3 ; checks supplémentaires requis ; L4 et D1–D8 ; CONTRACT et toute production"
next_atomic_step: "publier les docs, vérifier la CI puis ouvrir et relire la vraie PR L3 sans la merger"
risks_and_blockers: "aucun BLOCKER/P1 du diff identifié ; bascule/Prisma recovery/backup/restore réels non qualifiés ; limites legacy et A015/A016 documentées"
production_effect: "aucun"
```

Les champs SHA sont la photographie réellement vérifiée avant publication de ce checkpoint ; un document ne peut contenir son propre hash. Résoudre la ref GitHub courante et comparer les commits documentaires suivants au code qualifié ci-dessous, au lieu de supposer un état à partir du seul YAML. Le handoff n'est pas un verrou technique.

## État et preuves

Main : `c0fc5fd3facd42c112673bbfc47285ba4547259b`, #20–#23 mergées dans l'ordre autorisé et six checks verts. [Checkpoint L3](checkpoint-l3.md) : SHA des quatre merges, résultats combinés et périmètre B3a–B3c. Les anciens checkpoints L0–L2 sont des photographies antérieures, pas des états courants.

Branche dossiers conservée, jamais supprimée/rebasée/réécrite :420357d2b0f7375c2121f9d62551607ef0cb561e, c5a87663cb3cd38815a661dcb89073034235ae55,46321485d1d28351da7e0b555411199f40fa801a sont ancêtres. Main intégré par merge69e54dc614a7c7241f58fe55370c5f877eab560e ; l'EXPAND partagé est inchangé.

Blocs publiés : ba84b0f pilotage/CI/design ; e5852e8 données/versions ;0c6f2df contrats/concurrence ;48c3e3b gestion dossiers ;078475d retrait des anciennes copies DTO ; c20e02f éditeur multi ;439bd60 pages/parcours ; b0bb757 qualification plafond de 100/clavier/captures. Les SHA complets sont dans GitHub et les preuves intermédiaires dans review-log.md. Aucun fichier applicatif non poussé à cette photographie.

Code qualifié : `b0bb7574e373a2876b93cf67abf22f671ae7fca3`, six checks success. Runs39223198122 Integration,39223198121 CI,39223198101 Dependency Security.151 tests backend/18 suites +1 compatibilité NYC,131 frontend/21 fichiers,10 garde-fous,61 natifs/5 suites et 4 Chromium. Six migrations fresh/redeploy/status/drift et smoke dist/main.js verts. Audits complets/production backend/frontend et e2e : zéro, aucun package/lock modifié par L3.

Tests locaux réellement exécutés : `npm --prefix backend run verify`, lint/tsc backend, `npm --prefix frontend run verify`, typage e2e, Prisma generate/validate et diff check. PostgreSQL/Chromium ne sont pas exécutables dans ce Work local : seuls les jobs CI jetables constituent leurs preuves. Pas de Safari/appareil physique/lecteur d'écran/zoom 200 % ou benchmark de charge prétendu.

Captures b0bb757, artefact 12172691949 du run39223198122 : récupérées et inspectées sur desktop/mobile, index/vide, classement et détail. Thèmes clair/contrasté stabilisés et sombres inspectés ; les transitions étaient en cours sur les premières captures du header, sans bug produit déduit. Rétention GitHub 7 jours, aucune capture privée ni secret.

## Compatibilité, données et portée

folders[] et organizationVersion sont la référence du nouveau frontend. Le nouveau serveur garde folder nullable et l'ancien payload pour zéro/un dossier ; plusieurs liens avec vieux payload → 409 sans perte. Les commandes locales sont idempotentes et préservent tags/recettes/autres liens. Verrou de workspace partagé et versions avant mutation. Contrats, limites1000/100/20 et erreurs dans [folder-management.md](../maintenance/folder-management.md).

L'EXPAND historique et la nouvelle migration20261019073922_folder_organization_versions ajoutent seulement liens/versions ; aucune ancienne migration modifiée et aucune colonne retirée. Ambiguïtés legacy refusées sans effacement, à réconcilier sur décision des données concernées avant une migration réelle autorisée. Tous les anciens binaires incompatibles doivent cesser d'écrire avant une bascule multi réelle. Récupération Prisma après échec, rollback de backend ancien, images, staging et sauvegarde/restauration restent non qualifiés.

Git : publication API avec parent attendu, aucun force ; relecture ref/message/fichiers/blobs et comparaison de l'arbre entier à l'index avant publication. Un clone ordinaire sert aux tests/diffs ; ne jamais pousser le miroir bare. VM/SQL/OPS : aucune intervention propriétaire, aucun seed/reset ou déploiement ; services CI jetables uniquement. Ruleset public 22294305 lu : PR et deux Quality requis, strict ; inchangé. Lecture administrative branch-protection 403 avec cette intégration, écritures de contenu prouvées ; nouveaux checks requis à décider séparément.

## Reprise et arrêt

Lire les cinq sources normatives privées du projet ChatGPT, puis le dépôt, main, la branche, PR/checks et ce checkpoint ; elles ne sont pas recopiées publiquement. Le catalogue garde 66 fiches et D1–D8 ouvertes. [Review Gate](reviews/l3-review-gate.md) favorable à une PR après relecture entière ; la vraie PR reste à contrôler.

Le prochain acte reste dans le périmètre L3 : finir la publication documentaire, ouvrir/relire la PR et publier son état. Aucun merge L3 n'est autorisé. Après décision explicite de merge, vérifier head/base/discussions/checks, actualiser sans réécriture si nécessaire et reprendre tout le gate/CI ; vérifier main après merge. L4 nécessite son propre cadrage D1/D2 et son autorisation. CONTRACT/production demandent leurs accords distincts.

Un seul écrivain. Work écrit encore ce checkpoint ; aucun relais n'est annoncé à cet instant. À l'arrêt, publier PRET_A_PASSER et confirmer l'absence de tâche d'écriture. Chat classique peut inspecter, mais doit obtenir confirmation de l'arrêt de Work et de la transition avant de modifier cette branche. Au retour, Work reçoit la confirmation d'arrêt de Chat classique et vérifie les refs/PR/CI avant reprise ; ne jamais forcer une divergence. Tous les éléments inconnus restent décrits comme tels, GitHub fait foi.
