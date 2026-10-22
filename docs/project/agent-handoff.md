# Handoff canonique Barbook — L5 Design Review bloquée avant code

```yaml
checkpoint_utc: "2026-10-22T09:29:23+00:00"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "BLOQUE"
feature: "L5 B5a–B5f autorisé, D5 validée ; Design Review transversale L5-COMPAT-01"
branch: "feature/recipe-lifecycle-contracts"
base_branch: "main"
base_sha: "94552a94a51fdb8e9ae9a0aa4b41e47ce0906894"
remote_head_sha: "94552a94a51fdb8e9ae9a0aa4b41e47ce0906894"
local_head_sha: "94552a94a51fdb8e9ae9a0aa4b41e47ce0906894"
worktree: "documentsD5/design/suivi avant leur propre publication ; aucun modèle/code"
pr: "aucune ; #31 MERGEE ; pas de PR L5 avant arbitrage"
tests: "main94552a9 sixchecks success recontrôlés ; validationdocumentaire locale ; aucune CI/testapplicatif L5 revendiqué"
migrations: "aucune créée/appliquée ; plan additif limité aux bases testjetables"
changes_pushed: "branche publiée immédiatement au merge94552a9 ; ce handoff précède sa propre publication"
unpushed_changes: "l5-design.md,checkpoint-l5.md,decisions.md,roadmap.md,backlog.md/json,review-log.md,agent-handoff.md"
decisions_validated: "D1/D2, D5 explicite et périmètreL5personnel B5a–B5f le22octobre2026"
decisions_pending: "L5-COMPAT-01 : anciennes routes sans précondition après suppression/restauration ; B recommandée/A/C à arbitrer"
next_atomic_step: "attendre Alex avant tout modèle/code ; puis reprendreDesign/B5a selon décision explicite"
risks_and_blockers: "ancienne et nouvelle intention sans version indiscernables ; compatibilité comportementale complète incompatible avec invalidation exigée"
production_effect: "aucun"
```

Photographie avant sa publication ; SHA de branche réel surGitHub fait foi, aucune auto-référence inventée. Le propriétaire a autorisé le développementL5 conditionnel à une DesignReview sans incompatibilité importante ; celle-ci en a trouvé une et impose donc cet arrêt. D5 est validée, pas une question à rouvrir.

[Design transversal](l5-design.md) contient inventaire des consommateurs et routes historiques, contrats envisagés, alternatives et motifs, versions distinctes, ABVbrut/inconnu/override0, lienslegacy et compteurs, migrationtestseulement/réversibilité limitée, matrice10critères et B5a–f. [Décisions](decisions.md) et [checkpoint](checkpoint-l5.md). Aucun modèle, API, testapplicatif, workflow ou migration modifié ; aucune fonctionnalitéL5 annoncée livrée.

Main réellement94552a9 (#31 mergée, parents0f63272/659f7bc, mergedAt09:03:02UTC, arbre f2912e6), sixchecks verts au lancement. Ancienworktree barbook-folders conserve df6c890/indexidentiquef5a9132 déjà intégré ; pas de reset/stash/force et aucun fichier écrasé. Nouveauworktree barbook-l5 sur branche adaptée, sans concurrenceL4 ni anciennefeature reprise. Aucune PR ouverte initialement,18refs historiques conservées et nouvellebranche publiée.

OptionB recommandée : garder tous les chemins legacy, ajouter une précondition adaptée et refuser409sans effet les anciennes commandes sans précondition sur toutes les écritures de classement ; Angular actualisé de façon coordonnée. Incompatibilité à approuver explicitement avant code. OptionA : limiter ce refus aux recettes passées par la corbeille ; laisse les anciens risques de remplacement sans version sur les autres recettes et exige une exception explicite à la protection concurrente générale. OptionC : relâcher exigence d'invalidation aprèsrestauration, non recommandée. Un simple verrou/deletedAt/CSRF/générationUI ne distingue pas deux intentionsHTTP identiques ; ne pas coder cette fausse protection.

Validation des documents/JSON66IDs (sixfichesL5,60autres inchangées), liens/fences et diffcheck, puis commit/push atomique et checkpointdistant. Aucun test applicatif/PG/HTTP/Chromium L5 ni nouvelleCI passée revendiqués ; aucun BLOCKER/P1applicatif prétendu résolu. Pas de PR tant que cette incompatibilité n'est pas arbitrée. À la reprise : lire réponsesAlex, refs/main/branche/PR/handoff actuels puis compléterDesign avant code.

Git : documents sur branche publiés, pas demergeautorisé. VMaucun ; SQLaucuneaction ; Infraaucun. Pas de purgephysique/donnéesréelles, basepersonnelle/production, CONTRACT, déploiement, L6–L8, coûtouserviceexterne. Ne pas continuer en arrière-plan après cette session.
