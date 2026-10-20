# Handoff canonique Barbook

```yaml
checkpoint_utc: "2026-10-20T09:53:03.672243Z"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "EN_COURS"
feature: "L4 autorisé ; B4a contrats et préparation du store Session"
branch: "feature/secure-web-sessions"
base_branch: "main"
remote_head_sha: "c99b08052e2e1494f621c7de8a7fb0831516bd1e"
local_head_sha: "c99b08052e2e1494f621c7de8a7fb0831516bd1e"
worktree: "pilotage L4 et trois déclencheurs push exacts de branche avant publication ; aucun code applicatif"
pr: "aucune ouverte ; #25 mergée le 20 octobre à 08:53:33 UTC"
tests: "main c99b080 six checks success ; nouvelle branche : vérifications documentaires, CI à observer après publication"
migrations: "aucune créée/appliquée L4 ; six historiques CI seulement ; aucune DB propriétaire"
changes_pushed: "branche L4 publiée depuis main c99b080 ; #20–#25 intégrées"
unpushed_changes: "ce bloc de conception/pilotage uniquement avant son commit/push"
decisions_validated: "D1a/D1b/D2a/D2b/D2c et six blocs L4 le 20 octobre ; merges #20–#25 seulement"
decisions_pending: "chaque merge L4 ; D3–D8 sauf garde-fous existants ; L5/CONTRACT/production non autorisés"
next_atomic_step: "vérifier publication/CI du design puis B4a : schéma et store Session additifs avec tests unitaires/PostgreSQL réels"
risks_and_blockers: "JWT encore actif avant B4b ; aucun parcours cookie/CSRF/draft prétendu opérationnel ; pas de PostgreSQL/Chromium local détecté"
production_effect: "aucun"
```

Cette photographie précède sa publication et ne peut porter son propre SHA. Lire la ref de la branche puis l'historique : le prochain commit documentaire décrit ce bloc ; ne pas le reproduire. Contrôler parent/arbre/message/fichiers/blobs et CI réellement terminée avant code. Le handoff ne constitue pas un verrou technique.

## Reprise vérifiée et périmètre

Alex autorise L4 uniquement et WORK reprend cette tranche dans cette conversation ; aucun autre écrivain annoncé. D1 : bêta privée à admission serveur ; édition et corbeille en V1 mais L5 exclu et D5/rétention non tranchée. D2 : sessions opaques PostgreSQL, cookie HttpOnly/Secure production, CSRF/expiration/révocation/fixation ; standard2h inactive/12h absolues et option non précochée7j/30j ; brouillons mémoire + sessionStorage24h, restauration explicite isolée, purge volontaire/changement de compte, pas de secret/replay/écrasement récent. [Design L4](l4-design.md), [décisions](decisions.md), [ADR0005](../adr/0005-revocable-web-sessions.md).

GitHub interrogé directement le20octobre : main c99b080, PR#25 documentaire bien mergée/huit fichiers, six checks success, aucune PR ouverte. Branches dossiers95e21bc et docs/l3-merge-checkpoint39fd730 conservées ; aucune réécriture. Le snapshot de main indiquant encore #25 en attente a été reconnu obsolète ; pas de duplication. Accès réel pull/push=true. Publication via API Git avec parent attendu et comparaison de l'arbre entier à l'index, puis vérification distante et fast-forward du clone. Pas de CLI Git authentifiée ni push forcé.

## Prochain travail et tests

B4a prépare SessionService et migration additive ; pas encore de changement de login/guard/frontend. Tests natifs de stockage haché, bornes/activité, révocation/rejeu/global, ordre transactionnel, FK/CHECK/purge et upgrade. Les six contrôles de branche sont activés par déclencheurs exacts sans modifier les jobs. Node24.19/npm11.9 présents, backend npm ci passé (853paquets ; warnings de dépréciation glob/ESLint existants, pas de mise à jour aveugle). PostgreSQL/Docker/Chromium non détectés ; preuves natives/navigateur attendues en CI jetable. Ne pas annoncer ces futurs tests verts par anticipation.

La suite autorisée est B4b→B4c→B4d→B4e→B4f selon le design, avec micro-commits verts et push immédiat. Chaque PR est soumise à Alex avant merge. Arrêt sur divergence distante, secret, migration destructive/personnelle ou décision métier hors périmètre ; aucune désactivation de check. Pas de L5, CONTRACT, nouvelle infrastructure, déploiement ni coût tiers. Les sources privées restent hors Git public, hashes identiques à leur lecture antérieure ; prompt Reprise et handoff relus.

## Git / VM / SQL / Infra et passation

Git : branche dédiée publiée ; conception en cours de publication, aucune PR/merge L4. VM : aucune. SQL : aucun L4 ; migrations historiques uniquement en CI jetable. Infra : aucun changement ; ruleset inchangé (seulement Backend/Frontend Quality requis, quatre contrôles supplémentaires observés).

Un seul responsable actif par branche. À toute reprise : lire les sources et ce journal, comparer main/branche/commits/PR/checks/travail local ; ne pas refaire l'audit ou les commits déjà poussés. Work↔Chat classique exige l'arrêt de l'écrivain précédent et transfert explicite du propriétaire. Avant fin de session : état testé/commité/poussé, checkpoint et PRET_A_PASSER ; aucun travail ne continue hors session. En cas d'interruption brutale, GitHub fait foi, reconstruire sans force-push ni reset destructif.
