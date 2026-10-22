# Handoff canonique Barbook — L4 B4e/B4f

```yaml
checkpoint_utc: "2026-10-22T06:33:38Z"
source_of_truth: "https://github.com/Alexdmt0110/Barbook"
phase: "B"
work_owner: "WORK"
handoff_status: "EN_COURS"
feature: "L4 B4e développé ; B4f qualification globale en cours"
branch: "feature/global-session-revocation"
base_branch: "main"
base_sha: "de86dd0e11c938e202c038e9049876af651a0ccb"
remote_head_sha: "f5a913279854fb9d4f5d2eeff55d99401ecb9ad1"
local_head_sha: "f5a913279854fb9d4f5d2eeff55d99401ecb9ad1"
worktree: "propre avant ce checkpoint documentaire"
pr: "#29 MERGED ; aucune PR B4e ouverte"
tests: "local backend238/23suites, frontend191/27fichiers, lint/build/Prisma/tsc/E2E types/10garde-fous/compatibilités passés ; dernier code à qualifier sur Actions"
migrations: "sept historiques sur CI jetables uniquement ; aucune nouvelle/personnelle/production"
changes_pushed: "1667810,7a10fb4,acbd2e8,4522bea,df6c890,f5a9132"
unpushed_changes: "ce seul handoff avant sa propre publication"
decisions_validated: "développement B4e puis B4f autorisé ; WORK seul ; D1/D2 inchangées"
decisions_pending: "chaque nouveau merge exige accord Alex ; aucun déploiement/infra/CONTRACT/L5"
next_atomic_step: "observer six checks du checkpoint documentaire contenant f5a9132, lire les logs natifs/browser ; corriger puis refaire Review Gate entier et matrice18critères"
risks_and_blockers: "dernier BFCache/global23natifs et nouveaux parcours browser non encore exécutés ; qualification B4f non close"
production_effect: "aucun"
```

Photographie précédant sa propre publication : lire refs/HEAD/CI GitHub, pas de SHA auto-référentiel inventé.

## Dernière étape sûre

#29 intégrée avec accord explicite, mergedAt2026-10-21T13:15:45Z ; merge de86dd0 parents0c4a558/7d79500, arbre6db7ad7 identique à la PR revue, main et six checks post-merge réellement vérifiés (232backend/175frontend/118PG-HTTP/4Chromium). Branches historiques conservées. Main toujours de86dd0 à la reprise22octobre. Aucun autre merge autorisé.

B4e backend7a10fb4 : POST logout-all après mot de passe, contexte/CSRF/origine, User→Session ReadCommitted, état courant et hash revérifiés après attente, révocation atomique sans renouvellement/Set-Cookie. Client4522bea : purge volontaire annoncée dès confirmation, password éphémère, retry global explicite sans fallback local, génération et notification ciblée par empreinte de session. Réseau inconnu ne vaut pas succès.

Revue globale L4-16 : design préventifdf6c890 puis fixf5a9132. Masque synchrone pagehide, revalidation fraîche pageshow/retour visible sans heartbeat, même contexte garde le formulaire/lease, révocation purge, expiry/réseau suspend et garde le draft. Résultat ancien ne peut déconnecter B ou remplacer un logout plus récent. Chromium indépendant doit prouver BFCache réel, masque au pageshow,401 puis purge.23nouveaux natifs préparés dont rollback après UPDATE, attaques et ordres réels de verrous ; cleanup limité aux acteurs du spec.

## Tests et CI

Locaux sur f5a9132 : backend verify238, Prisma valide/build/lint, tsc et6tests réauth detectOpenHandles sans handle signalé ; frontend191/19127fichiers, lint/build/compatCLI ; E2E tsc,10garde-fous fixtures. Des délais historiques frontend5s ont échoué sous charge puis suite191/191 passée sans assouplissement ; voir checkpoint-l4.md. PG et Chromium non installés localement, aucune prétention de preuve native locale.

Reprise22octobre : les runs39610794943/39610794729/39610794574 de acbd2e8 sont success. Leurs logs sont à rapprocher de ce SHA (backend B4e mais avant client/BFCache), pas de f5a9132. Les pushes Git Data antérieurs n'avaient pas encore émis de runs lors des lectures ; un vrai checkpoint via API Contents a déclenché ces runs. Republier ce handoff via Contents pour observer les six contrôles du code actuel sans changer CI/jobs/permissions ni ouvrir une PR de contournement.

## Suite autorisée

Après six checks réels du code actuel et corrections éventuelles : relecture de toute main...branche sur tous axes, matrice18critères avec preuves/limites, mise à jour maintenance/roadmap/backlog66fiches (F001/F002/F003/F051 seulement), Review Gate complet puis vraie PR ; relire diff/HEAD/base/commits/discussions/mergeabilité/CI. Chaque correctionP1 impose revue entière renouvelée. Ne pas merger cette future PR sans accord explicite Alex. Conserver toutes les branches.

Limites : appareil offline/dormant non effaçable à distance avant constat serveur ; preuve de révocation peut disparaître après prune ; storage totalement refusé empêche effacement garanti ; requête déjà autorisée peut finir et n'est pas annulée rétroactivement. Pas de Safari/iOS/TLS/proxy/backup/restore/rollback propriétaire qualifiés ; aucun sélecteur workspace partagé, édition/corbeille L5, CONTRACT ou production.

Git : branche/push seulement ; VM aucun ; SQL aucune nouvelle/personnelle/production ; Infra aucun changement, triggers exacts de branche seuls. Sources privées dans project_sources lues, non copiées au dépôt.
